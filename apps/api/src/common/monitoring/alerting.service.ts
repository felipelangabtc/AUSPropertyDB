import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as slackWebhook from '@slack/webhook';

/**
 * Alert Rules Definition
 */
export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  duration: number; // seconds
  enabled: boolean;
  channels: AlertChannel[];
}

/**
 * Alert Channel Types
 */
export type AlertChannel = 'email' | 'slack' | 'sms' | 'pagerduty' | 'log';

/**
 * Alert Event
 */
export interface AlertEvent {
  id: string;
  timestamp: Date;
  rule: AlertRule;
  value: number;
  message: string;
  status: 'triggered' | 'resolved';
}

/**
 * Alert Service
 *
 * Monitors metrics against defined rules and sends notifications
 * through multiple channels (email, Slack, SMS, PagerDuty, logs).
 */
@Injectable()
export class AlertingService {
  private logger = new Logger(AlertingService.name);
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private emailTransport: any;
  private slackClient: any;

  /**
   * Default alert rules
   */
  private readonly DEFAULT_RULES: AlertRule[] = [
    {
      name: 'High CPU Usage',
      metric: 'cpu_usage_percent',
      condition: 'gte',
      threshold: 80,
      severity: 'warning',
      duration: 60,
      enabled: true,
      channels: ['slack', 'email'],
    },
    {
      name: 'Critical CPU Usage',
      metric: 'cpu_usage_percent',
      condition: 'gte',
      threshold: 95,
      severity: 'critical',
      duration: 30,
      enabled: true,
      channels: ['slack', 'email', 'pagerduty'],
    },
    {
      name: 'High Memory Usage',
      metric: 'memory_usage_percent',
      condition: 'gte',
      threshold: 85,
      severity: 'warning',
      duration: 60,
      enabled: true,
      channels: ['slack', 'email'],
    },
    {
      name: 'Database Connection Pool Exhausted',
      metric: 'db_connections_active',
      condition: 'gte',
      threshold: 90,
      severity: 'critical',
      duration: 30,
      enabled: true,
      channels: ['slack', 'email', 'pagerduty'],
    },
    {
      name: 'High Error Rate',
      metric: 'errors_total',
      condition: 'gte',
      threshold: 10,
      severity: 'critical',
      duration: 60,
      enabled: true,
      channels: ['slack', 'email', 'pagerduty'],
    },
    {
      name: 'High HTTP Latency',
      metric: 'http_request_duration_seconds',
      condition: 'gte',
      threshold: 5,
      severity: 'warning',
      duration: 300,
      enabled: true,
      channels: ['slack', 'email'],
    },
    {
      name: 'High Database Query Time',
      metric: 'db_query_duration_seconds',
      condition: 'gte',
      threshold: 1,
      severity: 'warning',
      duration: 120,
      enabled: true,
      channels: ['slack'],
    },
    {
      name: 'Low Cache Hit Rate',
      metric: 'cache_hit_rate',
      condition: 'lte',
      threshold: 0.7,
      severity: 'warning',
      duration: 600,
      enabled: true,
      channels: ['email'],
    },
    {
      name: 'Authentication Failures',
      metric: 'login_attempts_total',
      condition: 'gte',
      threshold: 20,
      severity: 'critical',
      duration: 300,
      enabled: true,
      channels: ['slack', 'email', 'pagerduty'],
    },
    {
      name: 'Event Loop Lag',
      metric: 'event_loop_lag_seconds',
      condition: 'gte',
      threshold: 0.5,
      severity: 'warning',
      duration: 60,
      enabled: true,
      channels: ['slack'],
    },
  ];

  constructor() {
    this.initializeAlertRules();
    this.initializeTransports();
  }

  /**
   * Initialize alert rules
   */
  private initializeAlertRules() {
    this.DEFAULT_RULES.forEach((rule) => {
      this.alertRules.set(rule.name, rule);
    });
  }

  /**
   * Initialize notification transports
   */
  private initializeTransports() {
    // Email transport
    if (process.env.SMTP_HOST) {
      this.emailTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }

    // Slack transport
    if (process.env.SLACK_WEBHOOK_URL) {
      this.slackClient = new slackWebhook.IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
    }
  }

  /**
   * Check metrics against rules
   */
  checkMetrics(metrics: Record<string, number>) {
    this.alertRules.forEach((rule) => {
      if (!rule.enabled) return;

      const value = metrics[rule.metric];
      if (value === undefined) return;

      const triggered = this.evaluateCondition(value, rule.condition, rule.threshold);

      if (triggered) {
        this.triggerAlert(rule, value);
      } else {
        this.resolveAlert(rule);
      }
    });
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule, value: number) {
    const alertId = rule.name;
    const existing = this.activeAlerts.get(alertId);

    // Skip if already triggered
    if (existing && existing.status === 'triggered') {
      return;
    }

    const alert: AlertEvent = {
      id: `${alertId}-${Date.now()}`,
      timestamp: new Date(),
      rule,
      value,
      message: `${rule.name}: ${value} (threshold: ${rule.threshold})`,
      status: 'triggered',
    };

    this.activeAlerts.set(alertId, alert);

    // Send notifications
    await this.sendAlert(alert);

    this.logger.warn(`Alert triggered: ${alert.message}`);
  }

  /**
   * Resolve alert
   */
  private async resolveAlert(rule: AlertRule) {
    const alertId = rule.name;
    const alert = this.activeAlerts.get(alertId);

    if (!alert || alert.status === 'resolved') {
      return;
    }

    alert.status = 'resolved';
    await this.sendAlert({
      ...alert,
      message: `RESOLVED: ${alert.message}`,
    });

    this.activeAlerts.delete(alertId);
    this.logger.log(`Alert resolved: ${rule.name}`);
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: AlertEvent) {
    const promises = alert.rule.channels.map((channel) => {
      switch (channel) {
        case 'email':
          return this.sendEmailAlert(alert);
        case 'slack':
          return this.sendSlackAlert(alert);
        case 'sms':
          return this.sendSmsAlert(alert);
        case 'pagerduty':
          return this.sendPagerDutyAlert(alert);
        case 'log':
          return this.logAlert(alert);
        default:
          return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: AlertEvent) {
    if (!this.emailTransport) return;

    try {
      await this.emailTransport.sendMail({
        from: process.env.ALERT_EMAIL_FROM || 'alerts@example.com',
        to: process.env.ALERT_EMAIL_TO,
        subject: `[${alert.rule.severity.toUpperCase()}] ${alert.message}`,
        html: this.getEmailTemplate(alert),
      });

      this.logger.log(`Email alert sent: ${alert.rule.name}`);
    } catch (error) {
      this.logger.error('Failed to send email alert', error);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: AlertEvent) {
    if (!this.slackClient) return;

    try {
      const color = alert.rule.severity === 'critical' ? 'danger' : 'warning';

      await this.slackClient.send({
        attachments: [
          {
            color,
            title: alert.rule.name,
            text: alert.message,
            fields: [
              {
                title: 'Severity',
                value: alert.rule.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Value',
                value: String(alert.value),
                short: true,
              },
              {
                title: 'Threshold',
                value: String(alert.rule.threshold),
                short: true,
              },
              {
                title: 'Status',
                value: alert.status.toUpperCase(),
                short: true,
              },
            ],
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      });

      this.logger.log(`Slack alert sent: ${alert.rule.name}`);
    } catch (error) {
      this.logger.error('Failed to send Slack alert', error);
    }
  }

  /**
   * Send SMS alert (stub)
   */
  private async sendSmsAlert(alert: AlertEvent) {
    // Implementation would use Twilio or similar
    this.logger.log(`SMS alert would be sent: ${alert.rule.name}`);
  }

  /**
   * Send PagerDuty alert (stub)
   */
  private async sendPagerDutyAlert(alert: AlertEvent) {
    // Implementation would use PagerDuty API
    this.logger.log(`PagerDuty alert would be created: ${alert.rule.name}`);
  }

  /**
   * Log alert
   */
  private async logAlert(alert: AlertEvent) {
    this.logger.warn(`ALERT [${alert.rule.severity}]: ${alert.message}`);
  }

  /**
   * Get email template
   */
  private getEmailTemplate(alert: AlertEvent): string {
    return `
      <h2>${alert.rule.name}</h2>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Severity:</strong> ${alert.rule.severity.toUpperCase()}</p>
      <p><strong>Current Value:</strong> ${alert.value}</p>
      <p><strong>Threshold:</strong> ${alert.rule.threshold}</p>
      <p><strong>Status:</strong> ${alert.status}</p>
      <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
    `;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert rule
   */
  getAlertRule(name: string): AlertRule | undefined {
    return this.alertRules.get(name);
  }

  /**
   * Update alert rule
   */
  updateAlertRule(name: string, rule: Partial<AlertRule>) {
    const existing = this.alertRules.get(name);
    if (!existing) return;

    this.alertRules.set(name, { ...existing, ...rule });
  }

  /**
   * Enable/disable alert rule
   */
  setAlertRuleEnabled(name: string, enabled: boolean) {
    const rule = this.alertRules.get(name);
    if (rule) {
      rule.enabled = enabled;
    }
  }
}
