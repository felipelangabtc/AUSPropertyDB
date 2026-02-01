import { Controller, Get, Post, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { BigQueryService, AnalyticsQuery } from './bigquery.service';
import { EventTrackingService, EventType, EventContext } from './event-tracking.service';
import { LookerService } from './looker.service';
import { ReportGenerationService, ReportConfig, ReportType, ReportFormat } from './report-generation.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@nestjs/common';

/**
 * Analytics Controller
 * Handles analytics queries, event tracking, reporting, and Looker integration
 */
@Controller('api/v1/analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private bigqueryService: BigQueryService,
    private eventTrackingService: EventTrackingService,
    private lookerService: LookerService,
    private reportGenerationService: ReportGenerationService
  ) {}

  /**
   * Get property analytics
   */
  @Get('properties/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  async getPropertyAnalytics(
    @Param('propertyId') propertyId: string,
    @Query('days') days: number = 30
  ): Promise<any> {
    this.logger.log(`Fetching analytics for property: ${propertyId}`);
    return this.bigqueryService.getPropertyAnalytics(propertyId, days);
  }

  /**
   * Get user analytics
   */
  @Get('users/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query('days') days: number = 30,
    @User() currentUser: any
  ): Promise<any> {
    // Users can only view their own analytics
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    this.logger.log(`Fetching analytics for user: ${userId}`);
    return this.bigqueryService.getUserAnalytics(userId, days);
  }

  /**
   * Get search analytics
   */
  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  async getSearchAnalytics(
    @Query('days') days: number = 30
  ): Promise<any> {
    this.logger.log('Fetching search analytics');
    return this.bigqueryService.getSearchAnalytics(days);
  }

  /**
   * Get conversion funnel
   */
  @Get('conversion-funnel')
  @UseGuards(AuthGuard('jwt'))
  async getConversionFunnel(
    @Query('days') days: number = 30
  ): Promise<any> {
    this.logger.log('Fetching conversion funnel analytics');
    return this.bigqueryService.getConversionFunnel(days);
  }

  /**
   * Get market insights
   */
  @Get('market-insights')
  @UseGuards(AuthGuard('jwt'))
  async getMarketInsights(
    @Query('location') location?: string,
    @Query('days') days: number = 30
  ): Promise<any> {
    this.logger.log('Fetching market insights');
    return this.bigqueryService.getMarketInsights(location, days);
  }

  /**
   * Execute custom query
   */
  @Post('query')
  @UseGuards(AuthGuard('jwt'))
  async executeQuery(
    @Body() queryData: AnalyticsQuery,
    @User() currentUser: any
  ): Promise<any> {
    // Only admins can execute custom queries
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    this.logger.log('Executing custom analytics query');
    return this.bigqueryService.executeQuery(queryData);
  }

  /**
   * Track event
   */
  @Post('events/track')
  async trackEvent(
    @Body() eventData: {
      eventType: EventType;
      data: Record<string, any>;
      context: EventContext;
      propertyId?: string;
    }
  ): Promise<{ success: boolean }> {
    try {
      await this.eventTrackingService.trackEvent(
        eventData.eventType,
        eventData.data,
        eventData.context,
        undefined,
        eventData.propertyId
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to track event', error);
      return { success: false };
    }
  }

  /**
   * Get event queue statistics
   */
  @Get('events/queue-stats')
  @UseGuards(AuthGuard('jwt'))
  async getEventQueueStats(): Promise<any> {
    return this.eventTrackingService.getQueueStats();
  }

  /**
   * Get Looker dashboards
   */
  @Get('dashboards')
  @UseGuards(AuthGuard('jwt'))
  async getDashboards(): Promise<any> {
    this.logger.log('Fetching Looker dashboards');
    return this.lookerService.getDashboards();
  }

  /**
   * Create property analytics dashboard
   */
  @Post('dashboards/property')
  @UseGuards(AuthGuard('jwt'))
  async createPropertyDashboard(
    @User() currentUser: any
  ): Promise<any> {
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    this.logger.log('Creating property analytics dashboard');
    return this.lookerService.createPropertyAnalyticsDashboard();
  }

  /**
   * Create user behavior dashboard
   */
  @Post('dashboards/user-behavior')
  @UseGuards(AuthGuard('jwt'))
  async createUserBehaviorDashboard(
    @User() currentUser: any
  ): Promise<any> {
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    this.logger.log('Creating user behavior dashboard');
    return this.lookerService.createUserBehaviorDashboard();
  }

  /**
   * Create market insights dashboard
   */
  @Post('dashboards/market-insights')
  @UseGuards(AuthGuard('jwt'))
  async createMarketDashboard(
    @User() currentUser: any
  ): Promise<any> {
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    this.logger.log('Creating market insights dashboard');
    return this.lookerService.createMarketInsightsDashboard();
  }

  /**
   * Get dashboard embed URL
   */
  @Get('dashboards/:dashboardId/embed')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardEmbedUrl(
    @Param('dashboardId') dashboardId: string,
    @Query('filters') filters?: string,
    @User() currentUser: any
  ): Promise<{ embedUrl: string }> {
    this.logger.log(`Getting embed URL for dashboard: ${dashboardId}`);

    const filterObj = filters ? JSON.parse(filters) : {};
    const embedUrl = await this.lookerService.getDashboardEmbedUrl(
      dashboardId,
      currentUser.id,
      filterObj
    );

    return { embedUrl };
  }

  /**
   * Generate report
   */
  @Post('reports')
  @UseGuards(AuthGuard('jwt'))
  async generateReport(
    @Body() reportConfig: {
      type: ReportType;
      format: ReportFormat;
      dateRange: { startDate: string; endDate: string };
      filters?: Record<string, any>;
    },
    @User() currentUser: any
  ): Promise<any> {
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    this.logger.log(`Generating ${reportConfig.type} report`);

    const config: ReportConfig = {
      ...reportConfig,
      dateRange: {
        startDate: new Date(reportConfig.dateRange.startDate),
        endDate: new Date(reportConfig.dateRange.endDate),
      },
    };

    return this.reportGenerationService.generateReport(config);
  }

  /**
   * Get property performance report
   */
  @Get('reports/property-performance')
  @UseGuards(AuthGuard('jwt'))
  async getPropertyPerformanceReport(
    @Query('format') format: ReportFormat = ReportFormat.JSON,
    @User() currentUser: any
  ): Promise<any> {
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return this.reportGenerationService.generateReport({
      type: ReportType.PROPERTY_PERFORMANCE,
      format,
      dateRange: { startDate, endDate },
    });
  }

  /**
   * Get user analytics report
   */
  @Get('reports/user-analytics')
  @UseGuards(AuthGuard('jwt'))
  async getUserAnalyticsReport(
    @Query('format') format: ReportFormat = ReportFormat.JSON,
    @User() currentUser: any
  ): Promise<any> {
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return this.reportGenerationService.generateReport({
      type: ReportType.USER_ANALYTICS,
      format,
      dateRange: { startDate, endDate },
    });
  }

  /**
   * Get market insights report
   */
  @Get('reports/market-insights')
  @UseGuards(AuthGuard('jwt'))
  async getMarketInsightsReport(
    @Query('format') format: ReportFormat = ReportFormat.JSON,
    @User() currentUser: any
  ): Promise<any> {
    if (currentUser.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return this.reportGenerationService.generateReport({
      type: ReportType.MARKET_INSIGHTS,
      format,
      dateRange: { startDate, endDate },
    });
  }

  /**
   * Health check
   */
  @Get('health')
  async healthCheck(): Promise<{
    bigquery: boolean;
    looker: boolean;
    eventTracking: boolean;
  }> {
    return {
      bigquery: await this.bigqueryService.healthCheck(),
      looker: await this.lookerService.healthCheck(),
      eventTracking: true, // Event tracking is always available
    };
  }
}
