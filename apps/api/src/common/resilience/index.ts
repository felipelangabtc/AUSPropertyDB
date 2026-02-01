/**
 * Resilience Module Exports
 * Central hub for all resilience patterns and utilities
 */

// Circuit Breaker
export { CircuitBreaker, CircuitBreakerRegistry, CircuitBreakerState } from './circuit-breaker';
export type { CircuitBreakerConfig, CircuitBreakerStatus } from './circuit-breaker';

// Retry
export {
  RetryInterceptor,
  DEFAULT_RETRY_POLICIES,
  calculateBackoffDelay,
  CircuitBreakerRetryStrategy,
  WithRetry,
} from './retry';
export type { RetryPolicyConfig } from './retry';

// Timeout
export {
  Timeout,
  getTimeoutForRoute,
  TimeoutTracker,
  HttpTimeoutMiddleware,
  ENDPOINT_TIMEOUTS,
} from './timeout';

// Bulkhead
export {
  Bulkhead,
  BulkheadRegistry,
  WithBulkhead,
  BULKHEAD_PRESETS,
} from './bulkhead';
export type { BulkheadConfig, ExecutionContext } from './bulkhead';

// Configuration
export {
  RESILIENCE_CONFIGS,
  SERVICE_RESILIENCE_CONFIGS,
  getResilienceConfig,
  getServiceConfig,
  mergeResilienceConfigs,
  validateResilienceConfig,
} from './resilience.config';
export type { ResilienceConfig } from './resilience.config';

// Middleware
export {
  ResilienceMiddleware,
  ResilienceErrorHandler,
  ResilienceMetricsCollector,
  createGlobalResilienceMiddleware,
} from './resilience.middleware';
export type { ResilienceRequestContext } from './resilience.middleware';

// Utilities
export { ResilientConnectorBase, ResilientConnectorRegistry } from './resilient-connector';
