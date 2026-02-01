import { Injectable, Logger } from '@nestjs/common';

export interface QueryProfile {
  query: string;
  executionTime: number; // milliseconds
  rowsReturned: number;
  rowsScanned: number;
  indexesUsed: string[];
  indexesMissed: string[];
  sortInfo: string;
  filterInfo: string;
  joined Tables: string[];
  subqueries: number;
  isPrepared: boolean;
  isCached: boolean;
}

export interface ExecutionPlan {
  type: string;
  relationName?: string;
  indexName?: string;
  nodeType: string;
  actualTime: number[];
  actualRows: number;
  actualLoops: number;
  estimatedStartupCost: number;
  estimatedTotalCost: number;
  plannedRows: number;
  children?: ExecutionPlan[];
}

export interface QueryOptimizationRecommendation {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  estimatedImprovement: number; // percentage
}

/**
 * Query Profiler & Analyzer
 *
 * Features:
 * - Query execution time analysis
 * - EXPLAIN ANALYZE parsing
 * - Index usage tracking
 * - N+1 query detection
 * - Query plan optimization suggestions
 */
@Injectable()
export class QueryProfilerService {
  private readonly logger = new Logger(QueryProfilerService.name);
  private profiles: Map<string, QueryProfile> = new Map();
  private slowQueryThreshold: number = 1000; // 1 second

  /**
   * Profile a query execution
   *
   * @example
   * const profile = await this.profileQuery(
   *   'SELECT * FROM properties WHERE suburb = $1',
   *   ['Sydney']
   * );
   */
  async profileQuery(query: string, params?: any[]): Promise<QueryProfile> {
    const startTime = Date.now();

    try {
      // Execute query
      const result = await this.executeQuery(query, params);

      const executionTime = Date.now() - startTime;
      const profile: QueryProfile = {
        query,
        executionTime,
        rowsReturned: result.rows?.length || 0,
        rowsScanned: result.rowCount || 0,
        indexesUsed: [],
        indexesMissed: [],
        sortInfo: '',
        filterInfo: '',
        joinedTables: [],
        subqueries: (query.match(/SELECT/gi) || []).length - 1,
        isPrepared: params !== undefined,
        isCached: false,
      };

      // Log if slow
      if (executionTime > this.slowQueryThreshold) {
        this.logger.warn(`Slow query detected: ${executionTime}ms - ${query}`);
      }

      return profile;
    } catch (error) {
      this.logger.error(`Query profiling failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get EXPLAIN ANALYZE execution plan
   *
   * @example
   * const plan = await this.getExecutionPlan('SELECT * FROM properties');
   */
  async getExecutionPlan(query: string): Promise<ExecutionPlan> {
    try {
      // Execute EXPLAIN ANALYZE
      const result = await this.executeQuery(`EXPLAIN (FORMAT JSON, ANALYZE TRUE) ${query}`);

      const plan = result.rows[0][0];
      return this.parseExecutionPlan(plan);
    } catch (error) {
      this.logger.error(`Failed to get execution plan: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse execution plan from EXPLAIN output
   */
  private parseExecutionPlan(plan: any): ExecutionPlan {
    return {
      type: plan['Node Type'] || 'Unknown',
      relationName: plan['Relation Name'],
      indexName: plan['Index Name'],
      nodeType: plan['Node Type'],
      actualTime: plan['Actual Total Time'] ? [plan['Actual Total Time']] : [0],
      actualRows: plan['Actual Rows'] || 0,
      actualLoops: plan['Actual Loops'] || 1,
      estimatedStartupCost: plan['Startup Cost'] || 0,
      estimatedTotalCost: plan['Total Cost'] || 0,
      plannedRows: plan['Rows'] || 0,
      children: plan['Plans']?.map((p: any) => this.parseExecutionPlan(p)),
    };
  }

  /**
   * Analyze query and provide optimization recommendations
   */
  async analyzeQuery(query: string): Promise<QueryOptimizationRecommendation[]> {
    const recommendations: QueryOptimizationRecommendation[] = [];
    const plan = await this.getExecutionPlan(query);

    // Check for sequential scans (no index)
    if (plan.type === 'Seq Scan' && query.includes('WHERE')) {
      recommendations.push({
        severity: 'critical',
        title: 'Missing Index',
        description: 'Query performs full table scan instead of using an index',
        recommendation: 'Add an index on the WHERE clause columns',
        estimatedImprovement: 50,
      });
    }

    // Check for nested loops
    if (plan.type === 'Nested Loop' && (plan.actualRows || 0) > 10000) {
      recommendations.push({
        severity: 'warning',
        title: 'Expensive Nested Loop',
        description: 'Nested loop join processed many rows',
        recommendation: 'Consider hash join or query restructuring',
        estimatedImprovement: 30,
      });
    }

    // Check for sorts
    if (plan.type === 'Sort' && (plan.actualRows || 0) > 1000) {
      recommendations.push({
        severity: 'warning',
        title: 'Large Sort Operation',
        description: 'Query sorts a large number of rows in memory',
        recommendation: 'Add index to support ORDER BY or reduce result set',
        estimatedImprovement: 20,
      });
    }

    // Check for SELECT *
    if (query.includes('SELECT *')) {
      recommendations.push({
        severity: 'info',
        title: 'SELECT * Usage',
        description: 'Query selects all columns instead of specific ones',
        recommendation: 'Specify only needed columns to reduce data transfer',
        estimatedImprovement: 10,
      });
    }

    // Check for LIMIT without ORDER BY
    if (query.includes('LIMIT') && !query.includes('ORDER BY')) {
      recommendations.push({
        severity: 'info',
        title: 'LIMIT Without ORDER BY',
        description: 'Results order is undefined',
        recommendation: 'Add ORDER BY for consistent results',
        estimatedImprovement: 5,
      });
    }

    return recommendations;
  }

  /**
   * Detect N+1 query patterns
   */
  detectNPlusOne(queries: string[]): boolean {
    const queryPatterns = queries.map((q) => q.replace(/\?/g, '').trim());

    // Count occurrences of each pattern
    const counts = new Map<string, number>();
    for (const pattern of queryPatterns) {
      counts.set(pattern, (counts.get(pattern) || 0) + 1);
    }

    // If same pattern executed many times, likely N+1
    for (const [, count] of counts) {
      if (count > 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get query statistics
   */
  getStatistics(): Record<string, any> {
    const profiles = Array.from(this.profiles.values());
    const slowQueries = profiles.filter((p) => p.executionTime > this.slowQueryThreshold);

    return {
      totalQueries: profiles.length,
      slowQueries: slowQueries.length,
      avgExecutionTime: profiles.reduce((sum, p) => sum + p.executionTime, 0) / profiles.length || 0,
      maxExecutionTime: Math.max(...profiles.map((p) => p.executionTime), 0),
      minExecutionTime: Math.min(...profiles.map((p) => p.executionTime), Infinity),
    };
  }

  /**
   * Execute query (placeholder - would use actual DB)
   */
  private async executeQuery(query: string, params?: any[]): Promise<any> {
    // Implementation would use actual database connection
    return { rows: [], rowCount: 0 };
  }
}

/**
 * Resource Monitor for dynamic allocation
 */
@Injectable()
export class ResourceMonitorService {
  private readonly logger = new Logger(ResourceMonitorService.name);
  private metrics: Map<string, number> = new Map();

  /**
   * Monitor CPU usage
   */
  getCPUUsage(): number {
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return (usage.user + usage.system) / 1000000; // Convert to percentage
    }
    return 0;
  }

  /**
   * Monitor memory usage
   */
  getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    usagePercent: number;
  } {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      usagePercent: (usage.heapUsed / usage.heapTotal) * 100,
    };
  }

  /**
   * Monitor event loop lag
   */
  monitorEventLoopLag(): number {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      this.metrics.set('eventLoopLag', lag);
    });
    return this.metrics.get('eventLoopLag') || 0;
  }

  /**
   * Check if resources are constrained
   */
  areResourcesConstrained(): boolean {
    const memUsage = this.getMemoryUsage();
    const cpuUsage = this.getCPUUsage();

    return memUsage.usagePercent > 80 || cpuUsage > 80;
  }

  /**
   * Get scaling recommendation
   */
  getScalingRecommendation(): {
    shouldScale: boolean;
    reason?: string;
    suggestedSize: string;
  } {
    const memUsage = this.getMemoryUsage();
    const cpuUsage = this.getCPUUsage();

    if (memUsage.usagePercent > 80 || cpuUsage > 80) {
      return {
        shouldScale: true,
        reason: `Memory: ${memUsage.usagePercent.toFixed(1)}%, CPU: ${cpuUsage.toFixed(1)}%`,
        suggestedSize: 'scale-up',
      };
    }

    if (memUsage.usagePercent < 30 && cpuUsage < 30) {
      return {
        shouldScale: true,
        reason: 'Resources underutilized',
        suggestedSize: 'scale-down',
      };
    }

    return { shouldScale: false };
  }

  /**
   * Get full resource status
   */
  getStatus(): Record<string, any> {
    const memUsage = this.getMemoryUsage();

    return {
      cpu: {
        usage: this.getCPUUsage(),
        threshold: 80,
      },
      memory: {
        heapUsed: memUsage.heapUsed.toFixed(2),
        heapTotal: memUsage.heapTotal.toFixed(2),
        usagePercent: memUsage.usagePercent.toFixed(2),
        threshold: 80,
      },
      eventLoopLag: this.monitorEventLoopLag(),
      constrained: this.areResourcesConstrained(),
      scaling: this.getScalingRecommendation(),
    };
  }
}
