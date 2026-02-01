import { CircuitBreakerConfig } from './circuit-breaker';
import { RetryPolicyConfig } from './retry';
import { BulkheadConfig } from './bulkhead';

/**
 * Complete Resilience Configuration
 * Centralized settings for all resilience patterns
 */
export interface ResilienceConfig {
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryPolicyConfig;
  bulkhead: BulkheadConfig;
  timeout: number;
}

/**
 * Environment-specific resilience configurations
 */
export const RESILIENCE_CONFIGS = {
  // Development - permissive
  development: {
    circuitBreaker: {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 120000,
      monitoringPeriod: 120000,
    },
    retry: {
      maxRetries: 5,
      initialDelayMs: 500,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    bulkhead: {
      name: 'default',
      maxConcurrent: 20,
      maxQueueSize: 100,
    },
    timeout: 30000,
  },

  // Testing - balanced
  testing: {
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 60000,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    bulkhead: {
      name: 'test',
      maxConcurrent: 10,
      maxQueueSize: 50,
    },
    timeout: 10000,
  },

  // Production - strict
  production: {
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000,
      monitoringPeriod: 30000,
    },
    retry: {
      maxRetries: 5,
      initialDelayMs: 200,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    bulkhead: {
      name: 'production',
      maxConcurrent: 10,
      maxQueueSize: 50,
    },
    timeout: 15000,
  },
};

/**
 * Service-specific resilience configurations
 */
export const SERVICE_RESILIENCE_CONFIGS: Record<string, ResilienceConfig> = {
  // Fast external APIs (search, geocoding)
  'external-api-fast': {
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      monitoringPeriod: 60000,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    bulkhead: {
      name: 'external-api-fast',
      maxConcurrent: 20,
      maxQueueSize: 100,
    },
    timeout: 10000,
  },

  // Slow external APIs (ML, complex searches)
  'external-api-slow': {
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 120000,
      monitoringPeriod: 120000,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    bulkhead: {
      name: 'external-api-slow',
      maxConcurrent: 5,
      maxQueueSize: 50,
    },
    timeout: 60000,
  },

  // Database connections
  database: {
    circuitBreaker: {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 60000,
      monitoringPeriod: 60000,
    },
    retry: {
      maxRetries: 3,
      initialDelayMs: 50,
      maxDelayMs: 500,
      backoffMultiplier: 2,
      jitterFactor: 0.05,
    },
    bulkhead: {
      name: 'database',
      maxConcurrent: 15,
      maxQueueSize: 100,
    },
    timeout: 30000,
  },

  // Cache operations
  cache: {
    circuitBreaker: {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 10000,
      monitoringPeriod: 10000,
    },
    retry: {
      maxRetries: 2,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      jitterFactor: 0.05,
    },
    bulkhead: {
      name: 'cache',
      maxConcurrent: 50,
      maxQueueSize: 200,
    },
    timeout: 5000,
  },

  // Message queue operations
  'message-queue': {
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 60000,
    },
    retry: {
      maxRetries: 5,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    bulkhead: {
      name: 'message-queue',
      maxConcurrent: 10,
      maxQueueSize: 100,
    },
    timeout: 30000,
  },

  // ML operations
  'ml-operations': {
    circuitBreaker: {
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 180000,
      monitoringPeriod: 180000,
    },
    retry: {
      maxRetries: 2,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    },
    bulkhead: {
      name: 'ml-operations',
      maxConcurrent: 2,
      maxQueueSize: 20,
    },
    timeout: 120000,
  },

  // Authentication/Authorization
  auth: {
    circuitBreaker: {
      failureThreshold: 10,
      successThreshold: 5,
      timeout: 30000,
      monitoringPeriod: 30000,
    },
    retry: {
      maxRetries: 2,
      initialDelayMs: 50,
      maxDelayMs: 500,
      backoffMultiplier: 2,
      jitterFactor: 0.05,
    },
    bulkhead: {
      name: 'auth',
      maxConcurrent: 30,
      maxQueueSize: 100,
    },
    timeout: 5000,
  },
};

/**
 * Get resilience configuration for environment
 */
export function getResilienceConfig(environment: string = process.env.NODE_ENV || 'development'): ResilienceConfig {
  return RESILIENCE_CONFIGS[environment as keyof typeof RESILIENCE_CONFIGS] || RESILIENCE_CONFIGS.development;
}

/**
 * Get service-specific resilience configuration
 */
export function getServiceConfig(serviceName: string): ResilienceConfig {
  return SERVICE_RESILIENCE_CONFIGS[serviceName] || getResilienceConfig();
}

/**
 * Resilience health check
 */
export interface ResilienceHealth {
  circuitBreakerHealth: Record<string, any>;
  bulkheadHealth: Record<string, any>;
  overallHealthy: boolean;
}

/**
 * Merge configurations (allows partial overrides)
 */
export function mergeResilienceConfigs(
  base: ResilienceConfig,
  overrides: Partial<ResilienceConfig>,
): ResilienceConfig {
  return {
    circuitBreaker: {
      ...base.circuitBreaker,
      ...overrides.circuitBreaker,
    },
    retry: {
      ...base.retry,
      ...overrides.retry,
    },
    bulkhead: {
      ...base.bulkhead,
      ...overrides.bulkhead,
    },
    timeout: overrides.timeout || base.timeout,
  };
}

/**
 * Validate resilience configuration
 */
export function validateResilienceConfig(config: ResilienceConfig): boolean {
  // Validate circuit breaker
  if (config.circuitBreaker.failureThreshold <= 0) {
    console.error('Circuit breaker failureThreshold must be > 0');
    return false;
  }

  // Validate retry
  if (config.retry.maxRetries! < 0) {
    console.error('Retry maxRetries must be >= 0');
    return false;
  }

  if (config.retry.initialDelayMs! > config.retry.maxDelayMs!) {
    console.error('Retry initialDelayMs must be <= maxDelayMs');
    return false;
  }

  // Validate bulkhead
  if (config.bulkhead.maxConcurrent <= 0) {
    console.error('Bulkhead maxConcurrent must be > 0');
    return false;
  }

  if (config.bulkhead.maxQueueSize <= 0) {
    console.error('Bulkhead maxQueueSize must be > 0');
    return false;
  }

  // Validate timeout
  if (config.timeout <= 0) {
    console.error('Timeout must be > 0');
    return false;
  }

  return true;
}
