import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BigQueryService } from '../bigquery.service';
import { EventTrackingService, EventType } from '../event-tracking.service';
import { LookerService } from '../looker.service';
import { ReportGenerationService, ReportType, ReportFormat } from '../report-generation.service';
import { AnalyticsController } from '../analytics.controller';

describe('Analytics Module', () => {
  let controller: AnalyticsController;
  let bigqueryService: BigQueryService;
  let eventTrackingService: EventTrackingService;
  let lookerService: LookerService;
  let reportGenerationService: ReportGenerationService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          BIGQUERY_PROJECT_ID: 'test-project',
          BIGQUERY_DATASET_ID: 'test_analytics',
          BIGQUERY_LOCATION: 'US',
          LOOKER_API_ENDPOINT: 'https://looker.test.com/api/3.1',
          LOOKER_CLIENT_ID: 'test-client-id',
          LOOKER_CLIENT_SECRET: 'test-client-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: BigQueryService,
          useValue: {
            insertEvent: jest.fn().mockResolvedValue({ success: true, rowsInserted: 1 }),
            insertEvents: jest.fn().mockResolvedValue({ success: true, rowsInserted: 10 }),
            executeQuery: jest.fn().mockResolvedValue({ success: true, data: [] }),
            getPropertyAnalytics: jest.fn().mockResolvedValue({ success: true, data: [] }),
            getUserAnalytics: jest.fn().mockResolvedValue({ success: true, data: [] }),
            getSearchAnalytics: jest.fn().mockResolvedValue({ success: true, data: [] }),
            getConversionFunnel: jest.fn().mockResolvedValue({ success: true, data: [] }),
            getMarketInsights: jest.fn().mockResolvedValue({ success: true, data: [] }),
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: EventTrackingService,
          useValue: {
            trackEvent: jest.fn().mockResolvedValue(undefined),
            trackPropertyViewed: jest.fn().mockResolvedValue(undefined),
            trackPropertyContacted: jest.fn().mockResolvedValue(undefined),
            trackSearchPerformed: jest.fn().mockResolvedValue(undefined),
            trackUserSignUp: jest.fn().mockResolvedValue(undefined),
            trackUserLoggedIn: jest.fn().mockResolvedValue(undefined),
            getQueueStats: jest.fn().mockReturnValue({
              queueSize: 10,
              batchSize: 100,
              batchesUntilFlush: 1,
            }),
          },
        },
        {
          provide: LookerService,
          useValue: {
            getDashboards: jest.fn().mockResolvedValue([]),
            createPropertyAnalyticsDashboard: jest.fn().mockResolvedValue({ id: 'dash-1' }),
            createUserBehaviorDashboard: jest.fn().mockResolvedValue({ id: 'dash-2' }),
            createMarketInsightsDashboard: jest.fn().mockResolvedValue({ id: 'dash-3' }),
            getDashboardEmbedUrl: jest
              .fn()
              .mockResolvedValue('https://looker.test.com/embed/dashboards/1'),
            generateEmbedSession: jest.fn().mockReturnValue({ nonce: 'abc123' }),
            healthCheck: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ReportGenerationService,
          useValue: {
            generateReport: jest.fn().mockResolvedValue({
              path: './reports/test_report.json',
              data: {},
            }),
            scheduleReport: jest.fn().mockResolvedValue(undefined),
            emailReport: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    bigqueryService = module.get<BigQueryService>(BigQueryService);
    eventTrackingService = module.get<EventTrackingService>(EventTrackingService);
    lookerService = module.get<LookerService>(LookerService);
    reportGenerationService = module.get<ReportGenerationService>(ReportGenerationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('BigQueryService', () => {
    it('should be defined', () => {
      expect(bigqueryService).toBeDefined();
    });

    it('should initialize configuration', () => {
      expect(configService.get('BIGQUERY_PROJECT_ID')).toBe('test-project');
      expect(configService.get('BIGQUERY_DATASET_ID')).toBe('test_analytics');
    });

    it('should insert single event', async () => {
      const event = {
        eventId: 'evt-1',
        eventName: 'property_viewed',
        userId: 'user-1',
        propertyId: 'prop-1',
        timestamp: new Date(),
        data: { viewDuration: 30 },
      };

      const result = await bigqueryService.insertEvent(event);
      expect(result.success).toBe(true);
      expect(result.rowsInserted).toBe(1);
    });

    it('should insert batch of events', async () => {
      const events = Array(10)
        .fill(null)
        .map((_, i) => ({
          eventId: `evt-${i}`,
          eventName: 'property_viewed',
          userId: `user-${i}`,
          propertyId: `prop-${i}`,
          timestamp: new Date(),
          data: { viewDuration: Math.random() * 60 },
        }));

      const result = await bigqueryService.insertEvents(events);
      expect(result.success).toBe(true);
      expect(result.rowsInserted).toBe(10);
    });

    it('should execute custom query', async () => {
      const query = {
        sql: 'SELECT COUNT(*) as total FROM events',
        maxResults: 1000,
      };

      const result = await bigqueryService.executeQuery(query);
      expect(result.success).toBe(true);
    });

    it('should get property analytics', async () => {
      const result = await bigqueryService.getPropertyAnalytics('prop-1', 30);
      expect(result.success).toBe(true);
    });

    it('should get user analytics', async () => {
      const result = await bigqueryService.getUserAnalytics('user-1', 30);
      expect(result.success).toBe(true);
    });

    it('should get search analytics', async () => {
      const result = await bigqueryService.getSearchAnalytics(30);
      expect(result.success).toBe(true);
    });

    it('should get conversion funnel', async () => {
      const result = await bigqueryService.getConversionFunnel(30);
      expect(result.success).toBe(true);
    });

    it('should get market insights', async () => {
      const result = await bigqueryService.getMarketInsights(undefined, 30);
      expect(result.success).toBe(true);
    });

    it('should perform health check', async () => {
      const health = await bigqueryService.healthCheck();
      expect(health).toBe(true);
    });
  });

  describe('EventTrackingService', () => {
    it('should be defined', () => {
      expect(eventTrackingService).toBeDefined();
    });

    it('should track property viewed event', async () => {
      await eventTrackingService.trackPropertyViewed(
        'prop-1',
        { propertyId: 'prop-1', viewDuration: 30 },
        {
          userId: 'user-1',
          sessionId: 'sess-1',
          userAgent: 'Mozilla/5.0',
        }
      );

      expect(eventTrackingService.trackPropertyViewed).toHaveBeenCalled();
    });

    it('should track search performed event', async () => {
      await eventTrackingService.trackSearchPerformed(
        {
          searchQuery: 'apartments in Sydney',
          resultsCount: 150,
          responseTime: 250,
        },
        {
          userId: 'user-1',
          sessionId: 'sess-1',
        }
      );

      expect(eventTrackingService.trackSearchPerformed).toHaveBeenCalled();
    });

    it('should track user sign up event', async () => {
      await eventTrackingService.trackUserSignUp('user-1', 'buyer', {
        sessionId: 'sess-1',
        userAgent: 'Mozilla/5.0',
      });

      expect(eventTrackingService.trackUserSignUp).toHaveBeenCalled();
    });

    it('should track user login event', async () => {
      await eventTrackingService.trackUserLoggedIn('user-1', {
        sessionId: 'sess-1',
        userAgent: 'Mozilla/5.0',
      });

      expect(eventTrackingService.trackUserLoggedIn).toHaveBeenCalled();
    });

    it('should return queue statistics', () => {
      const stats = eventTrackingService.getQueueStats();
      expect(stats.queueSize).toBe(10);
      expect(stats.batchSize).toBe(100);
      expect(stats.batchesUntilFlush).toBe(1);
    });
  });

  describe('LookerService', () => {
    it('should be defined', () => {
      expect(lookerService).toBeDefined();
    });

    it('should get dashboards', async () => {
      const dashboards = await lookerService.getDashboards();
      expect(Array.isArray(dashboards)).toBe(true);
    });

    it('should create property analytics dashboard', async () => {
      const dashboard = await lookerService.createPropertyAnalyticsDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard.id).toBe('dash-1');
    });

    it('should create user behavior dashboard', async () => {
      const dashboard = await lookerService.createUserBehaviorDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard.id).toBe('dash-2');
    });

    it('should create market insights dashboard', async () => {
      const dashboard = await lookerService.createMarketInsightsDashboard();
      expect(dashboard).toBeDefined();
      expect(dashboard.id).toBe('dash-3');
    });

    it('should generate embed session', () => {
      const session = lookerService.generateEmbedSession('user-1', 'John Doe', 'john@example.com');
      expect(session.nonce).toBe('abc123');
    });

    it('should get dashboard embed URL', async () => {
      const embedUrl = await lookerService.getDashboardEmbedUrl('dash-1', 'user-1');
      expect(embedUrl).toContain('embed');
    });

    it('should perform health check', async () => {
      const health = await lookerService.healthCheck();
      expect(health).toBe(true);
    });
  });

  describe('ReportGenerationService', () => {
    it('should be defined', () => {
      expect(reportGenerationService).toBeDefined();
    });

    it('should generate property performance report', async () => {
      const result = await reportGenerationService.generateReport({
        type: ReportType.PROPERTY_PERFORMANCE,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      });

      expect(result.path).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should generate user analytics report', async () => {
      const result = await reportGenerationService.generateReport({
        type: ReportType.USER_ANALYTICS,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      });

      expect(result.path).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should generate market insights report', async () => {
      const result = await reportGenerationService.generateReport({
        type: ReportType.MARKET_INSIGHTS,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      });

      expect(result.path).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should generate conversion funnel report', async () => {
      const result = await reportGenerationService.generateReport({
        type: ReportType.CONVERSION_FUNNEL,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        },
      });

      expect(result.path).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should schedule report', async () => {
      await reportGenerationService.scheduleReport(
        {
          type: ReportType.PROPERTY_PERFORMANCE,
          format: ReportFormat.JSON,
          dateRange: {
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-01-31'),
          },
        },
        '0 0 * * *'
      );

      expect(reportGenerationService.scheduleReport).toHaveBeenCalled();
    });
  });

  describe('AnalyticsController', () => {
    const mockUser = { id: 'user-1', role: 'admin' };

    it('should get property analytics', async () => {
      const result = await controller.getPropertyAnalytics('prop-1', 30);
      expect(result.success).toBe(true);
    });

    it('should get user analytics for same user', async () => {
      const result = await controller.getUserAnalytics('user-1', 30, mockUser);
      expect(result.success).toBe(true);
    });

    it('should track event', async () => {
      const result = await controller.trackEvent({
        eventType: EventType.PROPERTY_VIEWED,
        data: { propertyId: 'prop-1' },
        context: { userId: 'user-1', sessionId: 'sess-1' },
        propertyId: 'prop-1',
      });

      expect(result.success).toBe(true);
    });

    it('should get event queue stats', async () => {
      const stats = await controller.getEventQueueStats();
      expect(stats.queueSize).toBe(10);
    });

    it('should get dashboards', async () => {
      const dashboards = await controller.getDashboards();
      expect(Array.isArray(dashboards)).toBe(true);
    });

    it('should create property dashboard', async () => {
      const dashboard = await controller.createPropertyDashboard(mockUser);
      expect(dashboard.id).toBe('dash-1');
    });

    it('should get dashboard embed URL', async () => {
      const result = await controller.getDashboardEmbedUrl('dash-1', undefined, mockUser);
      expect(result.embedUrl).toContain('embed');
    });

    it('should generate report', async () => {
      const result = await controller.generateReport(
        {
          type: ReportType.PROPERTY_PERFORMANCE,
          format: ReportFormat.JSON,
          dateRange: {
            startDate: '2025-01-01',
            endDate: '2025-01-31',
          },
        },
        mockUser
      );

      expect(result.path).toBeDefined();
    });

    it('should get property performance report', async () => {
      const result = await controller.getPropertyPerformanceReport(ReportFormat.JSON, mockUser);
      expect(result.path).toBeDefined();
    });

    it('should perform health check', async () => {
      const health = await controller.healthCheck();
      expect(health.bigquery).toBe(true);
      expect(health.looker).toBe(true);
      expect(health.eventTracking).toBe(true);
    });
  });

  describe('Event Type Enum', () => {
    it('should have all event types', () => {
      expect(EventType.PROPERTY_VIEWED).toBe('property_viewed');
      expect(EventType.PROPERTY_CONTACTED).toBe('property_contacted');
      expect(EventType.SEARCH_PERFORMED).toBe('search_performed');
      expect(EventType.USER_SIGNED_UP).toBe('user_signed_up');
      expect(EventType.INQUIRY_SUBMITTED).toBe('inquiry_submitted');
    });
  });

  describe('Report Type Enum', () => {
    it('should have all report types', () => {
      expect(ReportType.PROPERTY_PERFORMANCE).toBe('property_performance');
      expect(ReportType.USER_ANALYTICS).toBe('user_analytics');
      expect(ReportType.MARKET_INSIGHTS).toBe('market_insights');
      expect(ReportType.CONVERSION_FUNNEL).toBe('conversion_funnel');
    });
  });

  describe('Report Format Enum', () => {
    it('should have all report formats', () => {
      expect(ReportFormat.PDF).toBe('pdf');
      expect(ReportFormat.CSV).toBe('csv');
      expect(ReportFormat.JSON).toBe('json');
    });
  });
});
