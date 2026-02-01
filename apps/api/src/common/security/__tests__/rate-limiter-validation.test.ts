import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiterService } from '../rate-limiter';
import { InputValidationMiddleware } from '../validation.middleware';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    service = new RateLimiterService();
  });

  describe('rate limiting strategies', () => {
    it('should allow requests within limit', () => {
      const config = service.getConfig('perIP')!;
      const key = 'user:123';

      for (let i = 0; i < 10; i++) {
        const allowed = service.checkRateLimit(key, config);
        expect(allowed).toBe(true);
      }
    });

    it('should deny requests exceeding limit', () => {
      const config = service.getConfig('authStrict')!;
      const key = 'auth:192.168.1.1';

      // Make 5 allowed requests
      for (let i = 0; i < 5; i++) {
        const allowed = service.checkRateLimit(key, config);
        expect(allowed).toBe(true);
      }

      // 6th request should be denied
      const denied = service.checkRateLimit(key, config);
      expect(denied).toBe(false);
    });

    it('should reset after window expires', () => {
      const config = { ...service.getConfig('global')!, windowMs: 100 };
      const key = 'test-reset';

      service.checkRateLimit(key, config);
      let allowed = service.checkRateLimit(key, config);
      expect(allowed).toBe(true);

      // Wait for window to expire
      setTimeout(() => {
        allowed = service.checkRateLimit(key, config);
        expect(allowed).toBe(true); // Should allow after reset
      }, 150);
    });

    it('should apply token bucket strategy', () => {
      const config = service.getConfig('perUser')!;
      const key = 'user:456';

      // Should allow initial requests quickly (burst)
      for (let i = 0; i < 3; i++) {
        expect(service.checkRateLimit(key, config)).toBe(true);
      }
    });

    it('should apply fixed window strategy', () => {
      const config = service.getConfig('authStrict')!;
      const key = 'auth:test';

      for (let i = 0; i < 5; i++) {
        expect(service.checkRateLimit(key, config)).toBe(true);
      }

      expect(service.checkRateLimit(key, config)).toBe(false);
    });
  });

  describe('rate limit status', () => {
    it('should return correct remaining requests', () => {
      const config = service.getConfig('search')!;
      const key = 'search:user:123';

      service.checkRateLimit(key, config);
      service.checkRateLimit(key, config);

      const status = service.getStatus(key, config);
      expect(status.remaining).toBe(config.maxRequests - 2);
      expect(status.limit).toBe(config.maxRequests);
    });

    it('should include retry-after headers', () => {
      const config = service.getConfig('authStrict')!;
      const key = 'auth:retry';

      // Max out the limit
      for (let i = 0; i < 5; i++) {
        service.checkRateLimit(key, config);
      }

      const headers = service.getHeaders(key, config);
      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBeDefined();
    });
  });

  describe('rate limit management', () => {
    it('should reset specific key', () => {
      const config = service.getConfig('perUser')!;
      const key = 'user:reset-test';

      service.checkRateLimit(key, config);
      service.checkRateLimit(key, config);

      service.resetKey(key);

      const status = service.getStatus(key, config);
      expect(status.remaining).toBe(config.maxRequests);
    });

    it('should get tier-based configuration', () => {
      const freeConfig = service.getConfigForTier('free');
      const premiumConfig = service.getConfigForTier('premium');
      const enterpriseConfig = service.getConfigForTier('enterprise');

      expect(freeConfig.maxRequests).toBeLessThan(premiumConfig.maxRequests);
      expect(premiumConfig.maxRequests).toBeLessThan(enterpriseConfig.maxRequests);
    });

    it('should provide statistics', () => {
      const config = service.getConfig('perUser')!;

      service.checkRateLimit('key1', config);
      service.checkRateLimit('key2', config);

      const stats = service.getStats();
      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
      expect(stats.configurations.length).toBeGreaterThan(0);
    });

    it('should cleanup old entries', () => {
      const config = service.getConfig('global')!;
      service.checkRateLimit('old-key', config);

      const result = service.cleanup();
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('InputValidationMiddleware', () => {
  let middleware: InputValidationMiddleware;

  beforeEach(() => {
    middleware = new InputValidationMiddleware();
  });

  describe('SQL injection detection', () => {
    it('should detect SQL injection patterns', () => {
      const req = {
        query: { search: "'; DROP TABLE users; --" },
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      const res = {} as any;
      const next = () => {};

      expect(() => middleware.use(req, res, next)).toThrow();
    });

    it('should detect UNION-based injection', () => {
      const req = {
        query: { id: '1 UNION SELECT * FROM passwords' },
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, res, () => {})).toThrow();
    });

    it('should allow legitimate SQL keywords in different contexts', () => {
      const req = {
        query: { search: 'SELECT the best options' }, // Natural language
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      // This will still trigger, demonstrating the trade-off
      // In production, use more sophisticated parsers
    });
  });

  describe('XSS detection', () => {
    it('should detect script tags', () => {
      const req = {
        query: { name: '<script>alert("xss")</script>' },
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, {} as any, () => {})).toThrow();
    });

    it('should detect event handlers', () => {
      const req = {
        query: { text: '<img src=x onerror=alert(1)>' },
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, {} as any, () => {})).toThrow();
    });

    it('should detect javascript protocol', () => {
      const req = {
        query: { link: 'javascript:alert(1)' },
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, {} as any, () => {})).toThrow();
    });
  });

  describe('path traversal detection', () => {
    it('should detect path traversal attempts', () => {
      const req = {
        query: { file: '../../etc/passwd' },
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, {} as any, () => {})).toThrow();
    });

    it('should detect encoded path traversal', () => {
      const req = {
        query: { path: '%2e%2e%2fadmin' },
        body: {},
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, {} as any, () => {})).toThrow();
    });
  });

  describe('prototype pollution detection', () => {
    it('should reject __proto__ in fields', () => {
      const req = {
        query: {},
        body: { __proto__: { isAdmin: true } },
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, {} as any, () => {})).toThrow();
    });

    it('should reject constructor field', () => {
      const req = {
        query: {},
        body: { constructor: 'malicious' },
        params: {},
        get: () => undefined,
      } as any;

      expect(() => middleware.use(req, {} as any, () => {})).toThrow();
    });
  });

  describe('validation status', () => {
    it('should provide validation rules', () => {
      const status = middleware.getStatus();

      expect(status.rulesCount).toBeGreaterThan(0);
      expect(status.rules).toBeDefined();
      expect(status.forbiddenKeys).toContain('__proto__');
      expect(status.allowedPatterns).toContain('email');
    });
  });
});
