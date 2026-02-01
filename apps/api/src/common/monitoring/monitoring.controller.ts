import { Controller, Get, Post, Put, Body, Param, HttpCode } from '@nestjs/common';
import { PrometheusMetricsService } from './prometheus.metrics';
import { AlertingService, AlertRule } from './alerting.service';

/**
 * Monitoring Controller
 *
 * Exposes metrics and alerting endpoints for:
 * - Prometheus scraping (/metrics)
 * - Custom dashboard queries (/dashboard)
 * - Alert management (/alerts)
 */
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly metricsService: PrometheusMetricsService,
    private readonly alertingService: AlertingService,
  ) {}

  /**
   * Prometheus metrics endpoint
   * Used by Prometheus for scraping
   *
   * GET /monitoring/metrics
   */
  @Get('metrics')
  getMetrics(): string {
    return this.metricsService.getMetrics();
  }

  /**
   * Metrics in JSON format
   * Used for custom dashboards
   *
   * GET /monitoring/metrics/json
   */
  @Get('metrics/json')
  getMetricsJson() {
    return this.metricsService.getMetricsJson();
  }

  /**
   * Dashboard data
   * Aggregated metrics for monitoring dashboard
   *
   * GET /monitoring/dashboard
   */
  @Get('dashboard')
  getDashboard() {
    return {
      timestamp: new Date(),
      summary: {
        activeAlerts: this.alertingService.getActiveAlerts().length,
        criticalAlerts: this.alertingService
          .getActiveAlerts()
          .filter((a) => a.rule.severity === 'critical').length,
        warningAlerts: this.alertingService
          .getActiveAlerts()
          .filter((a) => a.rule.severity === 'warning').length,
      },
      alerts: this.alertingService.getActiveAlerts(),
    };
  }

  /**
   * Get all active alerts
   *
   * GET /monitoring/alerts
   */
  @Get('alerts')
  getAlerts() {
    return {
      active: this.alertingService.getActiveAlerts(),
      count: this.alertingService.getActiveAlerts().length,
    };
  }

  /**
   * Get specific alert rule
   *
   * GET /monitoring/alerts/:name
   */
  @Get('alerts/:name')
  getAlertRule(@Param('name') name: string) {
    const rule = this.alertingService.getAlertRule(name);
    return {
      found: !!rule,
      rule,
    };
  }

  /**
   * Update alert rule
   *
   * PUT /monitoring/alerts/:name
   */
  @Put('alerts/:name')
  @HttpCode(200)
  updateAlertRule(@Param('name') name: string, @Body() update: Partial<AlertRule>) {
    this.alertingService.updateAlertRule(name, update);
    return {
      message: `Alert rule '${name}' updated`,
      rule: this.alertingService.getAlertRule(name),
    };
  }

  /**
   * Enable alert rule
   *
   * POST /monitoring/alerts/:name/enable
   */
  @Post('alerts/:name/enable')
  @HttpCode(200)
  enableAlert(@Param('name') name: string) {
    this.alertingService.setAlertRuleEnabled(name, true);
    return { message: `Alert '${name}' enabled` };
  }

  /**
   * Disable alert rule
   *
   * POST /monitoring/alerts/:name/disable
   */
  @Post('alerts/:name/disable')
  @HttpCode(200)
  disableAlert(@Param('name') name: string) {
    this.alertingService.setAlertRuleEnabled(name, false);
    return { message: `Alert '${name}' disabled` };
  }

  /**
   * Health check
   *
   * GET /monitoring/health
   */
  @Get('health')
  getHealth() {
    const alerts = this.alertingService.getActiveAlerts();
    const criticalCount = alerts.filter((a) => a.rule.severity === 'critical').length;

    return {
      status: criticalCount > 0 ? 'degraded' : 'healthy',
      criticalAlerts: criticalCount,
      totalAlerts: alerts.length,
      timestamp: new Date(),
    };
  }
}
