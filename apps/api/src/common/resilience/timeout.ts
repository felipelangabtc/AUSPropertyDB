import { createParamDecorator, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Timeout Configuration per Endpoint
 */
export const ENDPOINT_TIMEOUTS: Record<string, number> = {
  // Default
  'default': 30000, // 30 seconds

  // Search endpoints - slower due to external APIs
  'GET /search': 15000, // 15 seconds
  'POST /search': 15000,

  // Property endpoints
  'GET /properties': 10000, // 10 seconds
  'GET /properties/:id': 5000, // 5 seconds
  'POST /properties': 10000,
  'PATCH /properties/:id': 10000,

  // ML endpoints
  'POST /admin/ml/predict': 30000, // 30 seconds (batch operation)
  'POST /admin/ml/train': 60000, // 60 seconds (training)
  'POST /ml/predictions': 5000, // 5 seconds

  // Auth endpoints - fast
  'POST /auth/login': 5000,
  'POST /auth/register': 5000,
  'POST /auth/refresh': 3000,

  // Health checks - very fast
  'GET /health': 1000,
  'GET /health/db': 5000,
  'GET /health/redis': 5000,

  // Webhook delivery - moderate
  'POST /webhooks/deliver': 10000,

  // Admin endpoints - moderate
  'GET /admin/*': 10000,
  'POST /admin/*': 15000,
};

/**
 * Timeout decorator for endpoints
 * Usage: @Timeout(10000)
 */
export function Timeout(milliseconds: number) {
  return function (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if (descriptor && descriptor.value) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        return Promise.race([
          originalMethod.apply(this, args),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(
                new HttpException(
                  'Request timeout',
                  HttpStatus.REQUEST_TIMEOUT,
                ),
              ),
              milliseconds,
            ),
          ),
        ]);
      };
    }

    return descriptor;
  };
}

/**
 * Request timeout middleware
 * Applies configured timeout based on route pattern
 */
export function getTimeoutForRoute(method: string, path: string): number {
  const routePattern = `${method} ${path}`;

  // Check for exact match
  if (ENDPOINT_TIMEOUTS[routePattern]) {
    return ENDPOINT_TIMEOUTS[routePattern];
  }

  // Check for pattern match (with wildcards)
  for (const [pattern, timeout] of Object.entries(ENDPOINT_TIMEOUTS)) {
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\//g, '\\/')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '\\?');
      const regex = new RegExp(`^${regexPattern}$`);

      if (regex.test(routePattern)) {
        return timeout;
      }
    }
  }

  return ENDPOINT_TIMEOUTS['default'];
}

/**
 * Timeout tracking and monitoring
 */
export class TimeoutTracker {
  private readonly slowRequestThreshold = 5000; // Log if > 5s
  private requestTimes: Map<string, number[]> = new Map();

  /**
   * Record request duration
   */
  recordRequest(route: string, duration: number): void {
    if (!this.requestTimes.has(route)) {
      this.requestTimes.set(route, []);
    }

    const times = this.requestTimes.get(route)!;
    times.push(duration);

    // Keep last 100 samples
    if (times.length > 100) {
      times.shift();
    }

    // Log slow requests
    if (duration > this.slowRequestThreshold) {
      console.warn(`[SLOW REQUEST] ${route} took ${duration}ms`);
    }
  }

  /**
   * Get statistics for a route
   */
  getStats(route: string) {
    const times = this.requestTimes.get(route) || [];

    if (times.length === 0) {
      return null;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const count = times.length;
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / count);
    const min = sorted[0];
    const max = sorted[count - 1];
    const p50 = sorted[Math.floor(count * 0.5)];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return {
      count,
      avg,
      min,
      max,
      p50,
      p95,
      p99,
    };
  }

  /**
   * Get all statistics
   */
  getAllStats() {
    const stats: Record<string, any> = {};

    for (const [route, _] of this.requestTimes) {
      stats[route] = this.getStats(route);
    }

    return stats;
  }

  /**
   * Clear statistics
   */
  clear(): void {
    this.requestTimes.clear();
  }
}

// Global timeout tracker instance
export const timeoutTracker = new TimeoutTracker();

/**
 * HTTP Response Timeout Middleware
 * Ensures response is sent before configured timeout
 */
export function HttpTimeoutMiddleware(req: any, res: any, next: any) {
  const method = req.method;
  const path = req.path || req.originalUrl.split('?')[0];
  const timeout = getTimeoutForRoute(method, path);

  const startTime = Date.now();

  // Override res.end to track actual response time
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - startTime;
    timeoutTracker.recordRequest(`${method} ${path}`, duration);
    return originalEnd.apply(res, args);
  };

  // Set timeout
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        timeout: timeout,
        message: `Request exceeded timeout of ${timeout}ms`,
      });
    }
  }, timeout);

  // Clear timeout on response
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));

  next();
}
