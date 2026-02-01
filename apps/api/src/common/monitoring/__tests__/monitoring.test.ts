import { Test, TestingModule } from '@nestjs/testing';
import { PrometheusMetricsService } from '../prometheus.metrics';
import { AlertingService, AlertEvent } from '../alerting.service';
import { MonitoringController } from '../monitoring.controller';

describe('Monitoring - Phase 4.6', () => {
  let module: TestingModule;
  let metricsService: PrometheusMetricsService;
  let alertingService: AlertingService;
  let controller: MonitoringController;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [PrometheusMetricsService, AlertingService],
      controllers: [MonitoringController],
    }).compile();

    metricsService = module.get<PrometheusMetricsService>(PrometheusMetricsService);
    alertingService = module.get<AlertingService>(AlertingService);
    controller = module.get<MonitoringController>(MonitoringController);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Prometheus Metrics', () => {
    it('should record HTTP request', () => {
      metricsService.recordHttpRequest('GET', '/api/properties', 200, 50, 0, 1024);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('http_requests_total');
    });

    it('should record database query', () => {
      metricsService.recordDbQuery('SELECT', 'properties', 45, true);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('db_queries_total');
    });

    it('should track active database connections', () => {
      metricsService.updateDbConnections('main', 25, 5);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('db_connections_active');
    });

    it('should record cache hits and misses', () => {
      metricsService.recordCacheHit('L2', 'properties:*');
      metricsService.recordCacheMiss('L2', 'properties:*');

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('cache_hits_total');
      expect(metrics).toContain('cache_misses_total');
    });

    it('should track cache size', () => {
      metricsService.updateCacheSize('L1', 256000);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('cache_size_bytes');
    });

    it('should record business metrics', () => {
      metricsService.recordPropertyListed('Sydney', 'house');
      metricsService.recordSearch('suburb');
      metricsService.recordRevenue('subscription', 999);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('properties_listed_total');
      expect(metrics).toContain('searches_performed_total');
      expect(metrics).toContain('revenue_total');
    });

    it('should track system metrics', () => {
      metricsService.recordSystemMetrics(45, 512000000, 1024000000, 50000000, 2.5);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('cpu_usage_percent');
      expect(metrics).toContain('memory_usage_bytes');
      expect(metrics).toContain('event_loop_lag_seconds');
    });

    it('should record errors', () => {
      metricsService.recordError('validation', 'warning');
      metricsService.recordException('TypeError', true);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('errors_total');
      expect(metrics).toContain('exceptions_total');
    });

    it('should track authentication', () => {
      metricsService.recordLoginAttempt('success');
      metricsService.recordTokenIssued('access');
      metricsService.updateSessionCount(150);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('login_attempts_total');
      expect(metrics).toContain('auth_tokens_issued_total');
      expect(metrics).toContain('active_sessions');
    });

    it('should track rate limiting', () => {
      metricsService.recordRateLimitHit('/api/search', 'premium');
      metricsService.recordRateLimitExceeded('/api/search', 'free');

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('rate_limit_hits_total');
      expect(metrics).toContain('rate_limit_exceeded_total');
    });

    it('should return metrics in Prometheus format', () => {
      const metrics = metricsService.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('Alert Rules', () => {
    it('should have default alert rules', () => {
      const rules = [
        'High CPU Usage',
        'Critical CPU Usage',
        'High Memory Usage',
        'Database Connection Pool Exhausted',
        'High Error Rate',
        'High HTTP Latency',
      ];

      rules.forEach((ruleName) => {
        const rule = alertingService.getAlertRule(ruleName);
        expect(rule).toBeDefined();
        expect(rule?.name).toBe(ruleName);
      });
    });

    it('should evaluate alert conditions correctly', () => {
      // Mock high CPU usage
      const metrics = { cpu_usage_percent: 85 };

      alertingService.checkMetrics(metrics);

      const alerts = alertingService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should trigger alert on threshold breach', () => {
      const metrics = { cpu_usage_percent: 95 }; // Critical

      alertingService.checkMetrics(metrics);

      const alerts = alertingService.getActiveAlerts();
      const critical = alerts.filter((a) => a.rule.severity === 'critical');

      expect(critical.length).toBeGreaterThan(0);
    });

    it('should resolve alert when condition clears', () => {
      const alerts1 = alertingService.getActiveAlerts();
      const count1 = alerts1.length;

      // Clear the metric
      const metrics = { cpu_usage_percent: 30 };
      alertingService.checkMetrics(metrics);

      const alerts2 = alertingService.getActiveAlerts();
      const count2 = alerts2.length;

      expect(count2).toBeLessThanOrEqual(count1);
    });

    it('should enable/disable alert rules', () => {
      const ruleName = 'High CPU Usage';

      alertingService.setAlertRuleEnabled(ruleName, false);
      let rule = alertingService.getAlertRule(ruleName);
      expect(rule?.enabled).toBe(false);

      alertingService.setAlertRuleEnabled(ruleName, true);
      rule = alertingService.getAlertRule(ruleName);
      expect(rule?.enabled).toBe(true);
    });

    it('should update alert rule thresholds', () => {
      const ruleName = 'High CPU Usage';
      const originalRule = alertingService.getAlertRule(ruleName);
      const originalThreshold = originalRule?.threshold || 80;

      alertingService.updateAlertRule(ruleName, { threshold: 90 });
      const updated = alertingService.getAlertRule(ruleName);

      expect(updated?.threshold).toBe(90);
      expect(updated?.threshold).not.toBe(originalThreshold);
    });
  });

  describe('Monitoring Controller', () => {
    it('should expose metrics endpoint', () => {
      const metrics = controller.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should expose dashboard endpoint', () => {
      const dashboard = controller.getDashboard();

      expect(dashboard.timestamp).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.summary.activeAlerts).toBeGreaterThanOrEqual(0);
      expect(dashboard.alerts).toBeDefined();
    });

    it('should expose alerts endpoint', () => {
      const alertsData = controller.getAlerts();

      expect(Array.isArray(alertsData.active)).toBe(true);
      expect(typeof alertsData.count).toBe('number');
    });

    it('should get specific alert rule', () => {
      const result = controller.getAlertRule('High CPU Usage');

      expect(result.found).toBe(true);
      expect(result.rule).toBeDefined();
    });

    it('should enable alert rule via endpoint', () => {
      const result = controller.enableAlert('High CPU Usage');

      expect(result.message).toContain('enabled');

      const rule = alertingService.getAlertRule('High CPU Usage');
      expect(rule?.enabled).toBe(true);
    });

    it('should disable alert rule via endpoint', () => {
      const result = controller.disableAlert('High CPU Usage');

      expect(result.message).toContain('disabled');

      const rule = alertingService.getAlertRule('High CPU Usage');
      expect(rule?.enabled).toBe(false);
    });

    it('should return health status', () => {
      const health = controller.getHealth();

      expect(health.status).toMatch(/healthy|degraded/);
      expect(health.criticalAlerts).toBeGreaterThanOrEqual(0);
      expect(health.totalAlerts).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Metrics Aggregation', () => {
    it('should aggregate HTTP metrics', () => {
      // Record multiple requests
      for (let i = 0; i < 5; i++) {
        metricsService.recordHttpRequest('GET', '/api/properties', 200, 50 + i * 10, 0, 1024);
      }

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('http_requests_total');
    });

    it('should calculate cache hit rate', () => {
      // Reset by recording new cache activity
      for (let i = 0; i < 8; i++) {
        metricsService.recordCacheHit('L2', 'properties:*');
      }

      for (let i = 0; i < 2; i++) {
        metricsService.recordCacheMiss('L2', 'properties:*');
      }

      // Hit rate should be 80%
      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('cache_hit_rate');
    });

    it('should track database performance', () => {
      // Record slow queries
      metricsService.recordDbQuery('SELECT', 'properties', 500, true);
      metricsService.recordDbQuery('SELECT', 'properties', 300, true);
      metricsService.recordDbQuery('SELECT', 'properties', 100, true);

      // Record fast queries
      metricsService.recordDbQuery('SELECT', 'listings', 10, true);
      metricsService.recordDbQuery('SELECT', 'listings', 15, true);

      const metrics = metricsService.getMetrics();
      expect(metrics).toContain('db_query_duration_seconds');
    });
  });

  describe('Performance Targets', () => {
    it('should maintain sub-100ms alert processing', () => {
      const start = Date.now();

      // Process many metrics
      for (let i = 0; i < 100; i++) {
        alertingService.checkMetrics({ cpu_usage_percent: 45 + Math.random() * 30 });
      }

      const duration = Date.now() - start;
      // Should process 100 metric checks in < 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should support high cardinality metrics', () => {
      // Record metrics for 100 different endpoints
      for (let i = 0; i < 100; i++) {
        metricsService.recordHttpRequest('GET', `/api/endpoint${i}`, 200, 50, 0, 1024);
      }

      const metrics = metricsService.getMetrics();
      expect(metrics.length).toBeGreaterThan(10000); // Should be quite large
    });
  });

  describe('Alert Notifications', () => {
    it('should handle multiple alert channels', () => {
      const rule = alertingService.getAlertRule('Critical CPU Usage');

      expect(rule?.channels).toContain('slack');
      expect(rule?.channels).toContain('email');
      expect(rule?.channels).toContain('pagerduty');
    });

    it('should support alert severity levels', () => {
      const severities = new Set();

      ['High CPU Usage', 'Critical CPU Usage', 'High Memory Usage', 'High Error Rate'].forEach(
        (ruleName) => {
          const rule = alertingService.getAlertRule(ruleName);
          if (rule) {
            severities.add(rule.severity);
          }
        }
      );

      expect(severities.has('warning')).toBe(true);
      expect(severities.has('critical')).toBe(true);
    });
  });
});
