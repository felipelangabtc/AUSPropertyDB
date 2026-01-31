import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * Prometheus metrics for AUSPropertyDB
 */

// HTTP Request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query latency in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total database queries',
  labelNames: ['operation', 'table', 'status'],
});

// Queue/Job metrics
export const jobQueueSize = new Gauge({
  name: 'job_queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue'],
});

export const jobProcessingDuration = new Histogram({
  name: 'job_processing_duration_seconds',
  help: 'Job processing time in seconds',
  labelNames: ['queue', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
});

export const jobTotal = new Counter({
  name: 'jobs_total',
  help: 'Total jobs processed',
  labelNames: ['queue', 'status'],
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache', 'key'],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache', 'key'],
});

// Connector metrics
export const connectorRequests = new Counter({
  name: 'connector_requests_total',
  help: 'Total connector requests',
  labelNames: ['connector', 'status'],
});

export const connectorLatency = new Histogram({
  name: 'connector_latency_seconds',
  help: 'Connector request latency in seconds',
  labelNames: ['connector'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

// ML metrics
export const mlPredictionDuration = new Histogram({
  name: 'ml_prediction_duration_seconds',
  help: 'ML prediction latency in seconds',
  labelNames: ['model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

export const mlTrainingDuration = new Histogram({
  name: 'ml_training_duration_seconds',
  help: 'ML model training duration in seconds',
  labelNames: ['model'],
  buckets: [1, 5, 10, 30, 60, 300],
});

export const mlModelAccuracy = new Gauge({
  name: 'ml_model_accuracy',
  help: 'ML model R² score',
  labelNames: ['model', 'version'],
});

// Business metrics
export const propertiesIngested = new Counter({
  name: 'properties_ingested_total',
  help: 'Total properties ingested',
  labelNames: ['source'],
});

export const listingsProcessed = new Counter({
  name: 'listings_processed_total',
  help: 'Total listings processed',
  labelNames: ['action'], // created, updated, deleted
});

export const webhookDeliveries = new Counter({
  name: 'webhook_deliveries_total',
  help: 'Total webhook deliveries',
  labelNames: ['event', 'status'], // success, failed, retrying
});

// Error metrics
export const errors = new Counter({
  name: 'errors_total',
  help: 'Total errors',
  labelNames: ['module', 'type'],
});

// System metrics
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'], // redis, db, websocket
});

export const systemMemoryUsage = new Gauge({
  name: 'system_memory_usage_bytes',
  help: 'System memory usage in bytes',
});

/**
 * Helper function to record HTTP request
 */
export function recordHttpRequest(method: string, route: string, status: number, duration: number) {
  httpRequestDuration.labels(method, route, status).observe(duration);
  httpRequestTotal.labels(method, route, status).inc();
}

/**
 * Helper function to record database query
 */
export function recordDbQuery(operation: string, table: string, status: 'success' | 'error', duration: number) {
  dbQueryDuration.labels(operation, table).observe(duration);
  dbQueryTotal.labels(operation, table, status).inc();
}

/**
 * Helper function to record job processing
 */
export function recordJobProcessing(queue: string, status: 'success' | 'failed', duration: number) {
  jobProcessingDuration.labels(queue, status).observe(duration);
  jobTotal.labels(queue, status).inc();
}

/**
 * Helper function to record cache operation
 */
export function recordCacheHit(cache: string, key: string) {
  cacheHits.labels(cache, key).inc();
}

export function recordCacheMiss(cache: string, key: string) {
  cacheMisses.labels(cache, key).inc();
}

/**
 * Helper function to record connector request
 */
export function recordConnectorRequest(connector: string, status: 'success' | 'error' | 'ratelimit', duration: number) {
  connectorRequests.labels(connector, status).inc();
  connectorLatency.labels(connector).observe(duration);
}
