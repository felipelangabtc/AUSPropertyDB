import { CacheKeyBuilder, CACHE_TTL_CONFIG } from './cache-manager';

/**
 * Cache decorator for methods
 * Automatically caches method results
 */
export function Cacheable(keyBuilder: (args: any[]) => string, ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyBuilder(args);
      const cacheManager = this.cacheManager;

      if (!cacheManager) {
        return originalMethod.apply(this, args);
      }

      // Try to get from cache
      const cached = await cacheManager.get(key);

      if (cached !== null) {
        return cached;
      }

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Cache result
      if (result !== null && result !== undefined) {
        await cacheManager.set(key, result, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 */
export function CacheInvalidate(patterns: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = this.cacheManager;

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Invalidate cache patterns
      if (cacheManager) {
        for (const pattern of patterns) {
          await cacheManager.invalidate(pattern);
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache preset configurations
 */
export const CACHE_PRESETS = {
  /**
   * Property listing cache
   */
  propertyListing: {
    key: (filters: Record<string, any>, page: number) =>
      CacheKeyBuilder.propertyList(filters, page, 20),
    ttl: CACHE_TTL_CONFIG.property_details,
    invalidateOn: ['property:UPDATE', 'property:DELETE'],
  },

  /**
   * Property detail cache
   */
  propertyDetail: {
    key: (propertyId: string) => CacheKeyBuilder.property(propertyId),
    ttl: CACHE_TTL_CONFIG.property_details,
    invalidateOn: ['property:UPDATE', 'property:DELETE'],
  },

  /**
   * Price history cache
   */
  priceHistory: {
    key: (propertyId: string) => CacheKeyBuilder.priceHistory(propertyId),
    ttl: CACHE_TTL_CONFIG.price_history_long,
    invalidateOn: ['price_history:CREATE'],
  },

  /**
   * Search results cache
   */
  searchResults: {
    key: (query: string, userId: string, page: number) =>
      CacheKeyBuilder.searchResults(query, userId, page),
    ttl: CACHE_TTL_CONFIG.search_results,
    invalidateOn: [],
  },

  /**
   * User alerts cache
   */
  userAlerts: {
    key: (userId: string) => CacheKeyBuilder.userAlerts(userId),
    ttl: CACHE_TTL_CONFIG.user_alerts,
    invalidateOn: ['user:UPDATE'],
  },

  /**
   * Listings cache
   */
  listings: {
    key: (propertyId: string) => CacheKeyBuilder.listings(propertyId),
    ttl: CACHE_TTL_CONFIG.listings,
    invalidateOn: ['listing:CREATE', 'listing:UPDATE'],
  },

  /**
   * Aggregate data cache
   */
  aggregateData: {
    key: (type: string, filters: Record<string, any>) =>
      CacheKeyBuilder.aggregateData(type, filters),
    ttl: CACHE_TTL_CONFIG.aggregate_data,
    invalidateOn: ['property:UPDATE', 'price_history:CREATE'],
  },
};

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  /**
   * Warm cache with trending properties
   */
  static async warmTrendingProperties(cacheManager: any, db: any): Promise<void> {
    const trending = await db.properties.findMany({
      select: { id: true, name: true, price: true },
      orderBy: { viewCount: 'desc' },
      take: 100,
    });

    const data = trending.map((p: any, idx: number) => ({
      key: `trending:${idx}`,
      value: p,
      ttl: CACHE_TTL_CONFIG.trending_properties,
    }));

    await cacheManager.warmUp(data);
  }

  /**
   * Warm cache with popular suburbs
   */
  static async warmPopularSuburbs(cacheManager: any, db: any): Promise<void> {
    const suburbs = await db.$queryRaw`
      SELECT suburb, COUNT(*) as count
      FROM properties
      GROUP BY suburb
      ORDER BY count DESC
      LIMIT 20
    `;

    const data = (suburbs as any[]).map((s: any) => ({
      key: CacheKeyBuilder.aggregateData('suburbs', { limit: 20 }),
      value: s,
      ttl: CACHE_TTL_CONFIG.popular_suburbs,
    }));

    await cacheManager.warmUp(data);
  }

  /**
   * Warm cache with price statistics
   */
  static async warmPriceStatistics(cacheManager: any, db: any): Promise<void> {
    const stats = await db.$queryRaw`
      SELECT
        suburb,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM properties
      GROUP BY suburb
    `;

    const data = (stats as any[]).map((s: any) => ({
      key: CacheKeyBuilder.aggregateData('price-stats', { suburb: s.suburb }),
      value: s,
      ttl: CACHE_TTL_CONFIG.aggregate_data,
    }));

    await cacheManager.warmUp(data);
  }
}

/**
 * Cache invalidation helper
 */
export class CacheInvalidator {
  /**
   * Invalidate all related caches for a property update
   */
  static async invalidatePropertyUpdate(cacheManager: any, propertyId: string): Promise<void> {
    await Promise.all([
      cacheManager.invalidate(`property:${propertyId}`),
      cacheManager.invalidate('properties:list:*'),
      cacheManager.invalidate(`price:history:${propertyId}:*`),
      cacheManager.invalidate('aggregate:price:*'),
    ]);
  }

  /**
   * Invalidate all related caches for a property deletion
   */
  static async invalidatePropertyDelete(cacheManager: any, propertyId: string): Promise<void> {
    await Promise.all([
      cacheManager.invalidate(`property:${propertyId}`),
      cacheManager.invalidate('properties:list:*'),
      cacheManager.invalidate(`listings:${propertyId}`),
      cacheManager.invalidate('aggregate:*'),
    ]);
  }

  /**
   * Invalidate search related caches
   */
  static async invalidateSearch(cacheManager: any): Promise<void> {
    await cacheManager.invalidate('search:*');
    await cacheManager.invalidate('properties:list:*');
  }

  /**
   * Invalidate user related caches
   */
  static async invalidateUser(cacheManager: any, userId: string): Promise<void> {
    await cacheManager.invalidate(`alerts:${userId}`);
    await cacheManager.invalidate(`search:${userId}:*`);
  }

  /**
   * Invalidate all caches
   */
  static async invalidateAll(cacheManager: any): Promise<void> {
    await cacheManager.clear();
  }
}
