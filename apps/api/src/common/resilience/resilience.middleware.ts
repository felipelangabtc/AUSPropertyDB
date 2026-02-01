import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CircuitBreaker } from './circuit-breaker';
import { Bulkhead } from './bulkhead';
import { getTimeoutForRoute, timeoutTracker } from './timeout';

/**
 * Request Context with resilience tracking
 */
export interface ResilienceRequestContext {
  id: string;
  startTime: number;
  route: string;
  method: string;
  bulkhead?: string;
  circuitBreaker?: string;
  timeout: number;
  retryCount?: number;
}

/**
 * Resilience Middleware
 * Integrates all resilience patterns (Circuit Breaker, Bulkhead, Timeout)
 */
@Injectable()
export class ResilienceMiddleware implements NestMiddleware {
  constructor(
    private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map(),
    private readonly bulkheads: Map<string, Bulkhead> = new Map(),
  ) {}

  /**
   * Use middleware
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const context: ResilienceRequestContext = {
      id: this.generateRequestId(),
      startTime: Date.now(),
      route: req.path,
      method: req.method,
      timeout: getTimeoutForRoute(req.method, req.path),
    };

    // Attach context to request
    (req as any).resilience = context;

    // Override res.json to track response time
    const originalJson = res.json;
    res.json = function (data: any) {
      const duration = Date.now() - context.startTime;
      const route = `${context.method} ${context.route}`;

      // Track timeout
      timeoutTracker.recordRequest(route, duration);

      // Add resilience headers
      res.setHeader('X-Request-ID', context.id);
      res.setHeader('X-Response-Time', duration);
      res.setHeader('X-Request-Timeout', context.timeout);

      return originalJson.call(this, data);
    };

    // Set timeout for response
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(HttpStatus.REQUEST_TIMEOUT).json({
          statusCode: 408,
          message: 'Request timeout',
          requestId: context.id,
          timeout: context.timeout,
        });
      }
    }, context.timeout);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  }

  /**
   * Register circuit breaker for service
   */
  registerCircuitBreaker(name: string, breaker: CircuitBreaker): void {
    this.circuitBreakers.set(name, breaker);
  }

  /**
   * Register bulkhead for operation type
   */
  registerBulkhead(name: string, bulkhead: Bulkhead): void {
    this.bulkheads.set(name, bulkhead);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get resilience status
   */
  getStatus() {
    return {
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
        name,
        ...cb.getStatus(),
      })),
      bulkheads: Array.from(this.bulkheads.entries()).map(([name, bh]) => ({
        name,
        ...bh.getStatus(),
      })),
      timeoutStats: timeoutTracker.getAllStats(),
    };
  }
}

/**
 * Global resilience interceptor for all requests
 */
export function createGlobalResilienceMiddleware(
  circuitBreakers?: Map<string, CircuitBreaker>,
  bulkheads?: Map<string, Bulkhead>,
): ResilienceMiddleware {
  const middleware = new ResilienceMiddleware(circuitBreakers, bulkheads);
  return middleware;
}

/**
 * Error handler for resilience failures
 */
export class ResilienceErrorHandler {
  static handleCircuitBreakerOpen(serviceName: string): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: `Service ${serviceName} is temporarily unavailable`,
        error: 'CircuitBreakerOpen',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  static handleBulkheadFull(bulkheadName: string): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: `Too many requests for ${bulkheadName}. Please try again later.`,
        error: 'BulkheadFull',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  static handleTimeout(timeout: number): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: `Request exceeded timeout of ${timeout}ms`,
        error: 'Timeout',
      },
      HttpStatus.REQUEST_TIMEOUT,
    );
  }

  static handleRetryExhausted(attempts: number): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: `Failed after ${attempts} attempts`,
        error: 'RetryExhausted',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

/**
 * Request metrics collector for resilience monitoring
 */
export class ResilienceMetricsCollector {
  private readonly metrics: Map<string, any> = new Map();

  /**
   * Record request metrics
   */
  recordRequest(
    route: string,
    method: string,
    statusCode: number,
    duration: number,
    context: ResilienceRequestContext,
  ): void {
    const key = `${method} ${route}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        successes: 0,
        circuitBreakerTrips: 0,
        bulkheadRejections: 0,
        timeouts: 0,
      });
    }

    const stats = this.metrics.get(key)!;

    stats.count++;
    stats.totalTime += duration;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);

    if (statusCode >= 400) {
      stats.errors++;
    } else {
      stats.successes++;
    }

    // Track specific resilience failures
    if (statusCode === 503) {
      stats.circuitBreakerTrips++;
      stats.bulkheadRejections++;
    }

    if (statusCode === 408) {
      stats.timeouts++;
    }
  }

  /**
   * Get metrics for route
   */
  getMetrics(route?: string) {
    if (route) {
      return this.metrics.get(route);
    }

    const allMetrics: Record<string, any> = {};

    for (const [key, value] of this.metrics) {
      allMetrics[key] = {
        ...value,
        avgTime: value.count > 0 ? Math.round(value.totalTime / value.count) : 0,
        errorRate: value.count > 0 ? (value.errors / value.count * 100).toFixed(2) : 0,
      };
    }

    return allMetrics;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Get health status
   */
  getHealth() {
    let totalRequests = 0;
    let totalErrors = 0;
    let totalCircuitBreakerTrips = 0;

    for (const stats of this.metrics.values()) {
      totalRequests += stats.count;
      totalErrors += stats.errors;
      totalCircuitBreakerTrips += stats.circuitBreakerTrips;
    }

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    return {
      healthy: errorRate < 1 && totalCircuitBreakerTrips === 0,
      totalRequests,
      totalErrors,
      errorRate: errorRate.toFixed(2),
      circuitBreakerTrips: totalCircuitBreakerTrips,
    };
  }
}
