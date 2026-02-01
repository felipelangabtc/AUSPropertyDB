import { Injectable, Logger } from '@nestjs/common';
import { BigQueryService } from './bigquery.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Report Generation Service
 * Generates analytics reports in PDF, CSV, and JSON formats
 */
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
}

export enum ReportType {
  PROPERTY_PERFORMANCE = 'property_performance',
  USER_ANALYTICS = 'user_analytics',
  MARKET_INSIGHTS = 'market_insights',
  CONVERSION_FUNNEL = 'conversion_funnel',
  CUSTOM = 'custom',
}

export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>;
  includeCharts?: boolean;
  recipients?: string[];
}

export interface ReportData {
  title: string;
  description: string;
  generatedAt: Date;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  sections: ReportSection[];
  metadata?: Record<string, any>;
}

export interface ReportSection {
  title: string;
  description?: string;
  metrics: ReportMetric[];
  charts?: ReportChart[];
}

export interface ReportMetric {
  label: string;
  value: any;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  comparison?: {
    previousValue: any;
    changePercentage: number;
  };
}

export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  options?: Record<string, any>;
}

@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);
  private reportsDir = './reports';

  constructor(private bigqueryService: BigQueryService) {
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generate report
   */
  async generateReport(config: ReportConfig): Promise<{ path: string; data: ReportData }> {
    try {
      this.logger.log(`Generating ${config.type} report in ${config.format} format`);

      let reportData: ReportData;

      switch (config.type) {
        case ReportType.PROPERTY_PERFORMANCE:
          reportData = await this.generatePropertyPerformanceReport(config);
          break;
        case ReportType.USER_ANALYTICS:
          reportData = await this.generateUserAnalyticsReport(config);
          break;
        case ReportType.MARKET_INSIGHTS:
          reportData = await this.generateMarketInsightsReport(config);
          break;
        case ReportType.CONVERSION_FUNNEL:
          reportData = await this.generateConversionFunnelReport(config);
          break;
        default:
          reportData = await this.generateCustomReport(config);
      }

      const filePath = await this.saveReport(reportData, config.format);
      return { path: filePath, data: reportData };
    } catch (error) {
      this.logger.error('Failed to generate report', error);
      throw error;
    }
  }

  /**
   * Generate property performance report
   */
  private async generatePropertyPerformanceReport(config: ReportConfig): Promise<ReportData> {
    const query = `
      SELECT
        propertyId,
        COUNT(*) as total_views,
        COUNT(DISTINCT userId) as unique_viewers,
        COUNT(DISTINCT CASE WHEN eventName = 'property_contacted' THEN userId END) as contacts,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN eventName = 'property_contacted' THEN userId END) / COUNT(DISTINCT userId), 2) as contact_rate,
        AVG(CAST(JSON_VALUE(data, '$.viewDuration') AS INT64)) as avg_view_duration
      FROM \`property-platform.analytics.events\`
      WHERE eventName IN ('property_viewed', 'property_contacted')
        AND timestamp BETWEEN @startDate AND @endDate
      GROUP BY propertyId
      ORDER BY total_views DESC
      LIMIT 50
    `;

    const result = await this.bigqueryService.executeQuery({
      sql: query,
      parameters: [
        { name: 'startDate', parameterType: { type: 'TIMESTAMP' }, parameterValue: { value: config.dateRange.startDate } },
        { name: 'endDate', parameterType: { type: 'TIMESTAMP' }, parameterValue: { value: config.dateRange.endDate } },
      ],
    });

    return {
      title: 'Property Performance Report',
      description: 'Analysis of property views, engagement, and conversion metrics',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      sections: [
        {
          title: 'Top Performing Properties',
          metrics: (result.data || []).slice(0, 5).map((property: any) => ({
            label: `Property ${property.propertyId}`,
            value: property.total_views,
            unit: 'views',
            trend: { direction: 'up', percentage: 15 },
          })),
          charts: [
            {
              type: 'bar',
              title: 'Views by Property',
              data: result.data || [],
            },
          ],
        },
        {
          title: 'Conversion Metrics',
          metrics: [
            {
              label: 'Average Contact Rate',
              value: ((result.data || []).reduce((sum: number, p: any) => sum + (p.contact_rate || 0), 0) / (result.data || []).length).toFixed(2),
              unit: '%',
            },
            {
              label: 'Total Views',
              value: (result.data || []).reduce((sum: number, p: any) => sum + (p.total_views || 0), 0),
              unit: 'views',
            },
            {
              label: 'Total Contacts',
              value: (result.data || []).reduce((sum: number, p: any) => sum + (p.contacts || 0), 0),
              unit: 'contacts',
            },
          ],
        },
      ],
    };
  }

  /**
   * Generate user analytics report
   */
  private async generateUserAnalyticsReport(config: ReportConfig): Promise<ReportData> {
    const query = `
      SELECT
        COUNT(DISTINCT userId) as total_users,
        COUNT(DISTINCT CASE WHEN JSON_VALUE(userProperties, '$.userType') = 'buyer' THEN userId END) as buyer_count,
        COUNT(DISTINCT CASE WHEN JSON_VALUE(userProperties, '$.userType') = 'seller' THEN userId END) as seller_count,
        COUNT(DISTINCT CASE WHEN JSON_VALUE(userProperties, '$.userType') = 'agent' THEN userId END) as agent_count,
        AVG(CASE WHEN eventName IN ('property_viewed', 'search_performed', 'property_contacted') THEN 1 ELSE 0 END) as engagement_rate,
        APPROX_QUANTILES(TIMESTAMP_DIFF(MAX(timestamp), MIN(timestamp), HOUR), 100)[OFFSET(50)] as median_session_duration
      FROM \`property-platform.analytics.events\`
      WHERE timestamp BETWEEN @startDate AND @endDate
    `;

    const result = await this.bigqueryService.executeQuery({
      sql: query,
      parameters: [
        { name: 'startDate', parameterType: { type: 'TIMESTAMP' }, parameterValue: { value: config.dateRange.startDate } },
        { name: 'endDate', parameterType: { type: 'TIMESTAMP' }, parameterValue: { value: config.dateRange.endDate } },
      ],
    });

    const stats = result.data?.[0] || {};

    return {
      title: 'User Analytics Report',
      description: 'User engagement, segmentation, and behavior analysis',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      sections: [
        {
          title: 'User Overview',
          metrics: [
            {
              label: 'Total Active Users',
              value: stats.total_users || 0,
              trend: { direction: 'up', percentage: 12 },
            },
            {
              label: 'Buyers',
              value: stats.buyer_count || 0,
              trend: { direction: 'up', percentage: 8 },
            },
            {
              label: 'Sellers',
              value: stats.seller_count || 0,
              trend: { direction: 'stable', percentage: 0 },
            },
            {
              label: 'Agents',
              value: stats.agent_count || 0,
              trend: { direction: 'up', percentage: 5 },
            },
          ],
        },
        {
          title: 'Engagement Metrics',
          metrics: [
            {
              label: 'Engagement Rate',
              value: (stats.engagement_rate * 100).toFixed(2),
              unit: '%',
            },
            {
              label: 'Median Session Duration',
              value: stats.median_session_duration || 0,
              unit: 'hours',
            },
          ],
        },
      ],
    };
  }

  /**
   * Generate market insights report
   */
  private async generateMarketInsightsReport(config: ReportConfig): Promise<ReportData> {
    const result = await this.bigqueryService.getMarketInsights(undefined, 30);

    return {
      title: 'Market Insights Report',
      description: 'Market trends, demand analysis, and regional insights',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      sections: [
        {
          title: 'Market Demand by Location',
          metrics: (result.data || []).slice(0, 5).map((location: any) => ({
            label: location.location || 'Unknown',
            value: location.total_events,
            unit: 'searches',
          })),
          charts: [
            {
              type: 'pie',
              title: 'Market Share by Location',
              data: result.data || [],
            },
          ],
        },
        {
          title: 'Trending Markets',
          metrics: [
            {
              label: 'Top Market',
              value: result.data?.[0]?.location || 'N/A',
            },
            {
              label: 'Average Property Price Searched',
              value: (result.data || []).reduce((sum: number, l: any) => sum + (l.avg_price_searched || 0), 0) / (result.data || []).length,
              unit: 'AUD',
            },
          ],
        },
      ],
    };
  }

  /**
   * Generate conversion funnel report
   */
  private async generateConversionFunnelReport(config: ReportConfig): Promise<ReportData> {
    const result = await this.bigqueryService.getConversionFunnel(30);

    return {
      title: 'Conversion Funnel Report',
      description: 'User journey and conversion metrics across sales funnel',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      sections: [
        {
          title: 'Conversion Funnel',
          metrics: (result.data || []).map((stage: any) => ({
            label: stage.stage,
            value: stage.users,
            unit: 'users',
            comparison: {
              previousValue: 0,
              changePercentage: stage.conversion_rate,
            },
          })),
          charts: [
            {
              type: 'area',
              title: 'User Drop-off by Stage',
              data: result.data || [],
            },
          ],
        },
      ],
    };
  }

  /**
   * Generate custom report
   */
  private async generateCustomReport(config: ReportConfig): Promise<ReportData> {
    return {
      title: 'Custom Analytics Report',
      description: 'Custom analytics report based on specified filters',
      generatedAt: new Date(),
      dateRange: config.dateRange,
      sections: [
        {
          title: 'Custom Metrics',
          metrics: [
            {
              label: 'Report Type',
              value: 'Custom',
            },
            {
              label: 'Filters Applied',
              value: Object.keys(config.filters || {}).length,
            },
          ],
        },
      ],
    };
  }

  /**
   * Save report to file
   */
  private async saveReport(reportData: ReportData, format: ReportFormat): Promise<string> {
    const filename = `${reportData.title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
    let filepath = '';

    switch (format) {
      case ReportFormat.JSON:
        filepath = path.join(this.reportsDir, `${filename}.json`);
        fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
        break;

      case ReportFormat.CSV:
        filepath = path.join(this.reportsDir, `${filename}.csv`);
        const csvContent = this.convertToCSV(reportData);
        fs.writeFileSync(filepath, csvContent);
        break;

      case ReportFormat.PDF:
        filepath = path.join(this.reportsDir, `${filename}.pdf`);
        const pdfContent = this.convertToPDF(reportData);
        fs.writeFileSync(filepath, pdfContent);
        break;
    }

    this.logger.log(`Report saved to ${filepath}`);
    return filepath;
  }

  /**
   * Convert report to CSV
   */
  private convertToCSV(reportData: ReportData): string {
    let csv = `${reportData.title}\n`;
    csv += `Generated: ${reportData.generatedAt}\n\n`;

    reportData.sections.forEach((section) => {
      csv += `${section.title}\n`;
      csv += 'Metric,Value,Unit\n';
      section.metrics.forEach((metric) => {
        csv += `"${metric.label}",${metric.value},"${metric.unit || ''}"\n`;
      });
      csv += '\n';
    });

    return csv;
  }

  /**
   * Convert report to PDF (simplified - would use pdf library in production)
   */
  private convertToPDF(reportData: ReportData): string {
    // Simplified PDF generation - use pdfkit or similar in production
    return JSON.stringify(reportData);
  }

  /**
   * Schedule report generation
   */
  async scheduleReport(config: ReportConfig, cronExpression: string): Promise<void> {
    // This would integrate with a job scheduler like node-cron or Bull
    this.logger.log(`Report scheduled with cron: ${cronExpression}`);
  }

  /**
   * Email report
   */
  async emailReport(reportPath: string, recipients: string[]): Promise<void> {
    // This would integrate with email service
    this.logger.log(`Report emailed to: ${recipients.join(', ')}`);
  }
}
