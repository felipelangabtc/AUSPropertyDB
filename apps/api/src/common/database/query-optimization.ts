/**
 * Query Optimization Utilities
 * Helpers for writing and optimizing database queries
 */

/**
 * Query optimization techniques
 */
export const QUERY_OPTIMIZATION_TECHNIQUES = {
  /**
   * Use SELECT * only when necessary
   * Instead, specify only required columns
   */
  selectSpecificColumns: {
    bad: 'SELECT * FROM properties',
    good: 'SELECT id, name, price, suburb FROM properties',
    benefit: 'Reduces memory usage and network transfer',
  },

  /**
   * Use LIMIT and OFFSET for pagination
   */
  pagination: {
    bad: 'SELECT * FROM properties',
    good: 'SELECT id, name FROM properties LIMIT 20 OFFSET 0',
    benefit: 'Reduces result set size',
  },

  /**
   * Use indexes for WHERE clauses
   */
  indexing: {
    bad: 'SELECT * FROM properties WHERE suburb LIKE "%Sydney%"',
    good: 'SELECT * FROM properties WHERE suburb = "Sydney"',
    benefit: 'Index can be used',
  },

  /**
   * Avoid correlated subqueries
   */
  subqueries: {
    bad: `
      SELECT p.id FROM properties p
      WHERE price > (SELECT AVG(price) FROM properties)
    `,
    good: `
      SELECT p.id FROM properties p
      JOIN (SELECT AVG(price) as avg_price FROM properties) avg
      ON p.price > avg.avg_price
    `,
    benefit: 'Better execution plan',
  },

  /**
   * Use JOINs instead of subqueries
   */
  joins: {
    bad: `
      SELECT id FROM properties
      WHERE id IN (SELECT property_id FROM listings)
    `,
    good: `
      SELECT DISTINCT p.id FROM properties p
      JOIN listings l ON p.id = l.property_id
    `,
    benefit: 'Better query plan',
  },

  /**
   * Filter early and often
   */
  filtering: {
    bad: `
      SELECT * FROM price_history
      JOIN properties ON price_history.property_id = properties.id
      WHERE properties.suburb = "Sydney"
    `,
    good: `
      SELECT * FROM properties
      WHERE suburb = "Sydney"
      JOIN price_history ON properties.id = price_history.property_id
    `,
    benefit: 'Fewer rows to join',
  },

  /**
   * Use aggregate functions efficiently
   */
  aggregation: {
    bad: `
      SELECT suburb, COUNT(*) FROM properties
      GROUP BY suburb
      HAVING COUNT(*) > 100
    `,
    good: `
      SELECT suburb, COUNT(*) as count FROM properties
      WHERE created_at > NOW() - INTERVAL 30 days
      GROUP BY suburb
      HAVING count > 100
    `,
    benefit: 'Processes fewer rows',
  },

  /**
   * Use EXPLAIN ANALYZE to understand query plan
   */
  explainAnalyze: {
    usage: 'EXPLAIN ANALYZE SELECT ...',
    benefit: 'Understand actual query execution',
  },

  /**
   * Denormalization for read-heavy operations
   */
  denormalization: {
    example: 'Store aggregated data like total_properties count in suburbs table',
    benefit: 'Faster reads for frequently accessed aggregates',
  },

  /**
   * Use database functions for complex logic
   */
  databaseFunctions: {
    benefit: 'Execute logic closer to data, reduce network traffic',
    example: 'CREATE FUNCTION calculate_price_range() ...',
  },
};

/**
 * Common slow query patterns
 */
export const SLOW_QUERY_PATTERNS = {
  /**
   * N+1 query problem
   */
  nPlusOne: {
    pattern: 'Query in loop without JOIN',
    example: `
      for (const property of properties) {
        const details = db.query('SELECT * FROM listings WHERE property_id = ?', [property.id])
      }
    `,
    solution: 'Use JOIN or batch query',
  },

  /**
   * LIKE with leading wildcard
   */
  leadingWildcard: {
    pattern: "WHERE column LIKE '%value%'",
    solution: 'Use full-text search or refactor to avoid leading wildcard',
  },

  /**
   * Missing index on frequently filtered column
   */
  missingIndex: {
    pattern: 'WHERE column = value (without index)',
    solution: 'Add index on filtered columns',
  },

  /**
   * Joining on unindexed column
   */
  unindexedJoin: {
    pattern: 'JOIN ON unindexed_column',
    solution: 'Add index on join columns',
  },

  /**
   * SELECT * without WHERE
   */
  fullTableScan: {
    pattern: 'SELECT * FROM large_table',
    solution: 'Add WHERE clause and index, or use LIMIT',
  },

  /**
   * Multiple OR conditions without proper indexes
   */
  multipleOr: {
    pattern: 'WHERE col1 = a OR col2 = b OR col3 = c',
    solution: 'Use UNION or create combined index',
  },

  /**
   * Expensive function in WHERE clause
   */
  functionInWhere: {
    pattern: 'WHERE LOWER(column) = value',
    solution: 'Store lowercase version or use database collation',
  },

  /**
   * Large OFFSET for pagination
   */
  largeOffset: {
    pattern: 'OFFSET 100000',
    solution: 'Use keyset pagination or add covering index',
  },
};

/**
 * Keyset (cursor) pagination implementation
 */
export class KeysetPagination {
  /**
   * Generate keyset pagination query
   */
  static generateQuery(
    table: string,
    columns: string[],
    orderBy: string,
    pageSize: number,
    cursor?: any
  ): string {
    let query = `SELECT ${columns.join(', ')} FROM ${table}`;

    if (cursor) {
      query += ` WHERE ${orderBy} > '${cursor}'`;
    }

    query += ` ORDER BY ${orderBy} LIMIT ${pageSize + 1}`;

    return query;
  }

  /**
   * Extract next cursor from results
   */
  static getNextCursor(results: any[], orderByColumn: string): string | null {
    if (results.length > 0) {
      return results[results.length - 1][orderByColumn];
    }

    return null;
  }

  /**
   * Determine if more results exist
   */
  static hasMoreResults(results: any[], pageSize: number): boolean {
    return results.length > pageSize;
  }

  /**
   * Trim results to page size
   */
  static trimResults(results: any[], pageSize: number): any[] {
    return results.slice(0, pageSize);
  }
}

/**
 * Query caching strategies
 */
export const CACHING_STRATEGIES = {
  /**
   * Cache by filter combination
   */
  filterBased: {
    keyFormat: 'properties:suburb:Sydney:type:house',
    ttl: 3600, // 1 hour
    invalidateOn: ['CREATE', 'UPDATE', 'DELETE'],
  },

  /**
   * Cache by user
   */
  userBased: {
    keyFormat: 'user:123:searches',
    ttl: 1800, // 30 minutes
    invalidateOn: ['UPDATE'],
  },

  /**
   * Cache by time window
   */
  timeBased: {
    keyFormat: 'price_history:day:2024-01-15',
    ttl: 86400, // 1 day
    invalidateOn: ['CREATE'],
  },

  /**
   * Cache hot data
   */
  hotData: {
    candidates: ['top_listings', 'trending_suburbs', 'popular_searches'],
    ttl: 600, // 10 minutes
    updateStrategy: 'eager',
  },
};

/**
 * Database query analyzer
 */
export class QueryAnalyzer {
  /**
   * Check for common anti-patterns
   */
  static analyzeQuery(query: string): {
    issues: string[];
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Check for SELECT *
    if (query.includes('SELECT *')) {
      issues.push('Using SELECT * without column specification');
      recommendations.push('Specify only required columns');
      severity = 'MEDIUM';
    }

    // Check for LIKE with leading wildcard
    if (query.includes("LIKE '%")) {
      issues.push('LIKE with leading wildcard cannot use index');
      recommendations.push('Use full-text search or refactor query');
      severity = 'HIGH';
    }

    // Check for multiple ORs
    if ((query.match(/\sOR\s/gi) || []).length > 3) {
      issues.push('Multiple OR conditions may not use indexes effectively');
      recommendations.push('Consider using UNION or refactoring');
      severity = 'MEDIUM';
    }

    // Check for function in WHERE
    if (query.match(/WHERE\s+.*\(/)) {
      issues.push('Function in WHERE clause may prevent index usage');
      recommendations.push('Try to use function in computed column or change approach');
      severity = 'MEDIUM';
    }

    // Check for large OFFSET
    if (query.match(/OFFSET\s+\d{5,}/)) {
      issues.push('Large OFFSET is inefficient');
      recommendations.push('Use keyset pagination instead');
      severity = 'MEDIUM';
    }

    // Check for missing WHERE with large table
    if (!query.includes('WHERE') && !query.includes('LIMIT')) {
      issues.push('Query likely to return large result set');
      recommendations.push('Add WHERE clause or LIMIT');
      severity = 'HIGH';
    }

    return {
      issues,
      severity: Math.max(severity === 'HIGH' ? 3 : severity === 'MEDIUM' ? 2 : 1) as any,
      recommendations,
    };
  }
}

/**
 * Index recommendations
 */
export const INDEX_RECOMMENDATIONS = {
  properties: [
    {
      columns: ['suburb'],
      reason: 'Frequent filter in searches',
      estimated_impact: 'HIGH',
    },
    {
      columns: ['price'],
      reason: 'Range queries for price filtering',
      estimated_impact: 'MEDIUM',
    },
    {
      columns: ['suburb', 'price'],
      reason: 'Common combined filter',
      estimated_impact: 'HIGH',
    },
    {
      columns: ['latitude', 'longitude'],
      reason: 'Geo-proximity searches',
      estimated_impact: 'HIGH',
    },
  ],

  price_history: [
    {
      columns: ['property_id', 'created_at'],
      reason: 'Time-series queries',
      estimated_impact: 'HIGH',
    },
  ],

  listings: [
    {
      columns: ['property_id'],
      reason: 'Foreign key lookup',
      estimated_impact: 'MEDIUM',
    },
  ],

  searches: [
    {
      columns: ['user_id', 'created_at'],
      reason: 'User search history',
      estimated_impact: 'MEDIUM',
    },
  ],
};
