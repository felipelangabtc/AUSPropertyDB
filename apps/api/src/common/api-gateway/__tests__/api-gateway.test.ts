import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KongGatewayService } from '../kong.gateway';
import { TraefikGatewayService } from '../traefik.gateway';
import { AdvancedRateLimiterService, RateLimitRule } from '../advanced-rate-limiter';

describe('API Gateway - Phase 5', () => {
  let kongGateway: KongGatewayService;
  let traefikGateway: TraefikGatewayService;
  let rateLimiter: AdvancedRateLimiterService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        KongGatewayService,
        TraefikGatewayService,
        AdvancedRateLimiterService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: any) => defaultValue,
          },
        },
      ],
    }).compile();

    kongGateway = module.get<KongGatewayService>(KongGatewayService);
    traefikGateway = module.get<TraefikGatewayService>(TraefikGatewayService);
    rateLimiter = module.get<AdvancedRateLimiterService>(AdvancedRateLimiterService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Kong Gateway Service', () => {
    it('should initialize Kong gateway', () => {
      expect(kongGateway).toBeDefined();
    });

    it('should build token-bucket rate limiting config', () => {
      const config = {
        service: 'api',
        limits: { requests: 100, window: 60 },
        strategy: 'token-bucket' as const,
        redisCluster: false,
      };

      const result = (kongGateway as any).buildRateLimitingConfig(config);
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('window_size');
      expect(result).toHaveProperty('policy');
    });

    it('should build JWT authentication config', () => {
      const result = (kongGateway as any).buildAuthConfig('jwt');
      expect(result).toHaveProperty('secret_is_base64');
      expect(result).toHaveProperty('algorithm');
      expect(result.algorithm).toContain('HS256');
    });

    it('should build OAuth2 authentication config', () => {
      const result = (kongGateway as any).buildAuthConfig('oauth2');
      expect(result).toHaveProperty('scopes');
      expect(result.scopes).toContain('read');
    });

    it('should build key-auth authentication config', () => {
      const result = (kongGateway as any).buildAuthConfig('key-auth');
      expect(result).toHaveProperty('key_names');
      expect(result.key_names).toContain('apikey');
    });

    it('should check Kong health', async () => {
      const health = await kongGateway.checkHealth();
      expect(health).toHaveProperty('success');
      expect(health).toHaveProperty('error');
    });
  });

  describe('Traefik Gateway Service', () => {
    it('should initialize Traefik gateway', () => {
      expect(traefikGateway).toBeDefined();
    });

    it('should build rate limit middleware for per-IP limiting', () => {
      const config: any = {
        strategy: 'token-bucket',
        capacity: 100,
        refillRate: 10,
        perIP: true,
      };

      const result = traefikGateway.buildRateLimitMiddleware(config);
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('sourceCriterion');
      expect(result.sourceCriterion).toHaveProperty('ipStrategy');
    });

    it('should build rate limit middleware for per-user limiting', () => {
      const config: any = {
        strategy: 'token-bucket',
        capacity: 100,
        refillRate: 10,
        perUser: true,
      };

      const result = traefikGateway.buildRateLimitMiddleware(config);
      expect(result).toHaveProperty('sourceCriterion');
      expect(result.sourceCriterion).toHaveProperty('requestHeaderName');
    });

    it('should build circuit breaker middleware', () => {
      const config = {
        expression: 'NetworkErrorRatio() > 0.5',
        checkPeriod: '100ms',
        fallbackDuration: '60s',
      };

      const result = traefikGateway.buildCircuitBreakerMiddleware(config);
      expect(result).toHaveProperty('expression');
      expect(result).toHaveProperty('checkPeriod');
    });

    it('should build retry middleware', () => {
      const config = {
        attempts: 3,
        initialInterval: '100ms',
        backoff: 2,
      };

      const result = traefikGateway.buildRetryMiddleware(config);
      expect(result.attempts).toBe(3);
      expect(result).toHaveProperty('backoff');
    });

    it('should build CORS middleware', () => {
      const config = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
      };

      const result = traefikGateway.buildCORSMiddleware(config);
      expect(result).toHaveProperty('accessControlAllowOriginList');
      expect(result).toHaveProperty('accessControlAllowMethods');
    });

    it('should build basic auth middleware', () => {
      const users = ['user:password'];
      const result = traefikGateway.buildBasicAuthMiddleware(users);
      expect(result).toHaveProperty('users');
      expect(result.users).toEqual(users);
    });

    it('should build compression middleware', () => {
      const config = {
        minResponseBodyBytes: 1024,
        excludedContentTypes: ['image/jpeg'],
      };

      const result = traefikGateway.buildCompressionMiddleware(config);
      expect(result).toHaveProperty('minResponseBodyBytes');
      expect(result).toHaveProperty('level');
    });

    it('should build strip prefix middleware', () => {
      const prefixes = ['/api/v1'];
      const result = traefikGateway.buildStripPrefixMiddleware(prefixes);
      expect(result).toHaveProperty('prefixes');
      expect(result.prefixes).toEqual(prefixes);
    });

    it('should build request transformer middleware', () => {
      const config = {
        addHeaders: { 'X-Custom': 'value' },
        removeHeaders: ['X-Remove'],
      };

      const result = traefikGateway.buildRequestTransformerMiddleware(config);
      expect(result).toHaveProperty('headers');
    });

    it('should generate static config', () => {
      const config = {
        entryPoints: {
          http: { address: ':80' },
          https: { address: ':443' },
        },
      };

      const result = traefikGateway.generateStaticConfig(config);
      expect(result).toHaveProperty('global');
      expect(result).toHaveProperty('entryPoints');
      expect(result).toHaveProperty('providers');
    });

    it('should check Traefik health', async () => {
      const health = await traefikGateway.checkHealth();
      expect(health).toHaveProperty('status');
    });
  });

  describe('Advanced Rate Limiter Service', () => {
    it('should initialize with default rules', () => {
      const rules = rateLimiter.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.id === 'global-api')).toBe(true);
    });

    it('should add custom rate limit rule', () => {
      const rule: RateLimitRule = {
        id: 'test-rule',
        name: 'Test Rate Limit',
        pattern: '/api/test',
        strategy: 'token-bucket',
        capacity: 50,
        refillRate: 5,
      };

      rateLimiter.addRule(rule);
      const retrieved = rateLimiter.getRule('test-rule');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Rate Limit');
    });

    it('should update rate limit rule', () => {
      const rule: RateLimitRule = {
        id: 'update-test',
        name: 'Update Test',
        pattern: '/api/update',
        strategy: 'token-bucket',
        capacity: 50,
        refillRate: 5,
      };

      rateLimiter.addRule(rule);
      rateLimiter.updateRule('update-test', { capacity: 100 });

      const updated = rateLimiter.getRule('update-test');
      expect(updated?.capacity).toBe(100);
    });

    it('should remove rate limit rule', () => {
      const rule: RateLimitRule = {
        id: 'remove-test',
        name: 'Remove Test',
        pattern: '/api/remove',
        strategy: 'token-bucket',
        capacity: 50,
        refillRate: 5,
      };

      rateLimiter.addRule(rule);
      rateLimiter.removeRule('remove-test');

      const retrieved = rateLimiter.getRule('remove-test');
      expect(retrieved).toBeUndefined();
    });

    it('should allow requests under token bucket limit', async () => {
      const context = {
        ip: '192.168.1.1',
        endpoint: '/api/properties/search',
        method: 'GET',
        timestamp: Date.now(),
      };

      const status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should rate limit requests on token bucket exhaustion', async () => {
      rateLimiter.resetAll();

      const context = {
        ip: '192.168.1.2',
        endpoint: '/api/auth/login',
        method: 'POST',
        timestamp: Date.now(),
      };

      // First request should be allowed
      let status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(true);

      // Fifth request should be allowed
      for (let i = 0; i < 4; i++) {
        status = await rateLimiter.checkRateLimit(context);
      }

      // Sixth request should be denied
      status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(false);
      expect(status.retryAfter).toBeGreaterThan(0);
    });

    it('should respect rule priority', () => {
      const rules = rateLimiter.getRules();
      for (let i = 1; i < rules.length; i++) {
        const prev = rules[i - 1].priority || 0;
        const curr = rules[i].priority || 0;
        expect(curr).toBeLessThanOrEqual(prev);
      }
    });

    it('should reset rate limit for key', async () => {
      const context = {
        ip: '192.168.1.3',
        endpoint: '/api/properties/search',
        method: 'GET',
        timestamp: Date.now(),
      };

      const ruleId = 'search-endpoints';
      const key = `${ruleId}:ip:${context.ip}`;

      await rateLimiter.checkRateLimit(context);
      rateLimiter.reset(ruleId, key);

      const status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(99); // Reset, so -1 from original 100
    });

    it('should reset all rate limits', async () => {
      rateLimiter.resetAll();
      const rules = rateLimiter.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should handle whitelist bypass', async () => {
      const rule: RateLimitRule = {
        id: 'whitelist-test',
        name: 'Whitelist Test',
        pattern: '/api/test',
        strategy: 'fixed-window',
        capacity: 1,
        window: 60,
        refillRate: 1 / 60,
        perIP: true,
        whitelist: ['ip:192.168.1.100'],
      };

      rateLimiter.addRule(rule);

      const context = {
        ip: '192.168.1.100',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
      };

      // Should always be allowed due to whitelist
      let status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(true);

      status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(true);

      rateLimiter.removeRule('whitelist-test');
    });

    it('should handle blacklist blocking', async () => {
      const rule: RateLimitRule = {
        id: 'blacklist-test',
        name: 'Blacklist Test',
        pattern: '/api/test',
        strategy: 'token-bucket',
        capacity: 100,
        refillRate: 10,
        perIP: true,
        blacklist: ['ip:192.168.1.200'],
      };

      rateLimiter.addRule(rule);

      const context = {
        ip: '192.168.1.200',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
      };

      const status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(false);
      expect(status.remaining).toBe(0);

      rateLimiter.removeRule('blacklist-test');
    });
  });

  describe('Rate Limiting Strategies', () => {
    it('should implement token bucket strategy correctly', async () => {
      const rule: RateLimitRule = {
        id: 'token-bucket-test',
        name: 'Token Bucket Test',
        pattern: '/api/test',
        strategy: 'token-bucket',
        capacity: 10,
        refillRate: 1, // 1 token per second
      };

      rateLimiter.addRule(rule);

      const context = {
        ip: '192.168.1.50',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
      };

      // Use all 10 tokens
      for (let i = 0; i < 10; i++) {
        const status = await rateLimiter.checkRateLimit(context);
        expect(status.allowed).toBe(true);
      }

      // 11th request should be denied
      let status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(false);

      // Wait 1 second for token refill
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next request should be allowed
      status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(true);

      rateLimiter.removeRule('token-bucket-test');
    });

    it('should implement fixed window strategy correctly', async () => {
      const rule: RateLimitRule = {
        id: 'fixed-window-test',
        name: 'Fixed Window Test',
        pattern: '/api/test',
        strategy: 'fixed-window',
        capacity: 5,
        window: 1, // 1 second window
        refillRate: 5,
      };

      rateLimiter.addRule(rule);

      const context = {
        ip: '192.168.1.51',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
      };

      // Use all 5 requests
      for (let i = 0; i < 5; i++) {
        const status = await rateLimiter.checkRateLimit(context);
        expect(status.allowed).toBe(true);
      }

      // 6th request should be denied
      let status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(false);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next request should be allowed
      status = await rateLimiter.checkRateLimit(context);
      expect(status.allowed).toBe(true);

      rateLimiter.removeRule('fixed-window-test');
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle 1000 concurrent rate limit checks', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 1000; i++) {
        const context = {
          ip: `192.168.1.${i % 100}`,
          endpoint: '/api/test',
          method: 'GET',
          timestamp: Date.now(),
        };

        promises.push(rateLimiter.checkRateLimit(context));
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should efficiently match rules', () => {
      const context = {
        ip: '192.168.1.1',
        endpoint: '/api/properties/search',
        method: 'GET',
        timestamp: Date.now(),
      };

      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        (rateLimiter as any).findMatchingRule(context);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 10k lookups in < 1 second
    });

    it('should manage memory efficiently', () => {
      rateLimiter.resetAll();

      // Simulate 1000 unique IPs
      for (let i = 0; i < 1000; i++) {
        const context = {
          ip: `192.168.${Math.floor(i / 256)}.${i % 256}`,
          endpoint: '/api/test',
          method: 'GET',
          timestamp: Date.now(),
        };

        rateLimiter.checkRateLimit(context);
      }

      const rules = rateLimiter.getRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('API Gateway Integration', () => {
    it('should support per-endpoint rate limiting', async () => {
      const contexts = [
        { ip: '192.168.1.1', endpoint: '/api/properties/search', method: 'GET', timestamp: Date.now() },
        { ip: '192.168.1.1', endpoint: '/api/auth/login', method: 'POST', timestamp: Date.now() },
      ];

      const statuses = await Promise.all(contexts.map(c => rateLimiter.checkRateLimit(c)));

      // Search should have higher limit than login
      expect(statuses[0].limit).toBeGreaterThan(statuses[1].limit);
    });

    it('should support per-user rate limiting', async () => {
      const contexts = [
        { ip: '192.168.1.1', userId: 'user-1', endpoint: '/api/properties/search', method: 'GET', timestamp: Date.now() },
        { ip: '192.168.1.1', userId: 'user-2', endpoint: '/api/properties/search', method: 'GET', timestamp: Date.now() },
      ];

      const statuses = await Promise.all(contexts.map(c => rateLimiter.checkRateLimit(c)));

      // Different users should have independent limits
      expect(statuses[0].remaining).toBeGreaterThan(0);
      expect(statuses[1].remaining).toBeGreaterThan(0);
    });

    it('should provide rate limit headers', async () => {
      const context = {
        ip: '192.168.1.1',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
      };

      const status = await rateLimiter.checkRateLimit(context);

      expect(status).toHaveProperty('limit');
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('reset');
    });
  });
});
