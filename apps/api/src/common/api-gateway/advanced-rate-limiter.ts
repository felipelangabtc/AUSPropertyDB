import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RateLimitRule {
  id: string;
  name: string;
  pattern: string;
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';
  capacity: number;
  refillRate: number;
  window?: number;
  perIP?: boolean;
  perUser?: boolean;
  perEndpoint?: boolean;
  priority?: number;
  whitelist?: string[];
  blacklist?: string[];
}

export interface RateLimitContext {
  ip: string;
  userId?: string;
  endpoint: string;
  method: string;
  timestamp: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class AdvancedRateLimiterService {
  private readonly logger = new Logger(AdvancedRateLimiterService.name);
  private rules: Map<string, RateLimitRule> = new Map();
  private buckets: Map<string, Map<string, TokenBucket>> = new Map();
  private windowCounts: Map<string, Map<string, Array<number>>> = new Map();

  // Default rules
  private defaultRules: RateLimitRule[] = [
    {
      id: 'global-api',
      name: 'Global API Rate Limit',
      pattern: '/api/.*',
      strategy: 'token-bucket',
      capacity: 10000,
      refillRate: 100, // 100 tokens/sec = 10k/min
      perIP: true,
      priority: 1,
    },
    {
      id: 'auth-endpoints',
      name: 'Auth Endpoints',
      pattern: '/api/auth/(login|register)',
      strategy: 'fixed-window',
      capacity: 5,
      window: 60, // 5 attempts per minute
      refillRate: 1 / 60,
      perIP: true,
      priority: 10,
    },
    {
      id: 'search-endpoints',
      name: 'Search Rate Limit',
      pattern: '/api/properties/search',
      strategy: 'token-bucket',
      capacity: 100,
      refillRate: 10,
      perUser: true,
      priority: 5,
    },
    {
      id: 'export-endpoints',
      name: 'Export Limit',
      pattern: '/api/.*/export',
      strategy: 'fixed-window',
      capacity: 10,
      window: 3600, // 10 exports per hour
      refillRate: 10 / 3600,
      perUser: true,
      priority: 8,
    },
    {
      id: 'public-endpoints',
      name: 'Public Endpoints',
      pattern: '/api/public/.*',
      strategy: 'token-bucket',
      capacity: 1000,
      refillRate: 50,
      perIP: true,
      priority: 2,
    },
    {
      id: 'admin-endpoints',
      name: 'Admin Endpoints',
      pattern: '/api/admin/.*',
      strategy: 'token-bucket',
      capacity: 50000,
      refillRate: 500,
      perUser: true,
      priority: 20,
      whitelist: ['admin', 'superadmin'],
    },
  ];

  constructor(private configService: ConfigService) {
    this.initializeRules();
  }

  /**
   * Initialize default rules
   */
  private initializeRules(): void {
    this.defaultRules.forEach((rule) => {
      this.rules.set(rule.id, rule);
      this.buckets.set(rule.id, new Map());
      this.windowCounts.set(rule.id, new Map());
    });
    this.logger.log(`Initialized ${this.defaultRules.length} rate limit rules`);
  }

  /**
   * Check if request is rate limited
   */
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitStatus> {
    const matchedRule = this.findMatchingRule(context);

    if (!matchedRule) {
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        reset: 0,
      };
    }

    // Check whitelist/blacklist
    const key = this.getKey(context, matchedRule);
    if (matchedRule.whitelist?.includes(key)) {
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        reset: 0,
      };
    }

    if (matchedRule.blacklist?.includes(key)) {
      return {
        allowed: false,
        limit: matchedRule.capacity,
        remaining: 0,
        reset: Math.ceil(Date.now() / 1000) + 3600,
        retryAfter: 3600,
      };
    }

    // Apply rate limiting based on strategy
    switch (matchedRule.strategy) {
      case 'token-bucket':
        return this.checkTokenBucket(matchedRule, key);
      case 'leaky-bucket':
        return this.checkLeakyBucket(matchedRule, key);
      case 'fixed-window':
        return this.checkFixedWindow(matchedRule, key);
      case 'sliding-window':
        return this.checkSlidingWindow(matchedRule, key);
      default:
        return { allowed: true, limit: 0, remaining: 0, reset: 0 };
    }
  }

  /**
   * Token Bucket algorithm
   */
  private checkTokenBucket(rule: RateLimitRule, key: string): RateLimitStatus {
    let bucket = this.buckets.get(rule.id)?.get(key);

    if (!bucket) {
      bucket = {
        tokens: rule.capacity,
        lastRefill: Date.now(),
      };
      this.buckets.get(rule.id)?.set(key, bucket);
    }

    // Calculate tokens to add based on time elapsed
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * rule.refillRate;

    bucket.tokens = Math.min(rule.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const allowed = bucket.tokens >= 1;
    if (allowed) {
      bucket.tokens -= 1;
    }

    const remaining = Math.floor(bucket.tokens);
    const resetTime = Math.ceil(now / 1000 + (1 - bucket.tokens) / rule.refillRate);

    return {
      allowed,
      limit: rule.capacity,
      remaining,
      reset: resetTime,
      retryAfter: allowed ? undefined : Math.ceil((1 - bucket.tokens) / rule.refillRate),
    };
  }

  /**
   * Leaky Bucket algorithm
   */
  private checkLeakyBucket(rule: RateLimitRule, key: string): RateLimitStatus {
    let bucket = this.buckets.get(rule.id)?.get(key);

    if (!bucket) {
      bucket = {
        tokens: rule.capacity,
        lastRefill: Date.now(),
      };
      this.buckets.get(rule.id)?.set(key, bucket);
    }

    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToRemove = timePassed * rule.refillRate;

    bucket.tokens = Math.max(0, bucket.tokens - tokensToRemove);
    bucket.lastRefill = now;

    const allowed = bucket.tokens < rule.capacity;

    return {
      allowed,
      limit: rule.capacity,
      remaining: Math.floor(rule.capacity - bucket.tokens),
      reset: Math.ceil(now / 1000 + rule.capacity / rule.refillRate),
      retryAfter: allowed ? undefined : Math.ceil(1 / rule.refillRate),
    };
  }

  /**
   * Fixed Window algorithm
   */
  private checkFixedWindow(rule: RateLimitRule, key: string): RateLimitStatus {
    const window = rule.window || 60; // default 1 minute
    const now = Date.now();
    const windowStart = Math.floor(now / (window * 1000)) * (window * 1000);

    const counts = this.windowCounts.get(rule.id) || new Map();
    const windowKey = `${key}:${windowStart}`;
    const count = counts.get(windowKey) || 0;

    const allowed = count < rule.capacity;

    if (allowed) {
      counts.set(windowKey, count + 1);
      this.windowCounts.set(rule.id, counts);
    }

    // Clean old windows
    this.cleanOldWindows(rule.id, windowStart);

    const remaining = Math.max(0, rule.capacity - count - (allowed ? 1 : 0));
    const resetTime = Math.ceil((windowStart + window * 1000) / 1000);

    return {
      allowed,
      limit: rule.capacity,
      remaining,
      reset: resetTime,
      retryAfter: allowed ? undefined : Math.ceil((windowStart + window * 1000 - now) / 1000),
    };
  }

  /**
   * Sliding Window algorithm
   */
  private checkSlidingWindow(rule: RateLimitRule, key: string): RateLimitStatus {
    const window = rule.window || 60; // default 1 minute
    const now = Date.now();
    const windowStart = now - window * 1000;

    const counts = this.windowCounts.get(rule.id) || new Map();
    const timestamps = counts.get(key) || [];

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter((t) => t > windowStart);

    const allowed = validTimestamps.length < rule.capacity;

    if (allowed) {
      validTimestamps.push(now);
      counts.set(key, validTimestamps);
      this.windowCounts.set(rule.id, counts);
    }

    const remaining = Math.max(0, rule.capacity - validTimestamps.length - (allowed ? 1 : 0));
    const resetTime = Math.ceil((Math.min(...validTimestamps) + window * 1000) / 1000);

    return {
      allowed,
      limit: rule.capacity,
      remaining,
      reset: resetTime,
      retryAfter: allowed
        ? undefined
        : Math.ceil((Math.min(...validTimestamps) + window * 1000 - now) / 1000),
    };
  }

  /**
   * Find matching rule based on endpoint pattern
   */
  private findMatchingRule(context: RateLimitContext): RateLimitRule | undefined {
    const matchedRules = Array.from(this.rules.values())
      .filter((rule) => {
        const regex = new RegExp(rule.pattern);
        return regex.test(context.endpoint);
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return matchedRules[0];
  }

  /**
   * Generate rate limit key based on rule and context
   */
  private getKey(context: RateLimitContext, rule: RateLimitRule): string {
    const parts = [rule.id];

    if (rule.perIP) {
      parts.push(`ip:${context.ip}`);
    }

    if (rule.perUser && context.userId) {
      parts.push(`user:${context.userId}`);
    }

    if (rule.perEndpoint) {
      parts.push(`endpoint:${context.endpoint}`);
    }

    return parts.join(':');
  }

  /**
   * Clean old windows
   */
  private cleanOldWindows(ruleId: string, currentWindow: number): void {
    const counts = this.windowCounts.get(ruleId);
    if (!counts) return;

    for (const key of counts.keys()) {
      const [, windowStart] = key.split(':');
      if (parseInt(windowStart) < currentWindow - 60000) {
        counts.delete(key);
      }
    }
  }

  /**
   * Add custom rate limit rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
    this.buckets.set(rule.id, new Map());
    this.windowCounts.set(rule.id, new Map());
    this.logger.log(`Added rate limit rule: ${rule.name} (${rule.id})`);
  }

  /**
   * Update existing rule
   */
  updateRule(ruleId: string, updates: Partial<RateLimitRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.log(`Updated rate limit rule: ${ruleId}`);
    }
  }

  /**
   * Remove rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.buckets.delete(ruleId);
    this.windowCounts.delete(ruleId);
    this.logger.log(`Removed rate limit rule: ${ruleId}`);
  }

  /**
   * Get all rules
   */
  getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): RateLimitRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Reset rate limit for a key
   */
  reset(ruleId: string, key: string): void {
    this.buckets.get(ruleId)?.delete(key);
    this.windowCounts.get(ruleId)?.delete(key);
    this.logger.log(`Reset rate limit: ${ruleId}/${key}`);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.buckets.forEach((m) => m.clear());
    this.windowCounts.forEach((m) => m.clear());
    this.logger.log('Reset all rate limits');
  }
}
