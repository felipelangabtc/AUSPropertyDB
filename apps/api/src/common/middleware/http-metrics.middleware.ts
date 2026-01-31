import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest } from '@aus-prop/observability';
import { logger } from '@aus-prop/observability';

/**
 * HTTP Request tracking middleware for Prometheus metrics
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const method = req.method;
    const originalPath = req.originalUrl;

    // Extract route pattern (remove query strings and IDs)
    let route = req.route?.path || originalPath.split('?')[0];
    if (!route) {
      route = originalPath;
    }

    // Log incoming request
    logger.debug(`[${method}] ${originalPath}`);

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = (Date.now() - startTime) / 1000;
      const status = res.statusCode;

      recordHttpRequest(method, route, status, duration);

      logger.debug(`[${method}] ${originalPath} - ${status} (${duration.toFixed(3)}s)`);

      originalEnd.apply(res, args);
    };

    next();
  }
}
