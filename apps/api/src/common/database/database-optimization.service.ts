import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@aus-prop/db';

/**
 * Query Performance Analysis
 */
export interface QueryMetrics {
  query: string;
  duration: number;
  rowsAffected: number;
  indexUsed?: string;
  executionPlan?: string;
}

/**
 * Index Recommendation
 */
export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'SINGLE' | 'COMPOSITE' | 'PARTIAL';
  estimatedImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  statement: string;
}

/**
 * Database Optimization Service
 * Analyzes and recommends database optimizations
 */
@Injectable()
export class DatabaseOptimizationService {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze slow queries from PostgreSQL statistics
   * Requires pg_stat_statements extension
   */
  async analyzeSlowestQueries(limit: number = 20): Promise<QueryMetrics[]> {
    try {
      const queries = await this.prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          max_time,
          rows
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_time DESC
        LIMIT ${limit}
      `;

      return (queries as any[]).map((q) => ({
        query: q.query,
        duration: q.mean_time,
        rowsAffected: q.rows,
      }));
    } catch (error) {
      this.logger.error('Failed to analyze slow queries', error);
      return [];
    }
  }

  /**
   * Get query execution plan
   */
  async getExecutionPlan(query: string): Promise<any> {
    try {
      const plan = await this.prisma.$queryRawUnsafe(
        `EXPLAIN ANALYZE ${query}`,
      );

      return plan;
    } catch (error) {
      this.logger.error('Failed to get execution plan', error);
      return null;
    }
  }

  /**
   * Recommend indexes based on query patterns
   */
  async recommendIndexes(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    // Property searches - index on suburb and price
    recommendations.push({
      table: 'properties',
      columns: ['suburb', 'price'],
      type: 'COMPOSITE',
      estimatedImpact: 'HIGH',
      reason: 'Frequently used in search filters',
      statement: `CREATE INDEX idx_properties_suburb_price ON properties(suburb, price);`,
    });

    // Property coordinates for geo searches
    recommendations.push({
      table: 'properties',
      columns: ['latitude', 'longitude'],
      type: 'COMPOSITE',
      estimatedImpact: 'HIGH',
      reason: 'Used in geo-proximity searches',
      statement: `CREATE INDEX idx_properties_geo ON properties(latitude, longitude);`,
    });

    // Price history temporal queries
    recommendations.push({
      table: 'price_history',
      columns: ['property_id', 'created_at'],
      type: 'COMPOSITE',
      estimatedImpact: 'MEDIUM',
      reason: 'Used in time-series queries',
      statement: `CREATE INDEX idx_price_history_property_date ON price_history(property_id, created_at DESC);`,
    });

    // User searches by user_id
    recommendations.push({
      table: 'searches',
      columns: ['user_id', 'created_at'],
      type: 'COMPOSITE',
      estimatedImpact: 'MEDIUM',
      reason: 'User search history queries',
      statement: `CREATE INDEX idx_searches_user_date ON searches(user_id, created_at DESC);`,
    });

    // Listings by property_id
    recommendations.push({
      table: 'listings',
      columns: ['property_id', 'source'],
      type: 'COMPOSITE',
      estimatedImpact: 'MEDIUM',
      reason: 'Property detail lookups',
      statement: `CREATE INDEX idx_listings_property_source ON listings(property_id, source);`,
    });

    // Webhooks delivery tracking
    recommendations.push({
      table: 'webhook_deliveries',
      columns: ['webhook_id', 'status', 'created_at'],
      type: 'COMPOSITE',
      estimatedImpact: 'LOW',
      reason: 'Webhook status filtering',
      statement: `CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(webhook_id, status, created_at DESC);`,
    });

    // Alerts by user
    recommendations.push({
      table: 'alerts',
      columns: ['user_id', 'enabled', 'updated_at'],
      type: 'COMPOSITE',
      estimatedImpact: 'LOW',
      reason: 'Active alerts retrieval',
      statement: `CREATE INDEX idx_alerts_user_active ON alerts(user_id, enabled, updated_at DESC);`,
    });

    return recommendations;
  }

  /**
   * Analyze missing indexes
   */
  async analyzeMissingIndexes(): Promise<IndexRecommendation[]> {
    try {
      const missingIndexes = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY abs(correlation) DESC
        LIMIT 20
      `;

      return (missingIndexes as any[]).map((idx) => ({
        table: idx.tablename,
        columns: [idx.attname],
        type: 'SINGLE' as const,
        estimatedImpact: Math.abs(idx.correlation) > 0.8 ? 'HIGH' : 'MEDIUM',
        reason: `High correlation (${idx.correlation.toFixed(2)}) indicates index opportunity`,
        statement: `CREATE INDEX idx_${idx.tablename}_${idx.attname} ON ${idx.tablename}(${idx.attname});`,
      }));
    } catch (error) {
      this.logger.error('Failed to analyze missing indexes', error);
      return [];
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(): Promise<any[]> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY idx_scan DESC
      `;

      return stats as any[];
    } catch (error) {
      this.logger.error('Failed to get index usage stats', error);
      return [];
    }
  }

  /**
   * Identify unused indexes
   */
  async findUnusedIndexes(): Promise<any[]> {
    try {
      const unused = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexname NOT LIKE 'pg_toast%'
        ORDER BY pg_relation_size(indexrelid) DESC
      `;

      return unused as any[];
    } catch (error) {
      this.logger.error('Failed to find unused indexes', error);
      return [];
    }
  }

  /**
   * Analyze table statistics
   */
  async getTableStats(): Promise<any[]> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
        FROM pg_stat_user_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `;

      return stats as any[];
    } catch (error) {
      this.logger.error('Failed to get table stats', error);
      return [];
    }
  }

  /**
   * Identify tables that need VACUUM
   */
  async findTablesNeedingMaintenance(): Promise<any[]> {
    try {
      const tables = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          n_dead_tup as dead_rows,
          round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio,
          last_vacuum,
          last_autovacuum
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
        OR round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 10
        ORDER BY n_dead_tup DESC
      `;

      return tables as any[];
    } catch (error) {
      this.logger.error('Failed to find tables needing maintenance', error);
      return [];
    }
  }

  /**
   * Connection pool statistics
   */
  async getConnectionPoolStats(): Promise<any> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT 
          datname,
          numbackends as connections,
          pg_database.datconnlimit as max_connections
        FROM pg_stat_database
        JOIN pg_database ON pg_stat_database.datid = pg_database.oid
        WHERE datname NOT IN ('postgres', 'template0', 'template1')
      `;

      return stats;
    } catch (error) {
      this.logger.error('Failed to get connection pool stats', error);
      return [];
    }
  }

  /**
   * Analyze query complexity
   */
  analyzeQueryComplexity(executionPlan: any): {
    complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
    recommendations: string[];
  } {
    // This is a simplified analysis
    // In production, use more sophisticated query plan parsing

    const planStr = JSON.stringify(executionPlan || {});

    if (planStr.includes('SequentialScan')) {
      return {
        complexity: 'HIGH',
        reason: 'Uses sequential table scan (no index)',
        recommendations: [
          'Add appropriate index',
          'Consider composite index for filter columns',
        ],
      };
    }

    if (planStr.includes('Nested Loop')) {
      return {
        complexity: 'MEDIUM',
        reason: 'Uses nested loop join',
        recommendations: ['Consider hash join', 'Add index on join keys'],
      };
    }

    return {
      complexity: 'LOW',
      reason: 'Uses index efficiently',
      recommendations: [],
    };
  }

  /**
   * Generate optimization report
   */
  async generateOptimizationReport(): Promise<{
    timestamp: Date;
    slowQueries: QueryMetrics[];
    recommendations: IndexRecommendation[];
    tableStats: any[];
    maintenanceNeeded: any[];
    unusedIndexes: any[];
  }> {
    const [slowQueries, recommendations, tableStats, maintenanceNeeded, unusedIndexes] =
      await Promise.all([
        this.analyzeSlowestQueries(10),
        this.recommendIndexes(),
        this.getTableStats(),
        this.findTablesNeedingMaintenance(),
        this.findUnusedIndexes(),
      ]);

    return {
      timestamp: new Date(),
      slowQueries,
      recommendations,
      tableStats,
      maintenanceNeeded,
      unusedIndexes,
    };
  }
}
