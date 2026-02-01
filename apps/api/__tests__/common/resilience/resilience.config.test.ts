import { describe, it, expect } from 'vitest';
import {
  RESILIENCE_CONFIGS,
  SERVICE_RESILIENCE_CONFIGS,
  getResilienceConfig,
  getServiceConfig,
  mergeResilienceConfigs,
  validateResilienceConfig,
} from './resilience.config';

describe('Resilience Configuration', () => {
  describe('Environment Configurations', () => {
    it('should have development configuration', () => {
      const config = RESILIENCE_CONFIGS.development;

      expect(config).toBeDefined();
      expect(config.circuitBreaker).toBeDefined();
      expect(config.retry).toBeDefined();
      expect(config.bulkhead).toBeDefined();
      expect(config.timeout).toBeDefined();
    });

    it('should have testing configuration', () => {
      const config = RESILIENCE_CONFIGS.testing;

      expect(config).toBeDefined();
      expect(config.circuitBreaker).toBeDefined();
    });

    it('should have production configuration', () => {
      const config = RESILIENCE_CONFIGS.production;

      expect(config).toBeDefined();
      expect(config.circuitBreaker).toBeDefined();
    });

    it('should have stricter production settings', () => {
      const dev = RESILIENCE_CONFIGS.development;
      const prod = RESILIENCE_CONFIGS.production;

      expect(prod.circuitBreaker.failureThreshold).toBeLessThan(dev.circuitBreaker.failureThreshold);
      expect(prod.timeout).toBeLessThan(dev.timeout);
    });

    it('should have permissive development settings', () => {
      const dev = RESILIENCE_CONFIGS.development;
      const test = RESILIENCE_CONFIGS.testing;

      expect(dev.circuitBreaker.failureThreshold).toBeGreaterThan(
        test.circuitBreaker.failureThreshold,
      );
    });
  });

  describe('Service-Specific Configurations', () => {
    it('should have external-api-fast service config', () => {
      const config = SERVICE_RESILIENCE_CONFIGS['external-api-fast'];

      expect(config).toBeDefined();
      expect(config.bulkhead.maxConcurrent).toBeGreaterThan(5);
    });

    it('should have external-api-slow service config', () => {
      const config = SERVICE_RESILIENCE_CONFIGS['external-api-slow'];

      expect(config).toBeDefined();
      expect(config.timeout).toBeGreaterThan(30000);
    });

    it('should have database service config', () => {
      const config = SERVICE_RESILIENCE_CONFIGS.database;

      expect(config).toBeDefined();
      expect(config.retry.maxRetries).toBe(3);
    });

    it('should have cache service config', () => {
      const config = SERVICE_RESILIENCE_CONFIGS.cache;

      expect(config).toBeDefined();
      expect(config.timeout).toBeLessThan(10000);
    });

    it('should have message-queue service config', () => {
      const config = SERVICE_RESILIENCE_CONFIGS['message-queue'];

      expect(config).toBeDefined();
    });

    it('should have ml-operations service config', () => {
      const config = SERVICE_RESILIENCE_CONFIGS['ml-operations'];

      expect(config).toBeDefined();
      expect(config.bulkhead.maxConcurrent).toBeLessThan(5);
    });

    it('should have auth service config', () => {
      const config = SERVICE_RESILIENCE_CONFIGS.auth;

      expect(config).toBeDefined();
      expect(config.timeout).toBeLessThan(10000);
    });

    it('should have fast timeout for auth', () => {
      const auth = SERVICE_RESILIENCE_CONFIGS.auth;
      const ml = SERVICE_RESILIENCE_CONFIGS['ml-operations'];

      expect(auth.timeout).toBeLessThan(ml.timeout);
    });

    it('should have high concurrency for cache', () => {
      const cache = SERVICE_RESILIENCE_CONFIGS.cache;
      const ml = SERVICE_RESILIENCE_CONFIGS['ml-operations'];

      expect(cache.bulkhead.maxConcurrent).toBeGreaterThan(ml.bulkhead.maxConcurrent);
    });
  });

  describe('getResilienceConfig', () => {
    it('should return development config by default', () => {
      process.env.NODE_ENV = undefined;
      const config = getResilienceConfig();

      expect(config).toEqual(RESILIENCE_CONFIGS.development);
    });

    it('should return development config explicitly', () => {
      const config = getResilienceConfig('development');

      expect(config).toEqual(RESILIENCE_CONFIGS.development);
    });

    it('should return production config', () => {
      const config = getResilienceConfig('production');

      expect(config).toEqual(RESILIENCE_CONFIGS.production);
    });

    it('should return testing config', () => {
      const config = getResilienceConfig('testing');

      expect(config).toEqual(RESILIENCE_CONFIGS.testing);
    });

    it('should fallback to development for unknown env', () => {
      const config = getResilienceConfig('unknown');

      expect(config).toEqual(RESILIENCE_CONFIGS.development);
    });
  });

  describe('getServiceConfig', () => {
    it('should return service-specific config', () => {
      const config = getServiceConfig('auth');

      expect(config.timeout).toBeLessThan(10000);
    });

    it('should return default config for unknown service', () => {
      const config = getServiceConfig('unknown-service');

      expect(config).toBeDefined();
    });
  });

  describe('mergeResilienceConfigs', () => {
    it('should merge partial config', () => {
      const base = RESILIENCE_CONFIGS.development;
      const override = {
        timeout: 5000,
      };

      const merged = mergeResilienceConfigs(base, override);

      expect(merged.timeout).toBe(5000);
      expect(merged.circuitBreaker).toEqual(base.circuitBreaker);
    });

    it('should override circuit breaker settings', () => {
      const base = RESILIENCE_CONFIGS.development;
      const override = {
        circuitBreaker: {
          failureThreshold: 2,
          successThreshold: 1,
          timeout: 30000,
          monitoringPeriod: 30000,
        },
      };

      const merged = mergeResilienceConfigs(base, override);

      expect(merged.circuitBreaker.failureThreshold).toBe(2);
      expect(merged.retry).toEqual(base.retry);
    });

    it('should override multiple sections', () => {
      const base = RESILIENCE_CONFIGS.development;
      const override = {
        timeout: 5000,
        retry: {
          maxRetries: 1,
          initialDelayMs: 100,
          maxDelayMs: 1000,
          backoffMultiplier: 2,
          jitterFactor: 0.1,
        },
      };

      const merged = mergeResilienceConfigs(base, override);

      expect(merged.timeout).toBe(5000);
      expect(merged.retry.maxRetries).toBe(1);
    });
  });

  describe('validateResilienceConfig', () => {
    it('should validate correct config', () => {
      const config = RESILIENCE_CONFIGS.production;

      expect(validateResilienceConfig(config)).toBe(true);
    });

    it('should reject invalid failureThreshold', () => {
      const config = {
        ...RESILIENCE_CONFIGS.production,
        circuitBreaker: {
          ...RESILIENCE_CONFIGS.production.circuitBreaker,
          failureThreshold: 0,
        },
      };

      expect(validateResilienceConfig(config)).toBe(false);
    });

    it('should reject invalid maxRetries', () => {
      const config = {
        ...RESILIENCE_CONFIGS.production,
        retry: {
          ...RESILIENCE_CONFIGS.production.retry,
          maxRetries: -1,
        },
      };

      expect(validateResilienceConfig(config)).toBe(false);
    });

    it('should reject invalid delay configuration', () => {
      const config = {
        ...RESILIENCE_CONFIGS.production,
        retry: {
          ...RESILIENCE_CONFIGS.production.retry,
          initialDelayMs: 5000,
          maxDelayMs: 1000,
        },
      };

      expect(validateResilienceConfig(config)).toBe(false);
    });

    it('should reject invalid maxConcurrent', () => {
      const config = {
        ...RESILIENCE_CONFIGS.production,
        bulkhead: {
          ...RESILIENCE_CONFIGS.production.bulkhead,
          maxConcurrent: 0,
        },
      };

      expect(validateResilienceConfig(config)).toBe(false);
    });

    it('should reject invalid maxQueueSize', () => {
      const config = {
        ...RESILIENCE_CONFIGS.production,
        bulkhead: {
          ...RESILIENCE_CONFIGS.production.bulkhead,
          maxQueueSize: 0,
        },
      };

      expect(validateResilienceConfig(config)).toBe(false);
    });

    it('should reject invalid timeout', () => {
      const config = {
        ...RESILIENCE_CONFIGS.production,
        timeout: 0,
      };

      expect(validateResilienceConfig(config)).toBe(false);
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent configuration across environments', () => {
      for (const env of ['development', 'testing', 'production']) {
        const config = getResilienceConfig(env);

        expect(validateResilienceConfig(config)).toBe(true);
      }
    });

    it('should have consistent service configurations', () => {
      for (const serviceName of Object.keys(SERVICE_RESILIENCE_CONFIGS)) {
        const config = SERVICE_RESILIENCE_CONFIGS[serviceName];

        expect(validateResilienceConfig(config)).toBe(true);
      }
    });

    it('production should be stricter than development', () => {
      const prod = RESILIENCE_CONFIGS.production;
      const dev = RESILIENCE_CONFIGS.development;

      // Shorter timeout in prod
      expect(prod.timeout).toBeLessThanOrEqual(dev.timeout);

      // Lower failure threshold in prod (stricter)
      expect(prod.circuitBreaker.failureThreshold).toBeLessThanOrEqual(
        dev.circuitBreaker.failureThreshold,
      );
    });
  });
});
