/**
 * Database Indexes Setup
 * SQL migrations for performance optimization
 */

export const DATABASE_INDEXES = {
  /**
   * Property table indexes
   */
  property_indexes: [
    {
      name: 'idx_properties_suburb',
      sql: 'CREATE INDEX IF NOT EXISTS idx_properties_suburb ON properties(suburb);',
      purpose: 'Optimize suburb filtering in searches',
      priority: 'HIGH',
    },
    {
      name: 'idx_properties_price',
      sql: 'CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);',
      purpose: 'Optimize price range queries',
      priority: 'HIGH',
    },
    {
      name: 'idx_properties_suburb_price',
      sql: 'CREATE INDEX IF NOT EXISTS idx_properties_suburb_price ON properties(suburb, price);',
      purpose: 'Common combined filter in searches',
      priority: 'HIGH',
    },
    {
      name: 'idx_properties_geo',
      sql: 'CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties(latitude, longitude);',
      purpose: 'Geo-proximity searches',
      priority: 'HIGH',
    },
    {
      name: 'idx_properties_address',
      sql: 'CREATE INDEX IF NOT EXISTS idx_properties_address ON properties(address);',
      purpose: 'Address search lookups',
      priority: 'MEDIUM',
    },
    {
      name: 'idx_properties_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);',
      purpose: 'Recent properties queries',
      priority: 'MEDIUM',
    },
  ],

  /**
   * Price History table indexes
   */
  price_history_indexes: [
    {
      name: 'idx_price_history_property_date',
      sql: 'CREATE INDEX IF NOT EXISTS idx_price_history_property_date ON price_history(property_id, created_at DESC);',
      purpose: 'Time-series queries for price changes',
      priority: 'HIGH',
    },
    {
      name: 'idx_price_history_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON price_history(created_at DESC);',
      purpose: 'Recent price changes',
      priority: 'MEDIUM',
    },
    {
      name: 'idx_price_history_price',
      sql: 'CREATE INDEX IF NOT EXISTS idx_price_history_price ON price_history(price);',
      purpose: 'Price value lookups',
      priority: 'LOW',
    },
  ],

  /**
   * Listings table indexes
   */
  listings_indexes: [
    {
      name: 'idx_listings_property_source',
      sql: 'CREATE INDEX IF NOT EXISTS idx_listings_property_source ON listings(property_id, source);',
      purpose: 'Lookup listings by property and source',
      priority: 'HIGH',
    },
    {
      name: 'idx_listings_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);',
      purpose: 'Recent listings',
      priority: 'MEDIUM',
    },
    {
      name: 'idx_listings_source',
      sql: 'CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);',
      purpose: 'Filter by source',
      priority: 'LOW',
    },
  ],

  /**
   * Searches table indexes
   */
  searches_indexes: [
    {
      name: 'idx_searches_user_date',
      sql: 'CREATE INDEX IF NOT EXISTS idx_searches_user_date ON searches(user_id, created_at DESC);',
      purpose: 'User search history',
      priority: 'MEDIUM',
    },
    {
      name: 'idx_searches_filters',
      sql: 'CREATE INDEX IF NOT EXISTS idx_searches_filters ON searches(filters) WHERE filters IS NOT NULL;',
      purpose: 'Filter-based search analytics',
      priority: 'LOW',
    },
  ],

  /**
   * Alerts table indexes
   */
  alerts_indexes: [
    {
      name: 'idx_alerts_user_active',
      sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_user_active ON alerts(user_id, enabled, updated_at DESC);',
      purpose: 'Active alerts retrieval',
      priority: 'MEDIUM',
    },
    {
      name: 'idx_alerts_criteria',
      sql: 'CREATE INDEX IF NOT EXISTS idx_alerts_criteria ON alerts(criteria) WHERE criteria IS NOT NULL;',
      purpose: 'Alert matching',
      priority: 'MEDIUM',
    },
  ],

  /**
   * Webhook tables indexes
   */
  webhooks_indexes: [
    {
      name: 'idx_webhooks_user_enabled',
      sql: 'CREATE INDEX IF NOT EXISTS idx_webhooks_user_enabled ON webhooks(user_id, enabled);',
      purpose: 'Active webhooks per user',
      priority: 'MEDIUM',
    },
    {
      name: 'idx_webhook_deliveries_status',
      sql: 'CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(webhook_id, status, created_at DESC);',
      purpose: 'Delivery status tracking',
      priority: 'MEDIUM',
    },
    {
      name: 'idx_webhook_deliveries_failed',
      sql: "CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_failed ON webhook_deliveries(webhook_id, status, created_at DESC) WHERE status = 'FAILED';",
      purpose: 'Find failed deliveries',
      priority: 'LOW',
    },
  ],

  /**
   * User table indexes
   */
  user_indexes: [
    {
      name: 'idx_users_email',
      sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      purpose: 'Email lookups for authentication',
      priority: 'HIGH',
    },
    {
      name: 'idx_users_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);',
      purpose: 'Recent user queries',
      priority: 'LOW',
    },
  ],

  /**
   * Additional performance indexes
   */
  performance_indexes: [
    {
      name: 'idx_properties_suburb_price_active',
      sql: `CREATE INDEX IF NOT EXISTS idx_properties_suburb_price_active
            ON properties(suburb, price)
            WHERE deleted_at IS NULL;`,
      purpose: 'Active properties only',
      priority: 'HIGH',
    },
    {
      name: 'idx_price_history_recent',
      sql: `CREATE INDEX IF NOT EXISTS idx_price_history_recent
            ON price_history(property_id, created_at DESC)
            WHERE created_at > NOW() - INTERVAL '1 year';`,
      purpose: 'Recent price history',
      priority: 'MEDIUM',
    },
  ],
};

/**
 * Generate migration SQL
 */
export function generateIndexMigration(): string {
  const allIndexes = Object.values(DATABASE_INDEXES).flat();

  const statements = allIndexes
    .sort(
      (a, b) =>
        ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[a.priority] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority]
    )
    .map((idx) => `-- ${idx.purpose}\n${idx.sql}`)
    .join('\n\n');

  return `-- Database Indexes Migration\n-- Generated for performance optimization\n\n${statements}\n`;
}

/**
 * Index statistics and recommendations
 */
export const INDEX_STATISTICS = {
  /**
   * Expected impact of indexes
   */
  expectedImpact: {
    suburb_price_index: 'Query time: 500ms → 50ms (10x improvement)',
    geo_index: 'Proximity searches: 2000ms → 100ms (20x improvement)',
    user_date_index: 'User search history: 300ms → 30ms (10x improvement)',
  },

  /**
   * Index maintenance schedule
   */
  maintenance: {
    analyze: 'Daily at 2:00 AM',
    vacuum: 'Weekly on Sundays',
    reindex: 'Monthly on first Sunday',
    bloat_check: 'Weekly',
  },

  /**
   * Monitoring queries
   */
  monitoring: {
    index_usage: `
      SELECT
        schemaname, tablename, indexname,
        idx_scan, idx_tup_read, idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 20
    `,

    unused_indexes: `
      SELECT
        schemaname, tablename, indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      ORDER BY pg_relation_size(indexrelid) DESC
    `,

    index_size: `
      SELECT
        tablename, indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      ORDER BY pg_relation_size(indexrelid) DESC
    `,

    missing_indexes: `
      SELECT
        schemaname, tablename, attname,
        n_distinct, correlation
      FROM pg_stats
      WHERE correlation > 0.7 OR correlation < -0.7
      ORDER BY abs(correlation) DESC
    `,
  },
};

/**
 * Index optimization tips
 */
export const INDEX_OPTIMIZATION_TIPS = [
  {
    tip: 'Use composite indexes for common filter combinations',
    example: 'CREATE INDEX idx_sub_price ON properties(suburb, price)',
    benefit: 'Single index covers both filters',
  },
  {
    tip: 'Order columns by selectivity (least selective first)',
    example: 'CREATE INDEX idx_active_user ON properties(active, user_id)',
    benefit: 'Better index usage',
  },
  {
    tip: 'Use partial indexes for filtered queries',
    example: 'CREATE INDEX idx_active_props ON properties(suburb) WHERE active = true',
    benefit: 'Smaller, faster indexes',
  },
  {
    tip: 'Monitor index usage regularly',
    command: 'SELECT * FROM pg_stat_user_indexes',
    benefit: 'Remove unused indexes',
  },
  {
    tip: 'Consider covering indexes for read-heavy queries',
    example: 'CREATE INDEX idx_covering ON properties(suburb) INCLUDE (price, address)',
    benefit: 'Index-only scans',
  },
  {
    tip: 'Analyze table statistics after bulk operations',
    command: 'ANALYZE properties',
    benefit: 'Better query plans',
  },
  {
    tip: 'Vacuum regularly to reduce bloat',
    command: 'VACUUM ANALYZE properties',
    benefit: 'Maintain performance',
  },
];
