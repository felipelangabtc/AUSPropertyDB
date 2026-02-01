import { Injectable, Logger } from '@nestjs/common';
import { BigQuery, Table, Dataset } from '@google-cloud/bigquery';
import { ConfigService } from '@nestjs/config';

/**
 * BigQuery Analytics Service
 * Handles data warehousing, analytics queries, and data export
 */
export interface BigQueryConfig {
  projectId: string;
  datasetId: string;
  keyPath?: string;
  location?: string;
}

export interface AnalyticsEvent {
  eventId: string;
  eventName: string;
  userId?: string;
  propertyId?: string;
  timestamp: Date;
  data: Record<string, any>;
  userProperties?: Record<string, any>;
}

export interface BigQueryResult {
  success: boolean;
  rowsInserted?: number;
  rowsSkipped?: number;
  error?: string;
  data?: any[];
}

export interface AnalyticsQuery {
  sql: string;
  parameters?: any[];
  maxResults?: number;
  useQueryCache?: boolean;
}

@Injectable()
export class BigQueryService {
  private readonly logger = new Logger(BigQueryService.name);
  private bigquery: BigQuery;
  private dataset: Dataset;
  private eventTable: Table;
  private config: BigQueryConfig;

  constructor(private configService: ConfigService) {
    this.initializeBigQuery();
  }

  /**
   * Initialize BigQuery client
   */
  private initializeBigQuery(): void {
    this.config = {
      projectId: this.configService.get('BIGQUERY_PROJECT_ID') || 'property-platform',
      datasetId: this.configService.get('BIGQUERY_DATASET_ID') || 'analytics',
      keyPath: this.configService.get('BIGQUERY_KEY_PATH'),
      location: this.configService.get('BIGQUERY_LOCATION') || 'US',
    };

    try {
      const options: any = {
        projectId: this.config.projectId,
        location: this.config.location,
      };

      if (this.config.keyPath) {
        options.keyFilename = this.config.keyPath;
      }

      this.bigquery = new BigQuery(options);
      this.dataset = this.bigquery.dataset(this.config.datasetId);
      this.eventTable = this.dataset.table('events');

      this.logger.log(`BigQuery initialized for project: ${this.config.projectId}`);
    } catch (error) {
      this.logger.error('Failed to initialize BigQuery', error);
      throw new Error('BigQuery initialization failed');
    }
  }

  /**
   * Create dataset if not exists
   */
  async ensureDataset(): Promise<boolean> {
    try {
      const [exists] = await this.dataset.exists();
      if (!exists) {
        await this.dataset.create({
          location: this.config.location,
          description: 'Analytics dataset for property platform',
        });
        this.logger.log(`Dataset ${this.config.datasetId} created`);
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to ensure dataset', error);
      return false;
    }
  }

  /**
   * Create events table with schema
   */
  async ensureEventTable(): Promise<boolean> {
    try {
      const [exists] = await this.eventTable.exists();
      if (!exists) {
        const schema = [
          { name: 'eventId', type: 'STRING', mode: 'REQUIRED' },
          { name: 'eventName', type: 'STRING', mode: 'REQUIRED' },
          { name: 'userId', type: 'STRING', mode: 'NULLABLE' },
          { name: 'propertyId', type: 'STRING', mode: 'NULLABLE' },
          { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
          { name: 'data', type: 'JSON', mode: 'NULLABLE' },
          { name: 'userProperties', type: 'JSON', mode: 'NULLABLE' },
          { name: 'insertedAt', type: 'TIMESTAMP', mode: 'REQUIRED' },
        ];

        await this.eventTable.create({
          schema,
          description: 'User and property analytics events',
          clustering: { fields: ['userId', 'propertyId', 'timestamp'] },
          timePartitioning: {
            type: 'DAY',
            field: 'timestamp',
            expirationMs: 90 * 24 * 60 * 60 * 1000, // 90 days
          },
        });

        this.logger.log('Events table created with schema');
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to ensure event table', error);
      return false;
    }
  }

  /**
   * Insert single event
   */
  async insertEvent(event: AnalyticsEvent): Promise<BigQueryResult> {
    try {
      await this.ensureDataset();
      await this.ensureEventTable();

      const row = {
        eventId: event.eventId,
        eventName: event.eventName,
        userId: event.userId || null,
        propertyId: event.propertyId || null,
        timestamp: event.timestamp,
        data: JSON.stringify(event.data),
        userProperties: event.userProperties ? JSON.stringify(event.userProperties) : null,
        insertedAt: new Date(),
      };

      await this.eventTable.insert(row);

      return {
        success: true,
        rowsInserted: 1,
      };
    } catch (error) {
      this.logger.error('Failed to insert event', error);
      return {
        success: false,
        rowsInserted: 0,
        error: error.message,
      };
    }
  }

  /**
   * Batch insert events
   */
  async insertEvents(events: AnalyticsEvent[]): Promise<BigQueryResult> {
    try {
      await this.ensureDataset();
      await this.ensureEventTable();

      const rows = events.map((event) => ({
        eventId: event.eventId,
        eventName: event.eventName,
        userId: event.userId || null,
        propertyId: event.propertyId || null,
        timestamp: event.timestamp,
        data: JSON.stringify(event.data),
        userProperties: event.userProperties ? JSON.stringify(event.userProperties) : null,
        insertedAt: new Date(),
      }));

      const result = await this.eventTable.insert(rows, { skipInvalidRows: true });

      return {
        success: true,
        rowsInserted: rows.length - (result[0]?.errors?.length || 0),
        rowsSkipped: result[0]?.errors?.length || 0,
      };
    } catch (error) {
      this.logger.error('Failed to insert events batch', error);
      return {
        success: false,
        rowsInserted: 0,
        error: error.message,
      };
    }
  }

  /**
   * Execute analytics query
   */
  async executeQuery(query: AnalyticsQuery): Promise<BigQueryResult> {
    try {
      const options = {
        query: query.sql,
        useQueryCache: query.useQueryCache !== false,
        maxResults: query.maxResults || 10000,
        location: this.config.location,
      };

      const [rows] = await this.bigquery.query(options);

      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      this.logger.error('Failed to execute query', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get property views analytics
   */
  async getPropertyAnalytics(propertyId: string, days: number = 30): Promise<any> {
    const sql = `
      SELECT
        COUNT(*) as total_views,
        COUNT(DISTINCT userId) as unique_viewers,
        COUNT(DISTINCT CASE WHEN eventName = 'property_contacted' THEN userId END) as contacts,
        COUNT(DISTINCT CASE WHEN eventName = 'property_shared' THEN userId END) as shares,
        AVG(CAST(JSON_VALUE(data, '$.viewDuration') AS INT64)) as avg_view_duration,
        ARRAY_AGG(DISTINCT JSON_VALUE(data, '$.source') IGNORE NULLS ORDER BY JSON_VALUE(data, '$.source') LIMIT 5) as top_sources
      FROM \`${this.config.projectId}.${this.config.datasetId}.events\`
      WHERE propertyId = @propertyId
        AND eventName IN ('property_viewed', 'property_contacted', 'property_shared')
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    `;

    return this.executeQuery({
      sql,
      parameters: [
        {
          name: 'propertyId',
          parameterType: { type: 'STRING' },
          parameterValue: { value: propertyId },
        },
        { name: 'days', parameterType: { type: 'INT64' }, parameterValue: { value: days } },
      ],
    });
  }

  /**
   * Get user behavior analytics
   */
  async getUserAnalytics(userId: string, days: number = 30): Promise<any> {
    const sql = `
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT propertyId) as properties_viewed,
        COUNT(DISTINCT CASE WHEN eventName = 'property_contacted' THEN propertyId END) as properties_contacted,
        COUNT(DISTINCT eventName) as unique_event_types,
        ARRAY_AGG(DISTINCT eventName ORDER BY eventName LIMIT 10) as event_types,
        MIN(timestamp) as first_activity,
        MAX(timestamp) as last_activity,
        TIMESTAMP_DIFF(MAX(timestamp), MIN(timestamp), HOUR) as engagement_hours
      FROM \`${this.config.projectId}.${this.config.datasetId}.events\`
      WHERE userId = @userId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    `;

    return this.executeQuery({
      sql,
      parameters: [
        { name: 'userId', parameterType: { type: 'STRING' }, parameterValue: { value: userId } },
        { name: 'days', parameterType: { type: 'INT64' }, parameterValue: { value: days } },
      ],
    });
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(days: number = 30): Promise<any> {
    const sql = `
      SELECT
        COUNT(*) as total_searches,
        COUNT(DISTINCT userId) as unique_searchers,
        AVG(CAST(JSON_VALUE(data, '$.resultsCount') AS INT64)) as avg_results,
        ARRAY_AGG(DISTINCT JSON_VALUE(data, '$.searchQuery') IGNORE NULLS ORDER BY JSON_VALUE(data, '$.searchQuery') LIMIT 20) as top_searches,
        APPROX_QUANTILES(CAST(JSON_VALUE(data, '$.responseTime') AS INT64), 100)[OFFSET(50)] as median_response_time
      FROM \`${this.config.projectId}.${this.config.datasetId}.events\`
      WHERE eventName = 'search_performed'
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    `;

    return this.executeQuery({
      sql,
      parameters: [
        { name: 'days', parameterType: { type: 'INT64' }, parameterValue: { value: days } },
      ],
    });
  }

  /**
   * Get conversion funnel analytics
   */
  async getConversionFunnel(days: number = 30): Promise<any> {
    const sql = `
      WITH user_events AS (
        SELECT
          userId,
          eventName,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY userId ORDER BY timestamp) as event_sequence
        FROM \`${this.config.projectId}.${this.config.datasetId}.events\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
      ),
      funnel_stages AS (
        SELECT
          'property_viewed' as stage,
          COUNT(DISTINCT CASE WHEN eventName = 'property_viewed' THEN userId END) as users
        FROM user_events
        UNION ALL
        SELECT
          'property_contacted' as stage,
          COUNT(DISTINCT CASE WHEN eventName = 'property_contacted' THEN userId END) as users
        FROM user_events
        UNION ALL
        SELECT
          'inquiry_submitted' as stage,
          COUNT(DISTINCT CASE WHEN eventName = 'inquiry_submitted' THEN userId END) as users
        FROM user_events
      )
      SELECT
        stage,
        users,
        ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY users DESC), 2) as conversion_rate
      FROM funnel_stages
      ORDER BY users DESC
    `;

    return this.executeQuery({
      sql,
      parameters: [
        { name: 'days', parameterType: { type: 'INT64' }, parameterValue: { value: days } },
      ],
    });
  }

  /**
   * Get market insights
   */
  async getMarketInsights(location?: string, days: number = 30): Promise<any> {
    let whereClause = `timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)`;
    const parameters = [
      { name: 'days', parameterType: { type: 'INT64' }, parameterValue: { value: days } },
    ];

    if (location) {
      whereClause += ` AND JSON_VALUE(data, '$.location') = @location`;
      parameters.push({
        name: 'location',
        parameterType: { type: 'STRING' },
        parameterValue: { value: location },
      });
    }

    const sql = `
      SELECT
        JSON_VALUE(data, '$.location') as location,
        COUNT(*) as total_events,
        COUNT(DISTINCT propertyId) as properties_searched,
        COUNT(DISTINCT userId) as unique_users,
        ROUND(AVG(CAST(JSON_VALUE(data, '$.avgPrice') AS INT64)), 2) as avg_price_searched,
        ROUND(AVG(CAST(JSON_VALUE(data, '$.avgBedrooms') AS FLOAT64)), 1) as avg_bedrooms_searched
      FROM \`${this.config.projectId}.${this.config.datasetId}.events\`
      WHERE ${whereClause}
        AND eventName IN ('search_performed', 'property_viewed')
      GROUP BY location
      ORDER BY total_events DESC
    `;

    return this.executeQuery({
      sql,
      parameters,
    });
  }

  /**
   * Export data to Cloud Storage
   */
  async exportToGCS(query: AnalyticsQuery, gcsUri: string): Promise<BigQueryResult> {
    try {
      const job = this.bigquery.createQueryJob({
        query: query.sql,
        destination: this.bigquery.dataset(this.config.datasetId).table('export_temp'),
        useQueryCache: query.useQueryCache !== false,
        location: this.config.location,
      });

      const [jobResponse] = await job;

      await jobResponse.getQueryResults();

      const extractJob = await this.bigquery
        .dataset(this.config.datasetId)
        .table('export_temp')
        .extract({ destination: gcsUri, format: 'NEWLINE_DELIMITED_JSON' });

      const [extractJobResponse] = await extractJob;
      await extractJobResponse.promise();

      this.logger.log(`Data exported to ${gcsUri}`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to export data', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const [datasets] = await this.bigquery.getDatasets();
      return datasets.length >= 0;
    } catch (error) {
      this.logger.error('BigQuery health check failed', error);
      return false;
    }
  }
}
