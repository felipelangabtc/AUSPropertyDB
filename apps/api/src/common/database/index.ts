/**
 * Database Utilities Module Exports
 * Central hub for database optimization and management
 */

export {
  DatabaseOptimizationService,
  QueryMetrics,
  IndexRecommendation,
} from './database-optimization.service';

export {
  PoolConfig,
  PoolMetrics,
  POOL_CONFIGS,
  PoolConfigurationBuilder,
  PoolMonitor,
  PoolRecommendations,
  PrismaPoolConfig,
  generatePrismaConnectionString,
  POOL_HEALTH_CHECKS,
} from './connection-pool.config';

export {
  QueryAnalyzer,
  KeysetPagination,
  QUERY_OPTIMIZATION_TECHNIQUES,
  SLOW_QUERY_PATTERNS,
  CACHING_STRATEGIES,
  INDEX_RECOMMENDATIONS,
} from './query-optimization';

export {
  DATABASE_INDEXES,
  generateIndexMigration,
  INDEX_STATISTICS,
  INDEX_OPTIMIZATION_TIPS,
} from './indexes';
