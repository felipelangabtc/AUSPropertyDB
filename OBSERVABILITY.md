# Observability & Monitoring Guide

## Overview

AUSPropertyDB includes comprehensive observability features for monitoring system health, performance, and business metrics.

## Components

### 1. Logging

**Provider:** Winston with daily log rotation

**Features:**
- Development: Console output with colors
- Production: Daily rotated files + error-specific logs
- Configurable log levels via `LOG_LEVEL` env var
- Stack traces for exceptions

**Log Files:**
- `logs/application-YYYY-MM-DD.log` - All logs
- `logs/error-YYYY-MM-DD.log` - Errors only (30 day retention)
- `logs/exceptions.log` - Uncaught exceptions

**Usage:**
```typescript
import { logger } from '@aus-prop/observability';

logger.info('Processing property', { propertyId: '123' });
logger.error('Failed to fetch listings', { error: err.message });
logger.debug('Cache hit', { key: 'property:123' });
```

### 2. Metrics (Prometheus)

**Endpoint:** `GET /metrics`

**Format:** Prometheus text format (for Grafana, etc.)

#### HTTP Metrics
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total requests counter
- Labels: method, route, status

#### Database Metrics
- `db_query_duration_seconds` - Query latency histogram
- `db_queries_total` - Total queries counter
- Labels: operation, table, status

#### Job Queue Metrics
- `job_queue_size` - Jobs waiting in queue
- `job_processing_duration_seconds` - Processing time histogram
- `jobs_total` - Total jobs processed
- Labels: queue, status

#### Cache Metrics
- `cache_hits_total` - Total cache hits
- `cache_misses_total` - Total cache misses
- Labels: cache, key

#### Connector Metrics
- `connector_requests_total` - Total connector requests
- `connector_latency_seconds` - Request latency
- Labels: connector, status

#### ML Metrics
- `ml_prediction_duration_seconds` - Prediction latency
- `ml_training_duration_seconds` - Training duration
- `ml_model_accuracy` - Model R² score
- Labels: model, version (for accuracy)

#### Business Metrics
- `properties_ingested_total` - Total properties ingested
- `listings_processed_total` - Total listings processed
- `webhook_deliveries_total` - Total webhook deliveries
- Labels: source/action/event, status

#### System Metrics
- `active_connections` - Active connections (redis, db, websocket)
- `system_memory_usage_bytes` - Memory usage
- `errors_total` - Total errors by module and type

### 3. Health Checks

**Endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health (always 200) |
| `GET /health/db` | Database connectivity |
| `GET /health/redis` | Redis connectivity |
| `GET /health/connectors` | External connector health |

**Response Format:**
```json
{
  "healthy": true,
  "message": "Database is healthy",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Recording Metrics

### HTTP Requests

Automatic via `HttpMetricsMiddleware` - no action needed.

### Database Queries

```typescript
import { recordDbQuery } from '@aus-prop/observability';

const start = Date.now();
try {
  const result = await prisma.property.findMany();
  recordDbQuery('findMany', 'property', 'success', (Date.now() - start) / 1000);
} catch (err) {
  recordDbQuery('findMany', 'property', 'error', (Date.now() - start) / 1000);
}
```

### Job Processing

```typescript
import { recordJobProcessing } from '@aus-prop/observability';

const start = Date.now();
try {
  // Process job
  recordJobProcessing('crawl', 'success', (Date.now() - start) / 1000);
} catch (err) {
  recordJobProcessing('crawl', 'failed', (Date.now() - start) / 1000);
}
```

### Cache Operations

```typescript
import { recordCacheHit, recordCacheMiss } from '@aus-prop/observability';

const cached = cache.get(key);
if (cached) {
  recordCacheHit('ml-predictions', key);
} else {
  recordCacheMiss('ml-predictions', key);
}
```

### Connector Requests

```typescript
import { recordConnectorRequest } from '@aus-prop/observability';

const start = Date.now();
try {
  const data = await connector.search(query);
  recordConnectorRequest('realestate-au', 'success', (Date.now() - start) / 1000);
} catch (err) {
  if (err.status === 429) {
    recordConnectorRequest('realestate-au', 'ratelimit', (Date.now() - start) / 1000);
  } else {
    recordConnectorRequest('realestate-au', 'error', (Date.now() - start) / 1000);
  }
}
```

## Grafana Integration

### Adding Data Source

1. Go to Grafana → Configuration → Data Sources
2. Click "Add data source"
3. Type: Prometheus
4. URL: `http://api:3000/metrics`
5. Click "Save & Test"

### Example Dashboards

#### Request Latency
```
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

#### Error Rate
```
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

#### Queue Depth
```
job_queue_size
```

#### ML Model Accuracy
```
ml_model_accuracy
```

#### Property Ingestion Rate
```
rate(properties_ingested_total[1h])
```

## Alerting Rules

Example Prometheus alert rules:

```yaml
groups:
  - name: auspropertydb
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowQueries
        expr: histogram_quantile(0.95, db_query_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "Database queries are slow"
          
      - alert: QueueBacklog
        expr: job_queue_size > 1000
        for: 10m
        annotations:
          summary: "Job queue is backed up"
          
      - alert: CacheMissRate
        expr: rate(cache_misses_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) > 0.5
        for: 5m
        annotations:
          summary: "High cache miss rate"
```

## Log Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for failure events
- **FATAL**: Fatal errors causing shutdown

**Environment Variable:**
```bash
LOG_LEVEL=debug  # or info, warn, error, fatal
```

## Performance Monitoring

### Key Metrics to Watch

1. **API Response Time**
   - P95 latency: Should be <500ms
   - P99 latency: Should be <1s

2. **Database Performance**
   - Query latency: <100ms typical
   - Slow query log (>500ms)

3. **Queue Health**
   - Job queue size: Monitor for backlog
   - Job processing time: Track by queue type

4. **Cache Efficiency**
   - Hit rate: Should be >70%
   - Eviction rate: Monitor for memory pressure

5. **Connector Performance**
   - Request latency by source
   - Rate limit hits
   - Success rate

6. **ML Model**
   - Prediction latency: <50ms typical
   - Model accuracy (R² score)
   - Training duration

## Troubleshooting

### High CPU Usage
1. Check `http_request_duration_seconds` - slow endpoints?
2. Check `db_query_duration_seconds` - slow queries?
3. Review logs for `ERROR` level entries

### High Memory Usage
1. Monitor `system_memory_usage_bytes`
2. Check `active_connections` for leaks
3. Review cache size via `cache_hits_total` vs evictions

### Queue Backlog
1. Check `job_queue_size` per queue
2. Compare with `job_processing_duration_seconds`
3. Consider increasing worker concurrency

### Cache Issues
1. Calculate hit rate: `cache_hits / (cache_hits + cache_misses)`
2. If low (<50%), consider TTL adjustment
3. Review `redis` health check

### Connector Failures
1. Check `connector_requests_total` status breakdown
2. Look for `ratelimit` status (HTTP 429)
3. Review connector-specific logs

## Best Practices

1. **Always use structured logging** with context
   ```typescript
   logger.info('Listed properties', { count: 100, connector: 'realestate' });
   ```

2. **Record custom metrics** for business events
   ```typescript
   propertiesIngested.labels('realestate').inc(100);
   ```

3. **Set up Grafana dashboards** for key metrics

4. **Configure alerts** for SLOs

5. **Regular log rotation** - production logs auto-rotate daily

6. **Monitor metrics endpoint** response time

## Docker Compose Example

```yaml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
  depends_on:
    - prometheus
```

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [prom-client](https://github.com/siimon/prom-client)
