import { Module } from '@nestjs/common';
import { PrometheusMetricsService } from './prometheus.metrics';
import { AlertingService } from './alerting.service';
import { MonitoringController } from './monitoring.controller';
import { MetricsInterceptor } from './metrics.interceptor';

/**
 * Monitoring Module
 *
 * Provides comprehensive monitoring capabilities:
 * - Prometheus metrics collection
 * - Alert management and notification
 * - Health checks and dashboards
 */
@Module({
  providers: [
    PrometheusMetricsService,
    AlertingService,
    MetricsInterceptor,
  ],
  controllers: [MonitoringController],
  exports: [
    PrometheusMetricsService,
    AlertingService,
    MetricsInterceptor,
  ],
})
export class MonitoringModule {}

export { PrometheusMetricsService } from './prometheus.metrics';
export { AlertingService, AlertRule, AlertEvent, AlertChannel } from './alerting.service';
export { MetricsInterceptor } from './metrics.interceptor';
export { MonitoringController } from './monitoring.controller';
