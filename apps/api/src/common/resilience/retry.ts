import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';

/**
 * Retry Policy Configuration
 */
export interface RetryPolicyConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
}

/**
 * Default retry policies for different scenarios
 */
export const DEFAULT_RETRY_POLICIES = {
  // Fast retries for transient errors
  FAST: {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },

  // Standard retries with backoff
  STANDARD: {
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },

  // Aggressive retries for critical operations
  AGGRESSIVE: {
    maxRetries: 10,
    initialDelayMs: 200,
    maxDelayMs: 30000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.2,
  },

  // No retries
  NONE: {
    maxRetries: 0,
  },
};

/**
 * Exponential backoff with jitter
 */
export function calculateBackoffDelay(
  retryCount: number,
  config: RetryPolicyConfig,
): number {
  const { initialDelayMs = 500, maxDelayMs = 10000, backoffMultiplier = 2, jitterFactor = 0.1 } = config;

  // Calculate base delay
  const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, retryCount);
  const cappedDelay = Math.min(baseDelay, maxDelayMs);

  // Add jitter
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);

  return Math.max(0, cappedDelay + jitter);
}

/**
 * Retry interceptor for HTTP requests
 */
@Injectable()
export class RetryInterceptor {
  /**
   * Create axios instance with retry policy
   */
  static createAxiosInstance(config?: RetryPolicyConfig & { baseURL?: string }): AxiosInstance {
    const retryConfig = {
      ...DEFAULT_RETRY_POLICIES.STANDARD,
      ...config,
    };

    const instance = axios.create({
      baseURL: config?.baseURL,
      timeout: 30000,
    });

    // Apply retry logic with custom backoff
    axiosRetry(instance, {
      retries: retryConfig.maxRetries || 5,
      retryDelay: (retryCount) => {
        return calculateBackoffDelay(retryCount, retryConfig);
      },
      retryCondition: (error: AxiosError) => {
        // Retry on network errors
        if (isNetworkOrIdempotentRequestError(error)) {
          return true;
        }

        // Retry on specific status codes
        const status = error.response?.status;
        if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
          return true;
        }

        return false;
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(
          `[RETRY] Attempt ${retryCount} for ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`,
          {
            status: error.response?.status,
            error: error.message,
          },
        );
      },
    });

    return instance;
  }

  /**
   * Execute request with custom retry logic
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryPolicyConfig = DEFAULT_RETRY_POLICIES.STANDARD,
  ): Promise<T> {
    const { maxRetries = 5 } = config;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry if it's a non-retryable error
        if (error instanceof HttpException) {
          throw error;
        }

        // Last attempt, throw
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay and wait
        const delay = calculateBackoffDelay(attempt, config);
        console.warn(`[RETRY] Waiting ${delay}ms before retry`, {
          attempt: attempt + 1,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Get request metadata including retry info
   */
  static getRequestMetadata(error?: AxiosError): Record<string, any> {
    return {
      statusCode: error?.response?.status,
      statusText: error?.response?.statusText,
      headers: error?.response?.headers,
      retryable: isNetworkOrIdempotentRequestError(error),
    };
  }
}

/**
 * Retry decorator for methods
 */
export function WithRetry(config: RetryPolicyConfig = DEFAULT_RETRY_POLICIES.STANDARD) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return RetryInterceptor.executeWithRetry(
        () => originalMethod.apply(this, args),
        config,
      );
    };

    return descriptor;
  };
}

/**
 * Circuit breaker aware retry logic
 */
export class CircuitBreakerRetryStrategy {
  constructor(
    private readonly circuitBreaker: any, // CircuitBreaker instance
    private readonly retryPolicy: RetryPolicyConfig = DEFAULT_RETRY_POLICIES.STANDARD,
  ) {}

  /**
   * Execute request with circuit breaker and retry
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit breaker state
    if (this.circuitBreaker.isOpen()) {
      // Try to recover if half-open
      if (this.circuitBreaker.isHalfOpen()) {
        try {
          const result = await RetryInterceptor.executeWithRetry(
            fn,
            { maxRetries: 1, ...this.retryPolicy },
          );

          // Success, close circuit
          this.circuitBreaker.close();

          return result;
        } catch (error) {
          // Failed recovery, open circuit again
          this.circuitBreaker.open();
          throw error;
        }
      }

      // Circuit open, reject immediately
      throw new HttpException(
        'Service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      return await RetryInterceptor.executeWithRetry(fn, this.retryPolicy);
    } catch (error) {
      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * Execute with metrics
   */
  async executeWithMetrics<T>(
    fn: () => Promise<T>,
    onMetrics?: (metrics: Record<string, any>) => void,
  ): Promise<T> {
    const startTime = Date.now();
    let attemptCount = 0;
    let lastError: Error | null = null;

    const metricsWrapper = async () => {
      attemptCount++;

      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        throw error;
      }
    };

    try {
      const result = await this.execute(metricsWrapper);

      onMetrics?.({
        success: true,
        durationMs: Date.now() - startTime,
        attempts: attemptCount,
        circuitState: this.circuitBreaker.getState(),
      });

      return result;
    } catch (error) {
      onMetrics?.({
        success: false,
        durationMs: Date.now() - startTime,
        attempts: attemptCount,
        error: lastError?.message,
        circuitState: this.circuitBreaker.getState(),
      });

      throw error;
    }
  }
}
