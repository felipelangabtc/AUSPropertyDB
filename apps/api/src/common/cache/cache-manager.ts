import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { RedisClient } from 'redis';

/**
 * Cache Layer Configuration
 */
export interface CacheLayerConfig {
  l1: {
    maxSize: number; // Maximum items in memory cache
    ttl: number; // Time to live in ms
  };
  l2: {
    host: string;
    port: number;
    ttl: number; // Time to live in seconds
    maxConnections: number;
  };
  l3: {
    enabled: boolean; // Whether to use database as L3
  };
}

/**
 * Cache Key Builder
 * Generates consistent cache keys
 */
export class CacheKeyBuilder {
  /**
   * Property cache key
   */
  static property(propertyId: string): string {
    return `property:${propertyId}`;
  }

  /**
   * Property list cache key
   */
  static propertyList(filters: Record<string, any>, page: number, limit: number): string {
    const filterStr = JSON.stringify(filters);
    const hash = this.hashString(filterStr);
    return `properties:list:${hash}:${page}:${limit}`;
  }

  /**
   * Price history cache key
   */
  static priceHistory(propertyId: string, days: number = 365): string {
    return `price:history:${propertyId}:${days}d`;
  }

  /**
   * Search results cache key
   */
  static searchResults(query: string, userId: string, page: number): string {
    const queryHash = this.hashString(query);
    return `search:${userId}:${queryHash}:${page}`;
  }

  /**
   * User alerts cache key
   */
  static userAlerts(userId: string): string {
    return `alerts:${userId}`;
  }

  /**
   * Listings cache key
   */
  static listings(propertyId: string): string {
    return `listings:${propertyId}`;
  }

  /**
   * Aggregate data cache key
   */
  static aggregateData(type: string, filters: Record<string, any>): string {
    const filterStr = JSON.stringify(filters);
    const hash = this.hashString(filterStr);
    return `aggregate:${type}:${hash}`;
  }

  /**
   * Hash a string for consistent key generation
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Cache invalidation strategy
 */
export interface CacheInvalidation {
  trigger: 'CREATE' | 'UPDATE' | 'DELETE';
  patterns: string[];
}

/**
 * Cache invalidation rules
 */
export const CACHE_INVALIDATION_RULES: Record<string, CacheInvalidation[]> = {
  // When property is created/updated
  property: [
    {
      trigger: 'UPDATE',
      patterns: ['property:*', 'properties:list:*', 'price:history:*'],
    },
    {
      trigger: 'DELETE',
      patterns: ['property:*', 'properties:list:*', 'listings:*'],
    },
  ],

  // When price changes
  price_history: [
    {
      trigger: 'CREATE',
      patterns: ['price:history:*', 'aggregate:price:*'],
    },
  ],

  // When listing added
  listing: [
    {
      trigger: 'CREATE',
      patterns: ['listings:*', 'properties:list:*'],
    },
  ],

  // When user preferences change
  user: [
    {
      trigger: 'UPDATE',
      patterns: ['alerts:*', 'search:*'],
    },
  ],
};

/**
 * TTL Configuration by resource type
 */
export const CACHE_TTL_CONFIG = {
  // Short-lived data
  search_results: 300, // 5 minutes
  user_preferences: 600, // 10 minutes
  listings: 3600, // 1 hour

  // Medium-lived data
  property_details: 3600, // 1 hour
  price_history_short: 3600, // 1 hour (last 30 days)
  user_alerts: 1800, // 30 minutes

  // Long-lived data
  price_history_long: 86400, // 1 day (1+ year ago)
  aggregate_data: 3600, // 1 hour
  static_data: 86400, // 1 day (suburbs, states)

  // Hot data (frequently accessed)
  trending_properties: 300, // 5 minutes
  popular_suburbs: 600, // 10 minutes
  top_listings: 900, // 15 minutes

  // Database backup cache
  db_backup: 3600, // 1 hour

  // Never cached (or very short)
  user_profile: 300, // 5 minutes
  authentication: 3600, // 1 hour
};

/**
 * Multi-layer cache manager
 */
@Injectable()
export class MultiLayerCacheManager {
  private readonly logger = new Logger(MultiLayerCacheManager.name);

  // L1: In-memory cache
  private l1Cache = new Map<string, { value: any; expiry: number }>();

  constructor(
    private l2Cache: Cache, // Redis via cache-manager
    private l3Cache?: any // Prisma for database
  ) {}

  /**
   * Get value from cache layers
   * Tries L1 → L2 → L3 in sequence
   */
  async get<T>(key: string, options?: { fromLayer?: 1 | 2 | 3 }): Promise<T | null> {
    const fromLayer = options?.fromLayer || 1;

    // Try L1 (Memory)
    if (fromLayer <= 1) {
      const cached = this.l1Cache.get(key);

      if (cached && cached.expiry > Date.now()) {
        this.logger.debug(`Cache hit (L1): ${key}`);
        return cached.value as T;
      }

      // Clean up expired entry
      if (cached && cached.expiry <= Date.now()) {
        this.l1Cache.delete(key);
      }
    }

    // Try L2 (Redis)
    if (fromLayer <= 2) {
      try {
        const cached = await this.l2Cache.get<T>(key);

        if (cached) {
          this.logger.debug(`Cache hit (L2): ${key}`);
          // Promote to L1
          await this.setL1(key, cached);
          return cached;
        }
      } catch (error) {
        this.logger.error(`L2 cache error: ${error}`);
      }
    }

    // Try L3 (Database)
    if (fromLayer <= 3 && this.l3Cache) {
      try {
        const cached = await this.l3Cache.getCachedData(key);

        if (cached) {
          this.logger.debug(`Cache hit (L3): ${key}`);
          // Promote to L1 and L2
          await this.set(key, cached);
          return cached;
        }
      } catch (error) {
        this.logger.error(`L3 cache error: ${error}`);
      }
    }

    return null;
  }

  /**
   * Set value in all cache layers
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const finalTtl = ttl || CACHE_TTL_CONFIG.property_details;

    // Set in L1
    await this.setL1(key, value, finalTtl);

    // Set in L2
    try {
      await this.l2Cache.set(key, value, finalTtl * 1000);
    } catch (error) {
      this.logger.error(`Failed to set L2 cache: ${error}`);
    }

    // Set in L3
    if (this.l3Cache) {
      try {
        await this.l3Cache.setCachedData(key, value, finalTtl);
      } catch (error) {
        this.logger.error(`Failed to set L3 cache: ${error}`);
      }
    }
  }

  /**
   * Set value in L1 only
   */
  private async setL1<T>(key: string, value: T, ttl?: number): Promise<void> {
    const finalTtl = ttl || CACHE_TTL_CONFIG.property_details;
    const expiry = Date.now() + finalTtl * 1000;

    this.l1Cache.set(key, { value, expiry });
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    // Invalidate L1 (simple pattern matching)
    for (const [key] of this.l1Cache) {
      if (this.matchPattern(key, pattern)) {
        this.l1Cache.delete(key);
      }
    }

    // Invalidate L2 (Redis)
    if (this.l2Cache) {
      try {
        const keys = await this.l2Cache.store.getKeys();
        const matching = keys.filter((k: string) => this.matchPattern(k, pattern));

        for (const key of matching) {
          await this.l2Cache.del(key);
        }
      } catch (error) {
        this.logger.error(`Failed to invalidate L2 cache: ${error}`);
      }
    }

    // Invalidate L3 (Database)
    if (this.l3Cache) {
      try {
        await this.l3Cache.invalidateCachedData(pattern);
      } catch (error) {
        this.logger.error(`Failed to invalidate L3 cache: ${error}`);
      }
    }
  }

  /**
   * Pattern matching helper
   * Supports wildcards: * for any characters
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

    return regex.test(key);
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.clear();

    // Clear L2
    try {
      await this.l2Cache.reset();
    } catch (error) {
      this.logger.error(`Failed to clear L2 cache: ${error}`);
    }

    // Clear L3
    if (this.l3Cache) {
      try {
        await this.l3Cache.clearCache();
      } catch (error) {
        this.logger.error(`Failed to clear L3 cache: ${error}`);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    l1: { size: number; items: number };
    l2?: { size?: number };
    l3?: { size?: number };
  } {
    return {
      l1: {
        size: this.l1Cache.size,
        items: Array.from(this.l1Cache.values()).length,
      },
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(data: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    this.logger.log(`Warming up cache with ${data.length} entries`);

    for (const { key, value, ttl } of data) {
      try {
        await this.set(key, value, ttl);
      } catch (error) {
        this.logger.error(`Failed to warm cache for ${key}: ${error}`);
      }
    }
  }
}

/**
 * Cache warming strategy for hot data
 */
export const CACHE_WARMING_STRATEGIES = {
  /**
   * Load trending properties on startup
   */
  trendingProperties: {
    query: 'SELECT id, name, price FROM properties ORDER BY view_count DESC LIMIT 100',
    ttl: 300,
    refreshInterval: 300000, // Refresh every 5 minutes
  },

  /**
   * Load popular suburbs
   */
  popularSuburbs: {
    query:
      'SELECT suburb, COUNT(*) as count FROM properties GROUP BY suburb ORDER BY count DESC LIMIT 20',
    ttl: 600,
    refreshInterval: 3600000, // Refresh every hour
  },

  /**
   * Load user preferences
   */
  userPreferences: {
    query: 'SELECT user_id, preferences FROM users WHERE is_active = true',
    ttl: 1800,
    refreshInterval: 1800000, // Refresh every 30 minutes
  },

  /**
   * Load price statistics
   */
  priceStatistics: {
    query:
      'SELECT suburb, AVG(price) as avg_price, MIN(price), MAX(price) FROM properties GROUP BY suburb',
    ttl: 3600,
    refreshInterval: 3600000, // Refresh every hour
  },
};
