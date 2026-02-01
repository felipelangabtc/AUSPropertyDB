import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusMetricsService } from './prometheus.metrics';

/**
 * Metrics Interceptor
 *
 * Automatically records HTTP metrics:
 * - Request count and latency
 * - Response size
 * - Status codes
 * - Errors
 *
 * Applied globally to all HTTP endpoints
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(private readonly metricsService: PrometheusMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const method = request.method;
    const endpoint = request.path;
    const startTime = Date.now();

    // Get request size
    const reqSize = request.headers['content-length'] || 0;

    return next.handle().pipe(
      tap(
        (data) => {
          // Success path
          const duration = Date.now() - startTime;
          const status = response.statusCode || 200;
          const resSize = Buffer.byteLength(JSON.stringify(data));

          // Record metrics
          this.metricsService.recordHttpRequest(method, endpoint, status, duration, Number(reqSize), resSize);

          // Log slow requests
          if (duration > 1000) {
            this.logger.warn(
              `Slow request: ${method} ${endpoint} - ${duration}ms`,
            );
          }
        },
        (error) => {
          // Error path
          const duration = Date.now() - startTime;
          const status = response.statusCode || 500;

          // Record metrics for error
          this.metricsService.recordHttpRequest(method, endpoint, status, duration, Number(reqSize), 0);

          // Log error
          this.logger.error(
            `Request error: ${method} ${endpoint} - ${status} - ${error.message}`,
          );
        },
      ),
    );
  }
}
