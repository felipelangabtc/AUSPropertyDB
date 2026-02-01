/**
 * Connection Pool Configuration for PostgreSQL
 * Optimizes connection management and performance
 */

export interface PoolConfig {
  min: number; // Minimum connections
  max: number; // Maximum connections
  idleTimeout: number; // Idle connection timeout (ms)
  acquireTimeout: number; // Time to acquire connection (ms)
  reapInterval: number; // Reap interval (ms)
}

/**
 * Environment-specific pool configurations
 */
export const POOL_CONFIGS = {
  development: {
    min: 2,
    max: 5,
    idleTimeout: 30000,
    acquireTimeout: 10000,
    reapInterval: 10000,
  },

  testing: {
    min: 1,
    max: 5,
    idleTimeout: 5000,
    acquireTimeout: 5000,
    reapInterval: 5000,
  },

  production: {
    min: 5,
    max: 20,
    idleTimeout: 60000,
    acquireTimeout: 30000,
    reapInterval: 15000,
  },

  // High-load production environment
  'production-high-load': {
    min: 10,
    max: 40,
    idleTimeout: 90000,
    acquireTimeout: 60000,
    reapInterval: 20000,
  },
};

/**
 * Connection pool monitoring and management
 */
export interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  utilizationPercent: number;
  avgWaitTime: number;
  maxWaitTime: number;
  connectionsCreated: number;
  connectionsDestroyed: number;
  connectionErrors: number;
}

/**
 * Connection pool configuration builder
 */
export class PoolConfigurationBuilder {
  /**
   * Get recommended pool size based on CPU cores
   */
  static getRecommendedPoolSize(cpuCores: number = 4): number {
    // Formula: (core_count * 2) + effective_spindle_count
    // For SSD: typically (cores * 2) + 1
    return cpuCores * 2 + 1;
  }

  /**
   * Get pool config for environment
   */
  static getConfig(environment: string = process.env.NODE_ENV || 'development'): PoolConfig {
    return POOL_CONFIGS[environment as keyof typeof POOL_CONFIGS] || POOL_CONFIGS.development;
  }

  /**
   * Build custom pool configuration
   */
  static buildCustomConfig(overrides: Partial<PoolConfig> & { cpuCores?: number }): PoolConfig {
    const base = POOL_CONFIGS.production;
    const cpuCores = overrides.cpuCores || 4;

    return {
      min: overrides.min ?? base.min,
      max: overrides.max ?? this.getRecommendedPoolSize(cpuCores),
      idleTimeout: overrides.idleTimeout ?? base.idleTimeout,
      acquireTimeout: overrides.acquireTimeout ?? base.acquireTimeout,
      reapInterval: overrides.reapInterval ?? base.reapInterval,
    };
  }

  /**
   * Validate pool configuration
   */
  static validateConfig(config: PoolConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.min <= 0) {
      errors.push('min must be > 0');
    }

    if (config.max <= 0) {
      errors.push('max must be > 0');
    }

    if (config.min > config.max) {
      errors.push('min must be <= max');
    }

    if (config.idleTimeout <= 0) {
      errors.push('idleTimeout must be > 0');
    }

    if (config.acquireTimeout <= 0) {
      errors.push('acquireTimeout must be > 0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Connection pool monitoring
 */
export class PoolMonitor {
  private metrics: PoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    utilizationPercent: 0,
    avgWaitTime: 0,
    maxWaitTime: 0,
    connectionsCreated: 0,
    connectionsDestroyed: 0,
    connectionErrors: 0,
  };

  /**
   * Update metrics
   */
  updateMetrics(
    active: number,
    idle: number,
    waiting: number = 0,
    avgWaitMs: number = 0,
    maxWaitMs: number = 0
  ): void {
    this.metrics.activeConnections = active;
    this.metrics.idleConnections = idle;
    this.metrics.totalConnections = active + idle;
    this.metrics.waitingRequests = waiting;
    this.metrics.avgWaitTime = avgWaitMs;
    this.metrics.maxWaitTime = maxWaitMs;
    this.metrics.utilizationPercent =
      this.metrics.totalConnections > 0 ? (active / this.metrics.totalConnections) * 100 : 0;
  }

  /**
   * Record connection created
   */
  recordConnectionCreated(): void {
    this.metrics.connectionsCreated++;
  }

  /**
   * Record connection destroyed
   */
  recordConnectionDestroyed(): void {
    this.metrics.connectionsDestroyed++;
  }

  /**
   * Record connection error
   */
  recordConnectionError(): void {
    this.metrics.connectionErrors++;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Check pool health
   */
  isHealthy(config: PoolConfig): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    // If utilization is too high
    if (this.metrics.utilizationPercent > 90) {
      issues.push('Pool utilization > 90%, consider increasing max connections');
    }

    // If there are waiting requests
    if (this.metrics.waitingRequests > config.max * 0.5) {
      issues.push('Many waiting requests, pool might be undersized');
    }

    // If avg wait time is high
    if (this.metrics.avgWaitTime > config.acquireTimeout * 0.5) {
      issues.push('High average wait time, pool contention detected');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      utilizationPercent: 0,
      avgWaitTime: 0,
      maxWaitTime: 0,
      connectionsCreated: 0,
      connectionsDestroyed: 0,
      connectionErrors: 0,
    };
  }
}

/**
 * Connection pool recommendations
 */
export class PoolRecommendations {
  /**
   * Generate recommendations based on metrics and config
   */
  static generateRecommendations(config: PoolConfig, metrics: PoolMetrics): string[] {
    const recommendations: string[] = [];

    // Check if pool size is appropriate
    if (metrics.utilizationPercent > 80) {
      recommendations.push(
        `Increase max pool size from ${config.max} to ${Math.ceil(config.max * 1.5)}`
      );
    }

    if (metrics.utilizationPercent < 20 && config.max > config.min * 2) {
      recommendations.push(
        `Reduce max pool size from ${config.max} to ${Math.ceil(config.max * 0.7)} to save resources`
      );
    }

    // Check idle timeout
    if (metrics.idleConnections > config.max * 0.7) {
      recommendations.push(
        `Many idle connections, consider reducing idleTimeout from ${config.idleTimeout}ms`
      );
    }

    // Check wait times
    if (metrics.avgWaitTime > 100) {
      recommendations.push(
        'High average wait time, consider optimizing queries or increasing pool size'
      );
    }

    // Check connection errors
    if (metrics.connectionErrors > 0) {
      recommendations.push(
        `Connection errors detected (${metrics.connectionErrors}), check database availability`
      );
    }

    return recommendations;
  }
}

/**
 * Prisma-specific pool configuration
 */
export interface PrismaPoolConfig {
  connection_limit?: number;
  pool_timeout?: number;
  queue_strategy?: 'AUTO_CLEANUP' | 'THROW';
  idle_in_transaction_session_timeout?: number;
  pool_warmup_queries?: number;
}

/**
 * Generate Prisma DATABASE_URL with pool settings
 */
export function generatePrismaConnectionString(baseUrl: string, poolConfig: PoolConfig): string {
  // PostgreSQL connection string format:
  // postgresql://user:password@host:port/database?pool_size=10&idle_in_transaction_session_timeout=60000

  const url = new URL(baseUrl);

  url.searchParams.set('connection_limit', poolConfig.max.toString());
  url.searchParams.set('pool_timeout', (poolConfig.acquireTimeout / 1000).toString());
  url.searchParams.set('idle_in_transaction_session_timeout', poolConfig.idleTimeout.toString());
  url.searchParams.set('statement_cache_size', '25');

  return url.toString();
}

/**
 * Connection pool health check queries
 */
export const POOL_HEALTH_CHECKS = {
  /**
   * Simple connectivity check
   */
  connectivity: 'SELECT 1',

  /**
   * Check active connections
   */
  activeConnections: `
    SELECT count(*) FROM pg_stat_activity
    WHERE state = 'active' AND pid <> pg_backend_pid()
  `,

  /**
   * Check connection limits
   */
  connectionLimits: `
    SELECT
      datname,
      numbackends as current_connections,
      datconnlimit as max_connections
    FROM pg_stat_database
    WHERE datname = current_database()
  `,

  /**
   * Check for idle transactions
   */
  idleTransactions: `
    SELECT count(*) FROM pg_stat_activity
    WHERE state = 'idle in transaction'
  `,

  /**
   * Check database size
   */
  databaseSize: `
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `,
};
