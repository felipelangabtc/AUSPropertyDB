/**
 * Monitoring Module Index
 *
 * Exports all monitoring services, controllers, and utilities
 */

export { PrometheusMetricsService } from './prometheus.metrics';
export { AlertingService, AlertRule, AlertEvent, AlertChannel } from './alerting.service';
export { MonitoringController } from './monitoring.controller';
export { MetricsInterceptor } from './metrics.interceptor';
export { MonitoringModule } from './monitoring.module';

/**
 * Monitoring Services Registry
 */
export const MONITORING_SERVICES = ['PrometheusMetricsService', 'AlertingService'];

/**
 * Monitoring Middleware & Interceptors
 */
export const MONITORING_INTERCEPTORS = ['MetricsInterceptor'];

/**
 * Monitoring Controllers
 */
export const MONITORING_CONTROLLERS = ['MonitoringController'];

/**
 * Default Alert Rules
 */
export const DEFAULT_ALERT_RULES = [
  'High CPU Usage',
  'Critical CPU Usage',
  'High Memory Usage',
  'Database Connection Pool Exhausted',
  'High Error Rate',
  'High HTTP Latency',
  'High Database Query Time',
  'Low Cache Hit Rate',
  'Authentication Failures',
  'Event Loop Lag',
];

/**
 * Monitoring Configuration
 */
export const MONITORING_CONFIG = {
  metricsEnabled: true,
  alertingEnabled: true,
  scrapeInterval: 15, // seconds
  retentionDays: 15,
  maxCardinality: 10000,
  alertDurationMin: 30, // seconds
};
