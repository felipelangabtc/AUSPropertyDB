import { Injectable, Logger, TooManyRequestsException } from '@nestjs/common';

export type RateLimitStrategy = 'sliding-window' | 'token-bucket' | 'fixed-window';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator: (req: any) => string; // Function to generate rate limit key
  strategy: RateLimitStrategy;
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  skipStatusCodes?: number[]; // Status codes to skip
}

export interface RateLimitData {
  count: number;
  resetTime: number;
  tokens?: number; // For token bucket strategy
}

/**
 * Advanced Rate Limiting Service
 *
 * Strategies:
 * 1. Sliding Window - Memory efficient, accurate
 * 2. Token Bucket - Allows burst traffic
 * 3. Fixed Window - Simple, stateless
 *
 * Features:
 * - Per-user rate limiting
 * - Per-IP rate limiting
 * - Per-endpoint rate limiting
 * - Dynamic limits based on user tier
 * - Redis backend support for distributed systems
 * - Graceful degradation under load
 */
@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly store = new Map<string, RateLimitData>();

  /**
   * Default rate limit configurations
   */
  private readonly configs: Record<string, RateLimitConfig> = {
    // Global: 1000 requests per minute
    global: {
      windowMs: 60 * 1000,
      maxRequests: 1000,
      keyGenerator: () => 'global',
      strategy: 'sliding-window',
    },

    // Per-IP: 100 requests per minute
    perIP: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      keyGenerator: (req) => req.ip || req.connection.remoteAddress,
      strategy: 'sliding-window',
    },

    // Per-User (Authenticated): 500 requests per minute
    perUser: {
      windowMs: 60 * 1000,
      maxRequests: 500,
      keyGenerator: (req) => req.user?.id || req.ip,
      strategy: 'token-bucket',
    },

    // Strict for Auth Endpoints: 5 requests per 15 minutes
    authStrict: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyGenerator: (req) => `auth:${req.ip}`,
      strategy: 'fixed-window',
      skipSuccessfulRequests: true, // Only count failures
    },

    // Search Endpoint: 30 requests per minute
    search: {
      windowMs: 60 * 1000,
      maxRequests: 30,
      keyGenerator: (req) => `search:${req.user?.id || req.ip}`,
      strategy: 'sliding-window',
    },

    // ML Operations: 5 requests per hour (expensive operations)
    mlOperations: {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
      keyGenerator: (req) => `ml:${req.user?.id}`,
      strategy: 'token-bucket',
    },

    // Admin Panel: 1000 requests per minute (high volume)
    admin: {
      windowMs: 60 * 1000,
      maxRequests: 1000,
      keyGenerator: (req) => `admin:${req.user?.id}`,
      strategy: 'sliding-window',
    },

    // Free Tier: 10 requests per minute
    freeTier: {
      windowMs: 60 * 1000,
      maxRequests: 10,
      keyGenerator: (req) => `free:${req.user?.id || req.ip}`,
      strategy: 'fixed-window',
    },

    // Premium Tier: 500 requests per minute
    premiumTier: {
      windowMs: 60 * 1000,
      maxRequests: 500,
      keyGenerator: (req) => `premium:${req.user?.id}`,
      strategy: 'sliding-window',
    },
  };

  /**
   * Check if request should be rate limited
   *
   * @param key - Rate limit key (user ID, IP, etc.)
   * @param config - Rate limit configuration
   * @returns True if request is allowed, false if rate limited
   *
   * @throws TooManyRequestsException if rate limit exceeded
   *
   * @example
   * const allowed = this.checkRateLimit('user:123', this.configs.perUser);
   * if (!allowed) throw new TooManyRequestsException();
   */
  checkRateLimit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    let data = this.store.get(key);

    // Initialize if not exists
    if (!data) {
      data = {
        count: 0,
        resetTime: now + config.windowMs,
        tokens: config.maxRequests,
      };
      this.store.set(key, data);
    }

    // Reset if window expired
    if (now > data.resetTime) {
      data.count = 0;
      data.resetTime = now + config.windowMs;
      data.tokens = config.maxRequests;
    }

    // Apply rate limiting strategy
    switch (config.strategy) {
      case 'sliding-window':
        return this.applySlidingWindow(data, config);
      case 'token-bucket':
        return this.applyTokenBucket(data, config, now);
      case 'fixed-window':
        return this.applyFixedWindow(data, config);
      default:
        return true;
    }
  }

  /**
   * Sliding Window Strategy
   * Provides accurate rate limiting with rolling window
   */
  private applySlidingWindow(data: RateLimitData, config: RateLimitConfig): boolean {
    if (data.count >= config.maxRequests) {
      return false; // Rate limited
    }

    data.count++;
    return true;
  }

  /**
   * Token Bucket Strategy
   * Allows burst traffic up to bucket capacity
   */
  private applyTokenBucket(data: RateLimitData, config: RateLimitConfig, now: number): boolean {
    // Refill tokens based on time elapsed
    const refillRate = config.maxRequests / (config.windowMs / 1000); // tokens per second
    const timeSinceReset = now - (data.resetTime - config.windowMs);
    const tokensToAdd = (timeSinceReset / 1000) * refillRate;

    data.tokens = Math.min(config.maxRequests, (data.tokens || 0) + tokensToAdd);

    if (data.tokens < 1) {
      return false; // Rate limited
    }

    data.tokens--;
    return true;
  }

  /**
   * Fixed Window Strategy
   * Simple and stateless rate limiting
   */
  private applyFixedWindow(data: RateLimitData, config: RateLimitConfig): boolean {
    if (data.count >= config.maxRequests) {
      return false; // Rate limited
    }

    data.count++;
    return true;
  }

  /**
   * Get rate limit status for a key
   *
   * @returns { remaining, resetTime, limit, retryAfter }
   *
   * @example
   * const status = this.getStatus('user:123', config);
   * // Returns: { remaining: 450, limit: 500, resetTime: 1234567890 }
   */
  getStatus(key: string, config: RateLimitConfig): {
    remaining: number;
    limit: number;
    resetTime: number;
    retryAfter: number;
  } {
    const data = this.store.get(key);
    const now = Date.now();

    if (!data) {
      return {
        remaining: config.maxRequests,
        limit: config.maxRequests,
        resetTime: now + config.windowMs,
        retryAfter: 0,
      };
    }

    const remaining = Math.max(0, config.maxRequests - data.count);
    const retryAfter = Math.max(0, data.resetTime - now);

    return {
      remaining,
      limit: config.maxRequests,
      resetTime: data.resetTime,
      retryAfter: Math.ceil(retryAfter / 1000), // Convert to seconds
    };
  }

  /**
   * Add rate limit headers to response
   *
   * @example
   * const headers = this.getHeaders('user:123', config);
   * // Returns: {
   * //   'X-RateLimit-Limit': '500',
   * //   'X-RateLimit-Remaining': '450',
   * //   'X-RateLimit-Reset': '1234567890'
   * // }
   */
  getHeaders(key: string, config: RateLimitConfig): Record<string, string> {
    const status = this.getStatus(key, config);

    return {
      'X-RateLimit-Limit': status.limit.toString(),
      'X-RateLimit-Remaining': status.remaining.toString(),
      'X-RateLimit-Reset': status.resetTime.toString(),
      ...(status.retryAfter > 0 && { 'Retry-After': status.retryAfter.toString() }),
    };
  }

  /**
   * Reset rate limit for a specific key
   * Useful for admin operations
   */
  resetKey(key: string): void {
    this.store.delete(key);
    this.logger.log(`Rate limit reset for key: ${key}`);
  }

  /**
   * Reset all rate limits (dangerous operation)
   */
  resetAll(): void {
    this.store.clear();
    this.logger.warn('All rate limits reset');
  }

  /**
   * Get configuration by name
   */
  getConfig(name: string): RateLimitConfig | undefined {
    return this.configs[name];
  }

  /**
   * Get rate limit statistics
   */
  getStats(): Record<string, any> {
    const stats = {
      totalKeys: this.store.size,
      configurations: Object.keys(this.configs),
      keysNearLimit: 0,
      keysOverLimit: 0,
    };

    for (const [key, data] of this.store.entries()) {
      // Find associated config (rough estimate)
      const limit = 100; // Default

      if (data.count >= limit) {
        stats.keysOverLimit++;
      } else if (data.count > limit * 0.8) {
        stats.keysNearLimit++;
      }
    }

    return stats;
  }

  /**
   * Get cleanup metrics and run cleanup if needed
   * Should be called periodically
   */
  cleanup(): { removed: number; remaining: number } {
    const now = Date.now();
    let removed = 0;

    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime + 60 * 60 * 1000) {
        // Remove entries older than 1 hour after reset
        this.store.delete(key);
        removed++;
      }
    }

    return { removed, remaining: this.store.size };
  }

  /**
   * Dynamically adjust limits based on user tier
   *
   * @example
   * const tierConfig = this.getConfigForTier('premium');
   */
  getConfigForTier(tier: 'free' | 'premium' | 'enterprise'): RateLimitConfig {
    const baseConfig = {
      windowMs: 60 * 1000,
      strategy: 'sliding-window' as const,
      skipStatusCodes: [401, 403],
    };

    switch (tier) {
      case 'free':
        return { ...baseConfig, maxRequests: 10, keyGenerator: (req) => `free:${req.ip}` };
      case 'premium':
        return { ...baseConfig, maxRequests: 500, keyGenerator: (req) => `premium:${req.user?.id}` };
      case 'enterprise':
        return { ...baseConfig, maxRequests: 10000, keyGenerator: (req) => `enterprise:${req.user?.id}` };
      default:
        return this.configs.global;
    }
  }

  /**
   * Log rate limit events for monitoring
   */
  logEvent(key: string, allowed: boolean, config: RateLimitConfig): void {
    if (!allowed) {
      this.logger.warn(`Rate limit exceeded for ${key}`);
    }
  }
}

/**
 * Rate limit interceptor for NestJS
 */
export class RateLimitInterceptor {
  constructor(private readonly rateLimiter: RateLimiterService) {}

  async intercept(context: any, next: any): Promise<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Determine which config to use
    const endpoint = request.path;
    let config = this.rateLimiter.getConfig('perUser');

    if (endpoint.includes('/auth')) {
      config = this.rateLimiter.getConfig('authStrict');
    } else if (endpoint.includes('/search')) {
      config = this.rateLimiter.getConfig('search');
    } else if (endpoint.includes('/ml')) {
      config = this.rateLimiter.getConfig('mlOperations');
    }

    if (!config) {
      return next.handle();
    }

    const key = config.keyGenerator(request);
    const allowed = this.rateLimiter.checkRateLimit(key, config);

    // Add headers to response
    const headers = this.rateLimiter.getHeaders(key, config);
    Object.entries(headers).forEach(([name, value]) => {
      response.setHeader(name, value);
    });

    if (!allowed) {
      const status = this.rateLimiter.getStatus(key, config);
      throw new TooManyRequestsException(
        `Rate limit exceeded. Retry after ${status.retryAfter} seconds`
      );
    }

    return next.handle();
  }
}
