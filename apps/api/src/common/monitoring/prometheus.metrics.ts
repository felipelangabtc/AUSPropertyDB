import { Injectable } from '@nestjs/common';
import { register, Counter, Gauge, Histogram, Summary } from 'prom-client';

/**
 * Prometheus Metrics Service
 *
 * Provides comprehensive application metrics for monitoring:
 * - HTTP requests (latency, status codes, throughput)
 * - Database operations (query time, connection count)
 * - Cache performance (hit rate, evictions)
 * - Business metrics (properties listed, searches performed, revenue)
 * - System metrics (CPU, memory, event loop lag)
 */
@Injectable()
export class PrometheusMetricsService {
  /**
   * HTTP Metrics
   */
  private readonly httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'status', 'endpoint'],
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'status', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  });

  private readonly httpRequestSize = new Gauge({
    name: 'http_request_size_bytes',
    help: 'HTTP request size in bytes',
    labelNames: ['method', 'endpoint'],
  });

  private readonly httpResponseSize = new Gauge({
    name: 'http_response_size_bytes',
    help: 'HTTP response size in bytes',
    labelNames: ['method', 'status', 'endpoint'],
  });

  /**
   * Database Metrics
   */
  private readonly dbQueryTotal = new Counter({
    name: 'db_queries_total',
    help: 'Total database queries',
    labelNames: ['operation', 'table', 'status'],
  });

  private readonly dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  });

  private readonly dbConnections = new Gauge({
    name: 'db_connections_active',
    help: 'Active database connections',
    labelNames: ['pool'],
  });

  private readonly dbConnectionsWaiting = new Gauge({
    name: 'db_connections_waiting',
    help: 'Waiting database connections',
    labelNames: ['pool'],
  });

  /**
   * Cache Metrics
   */
  private readonly cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['cache_level', 'key_pattern'],
  });

  private readonly cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['cache_level', 'key_pattern'],
  });

  private readonly cacheHitRate = new Gauge({
    name: 'cache_hit_rate',
    help: 'Cache hit rate (0-1)',
    labelNames: ['cache_level'],
  });

  private readonly cacheSize = new Gauge({
    name: 'cache_size_bytes',
    help: 'Cache size in bytes',
    labelNames: ['cache_level'],
  });

  /**
   * Business Metrics
   */
  private readonly propertiesListed = new Counter({
    name: 'properties_listed_total',
    help: 'Total properties listed',
    labelNames: ['suburb', 'type'],
  });

  private readonly searchesPerformed = new Counter({
    name: 'searches_performed_total',
    help: 'Total searches performed',
    labelNames: ['search_type'],
  });

  private readonly revenue = new Counter({
    name: 'revenue_total',
    help: 'Total revenue in cents',
    labelNames: ['transaction_type'],
  });

  private readonly activeListings = new Gauge({
    name: 'active_listings',
    help: 'Number of active listings',
    labelNames: ['suburb', 'type'],
  });

  private readonly userCount = new Gauge({
    name: 'user_count',
    help: 'Total registered users',
    labelNames: ['user_type'],
  });

  /**
   * System Metrics
   */
  private readonly cpuUsage = new Gauge({
    name: 'cpu_usage_percent',
    help: 'CPU usage percentage (0-100)',
  });

  private readonly memoryUsage = new Gauge({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type'], // 'heap_used', 'heap_total', 'external'
  });

  private readonly eventLoopLag = new Histogram({
    name: 'event_loop_lag_seconds',
    help: 'Event loop lag in seconds',
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  });

  private readonly processUptime = new Gauge({
    name: 'process_uptime_seconds',
    help: 'Process uptime in seconds',
  });

  /**
   * Error Metrics
   */
  private readonly errorsTotal = new Counter({
    name: 'errors_total',
    help: 'Total errors',
    labelNames: ['error_type', 'severity'],
  });

  private readonly exceptionTotal = new Counter({
    name: 'exceptions_total',
    help: 'Total exceptions',
    labelNames: ['exception_type', 'handled'],
  });

  /**
   * Authentication Metrics
   */
  private readonly loginAttempts = new Counter({
    name: 'login_attempts_total',
    help: 'Total login attempts',
    labelNames: ['status'], // 'success', 'failed', 'locked'
  });

  private readonly authTokensIssued = new Counter({
    name: 'auth_tokens_issued_total',
    help: 'Total auth tokens issued',
    labelNames: ['token_type'], // 'access', 'refresh'
  });

  private readonly sessionCount = new Gauge({
    name: 'active_sessions',
    help: 'Number of active sessions',
  });

  /**
   * Rate Limiting Metrics
   */
  private readonly rateLimitHits = new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total rate limit hits',
    labelNames: ['endpoint', 'tier'],
  });

  private readonly rateLimitExceeded = new Counter({
    name: 'rate_limit_exceeded_total',
    help: 'Total rate limit exceeded events',
    labelNames: ['endpoint', 'tier'],
  });

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    endpoint: string,
    status: number,
    durationMs: number,
    reqSize: number,
    resSize: number
  ) {
    this.httpRequestTotal.labels(method, String(status), endpoint).inc();
    this.httpRequestDuration.labels(method, String(status), endpoint).observe(durationMs / 1000);
    this.httpRequestSize.set({ method, endpoint }, reqSize);
    this.httpResponseSize.set({ method, status: String(status), endpoint }, resSize);
  }

  /**
   * Record database query
   */
  recordDbQuery(operation: string, table: string, durationMs: number, success: boolean) {
    this.dbQueryTotal.labels(operation, table, success ? 'success' : 'failed').inc();
    this.dbQueryDuration.labels(operation, table).observe(durationMs / 1000);
  }

  /**
   * Update database connections
   */
  updateDbConnections(pool: string, active: number, waiting: number) {
    this.dbConnections.set({ pool }, active);
    this.dbConnectionsWaiting.set({ pool }, waiting);
  }

  /**
   * Record cache hit/miss
   */
  recordCacheHit(level: string, pattern: string) {
    this.cacheHits.labels(level, pattern).inc();
    this.updateCacheHitRate(level);
  }

  recordCacheMiss(level: string, pattern: string) {
    this.cacheMisses.labels(level, pattern).inc();
    this.updateCacheHitRate(level);
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(level: string) {
    const hits = this.cacheHits
      .get()
      .values.filter((v) => v.labels.cache_level === level)
      .reduce((a, b) => a + b.value, 0);
    const misses = this.cacheMisses
      .get()
      .values.filter((v) => v.labels.cache_level === level)
      .reduce((a, b) => a + b.value, 0);
    const total = hits + misses;
    const rate = total > 0 ? hits / total : 0;
    this.cacheHitRate.set({ cache_level: level }, rate);
  }

  /**
   * Update cache size
   */
  updateCacheSize(level: string, bytes: number) {
    this.cacheSize.set({ cache_level: level }, bytes);
  }

  /**
   * Record property listed
   */
  recordPropertyListed(suburb: string, type: string) {
    this.propertiesListed.labels(suburb, type).inc();
    this.updateActiveListings(suburb, type);
  }

  /**
   * Update active listings
   */
  updateActiveListings(suburb: string, type: string, count?: number) {
    if (count !== undefined) {
      this.activeListings.set({ suburb, type }, count);
    }
  }

  /**
   * Record search performed
   */
  recordSearch(searchType: string) {
    this.searchesPerformed.labels(searchType).inc();
  }

  /**
   * Record revenue
   */
  recordRevenue(type: string, amountCents: number) {
    this.revenue.labels(type).inc(amountCents);
  }

  /**
   * Update user count
   */
  updateUserCount(userType: string, count: number) {
    this.userCount.set({ user_type: userType }, count);
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(
    cpuPercent: number,
    memoryHeapUsed: number,
    memoryHeapTotal: number,
    memoryExternal: number,
    lagMs: number
  ) {
    this.cpuUsage.set(cpuPercent);
    this.memoryUsage.set({ type: 'heap_used' }, memoryHeapUsed);
    this.memoryUsage.set({ type: 'heap_total' }, memoryHeapTotal);
    this.memoryUsage.set({ type: 'external' }, memoryExternal);
    this.eventLoopLag.observe(lagMs / 1000);
    this.processUptime.set(process.uptime());
  }

  /**
   * Record error
   */
  recordError(errorType: string, severity: string) {
    this.errorsTotal.labels(errorType, severity).inc();
  }

  /**
   * Record exception
   */
  recordException(exceptionType: string, handled: boolean) {
    this.exceptionTotal.labels(exceptionType, handled ? 'yes' : 'no').inc();
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt(status: 'success' | 'failed' | 'locked') {
    this.loginAttempts.labels(status).inc();
  }

  /**
   * Record auth token issued
   */
  recordTokenIssued(tokenType: 'access' | 'refresh') {
    this.authTokensIssued.labels(tokenType).inc();
  }

  /**
   * Update session count
   */
  updateSessionCount(count: number) {
    this.sessionCount.set(count);
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(endpoint: string, tier: string) {
    this.rateLimitHits.labels(endpoint, tier).inc();
  }

  /**
   * Record rate limit exceeded
   */
  recordRateLimitExceeded(endpoint: string, tier: string) {
    this.rateLimitExceeded.labels(endpoint, tier).inc();
  }

  /**
   * Get all metrics in Prometheus format
   */
  getMetrics(): string {
    return register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  getMetricsJson() {
    return register.collectDefaultMetrics();
  }

  /**
   * Reset all metrics (for testing)
   */
  resetMetrics() {
    register.clear();
  }
}
