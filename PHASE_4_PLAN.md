# Phase 4 Implementation Plan: Production Hardening

## Overview

Phase 4 focuses on making the system production-ready with resilience, optimization, security, and comprehensive monitoring.

## 4.1 API Resilience - WEEK 1

### Objective
Implement resilience patterns to handle failures gracefully.

### Tasks

#### 4.1.1 Circuit Breaker Pattern
```typescript
// apps/api/src/common/resilience/circuit-breaker.ts
class CircuitBreaker {
  constructor(
    private failureThreshold = 5,
    private resetTimeout = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      setTimeout(() => {
        this.state = 'half-open';
      }, this.resetTimeout);
    }
  }
}
```

**Files to Create:**
- `apps/api/src/common/resilience/circuit-breaker.ts`
- `apps/api/src/common/resilience/bulkhead.ts`
- `apps/api/src/common/resilience/retry.ts`

**Tests:**
- Circuit breaker state transitions
- Failure threshold behavior
- Recovery after reset timeout

#### 4.1.2 Request Timeout Management
```typescript
// Apply per-endpoint timeout
@Get('search')
@Timeout(5000) // 5 second timeout
async search(@Query() query: SearchQueryDto) {
  // ...
}
```

**Implementation:**
- Timeout decorator for endpoints
- Default timeout: 30s (configurable per endpoint)
- Alert on timeouts
- Track timeout metrics

#### 4.1.3 Graceful Degradation
```typescript
// When ML service unavailable, return null prediction
async getPrediction(propertyId: string) {
  try {
    return await this.mlService.predict(propertyId);
  } catch (err) {
    logger.warn('ML service unavailable, returning null prediction');
    return null; // Client handles null
  }
}
```

**Scenarios:**
- ML service down → return last cached prediction or null
- Connector unavailable → use demo data or skip enrichment
- Redis down → use in-memory cache
- Database slow → timeout and return partial results

### Deliverables
- [ ] Circuit breaker implementation
- [ ] Timeout decorator
- [ ] Graceful degradation tests
- [ ] Resilience documentation

---

## 4.2 Database Optimization - WEEK 2

### Objective
Ensure database queries are efficient and scalable.

### Tasks

#### 4.2.1 Query Optimization
```sql
-- Identify slow queries
SELECT query, calls, mean_exec_time, max_exec_time 
FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC;

-- Add indexes for common filters
CREATE INDEX idx_properties_suburb ON properties(suburb);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_price_history_created_at ON price_history(created_at);
CREATE INDEX idx_price_history_property_created 
  ON price_history(property_id, created_at);

-- Composite index for common queries
CREATE INDEX idx_properties_geo 
  ON properties(lat, lng) 
  WHERE is_active = true;
```

**Analysis Required:**
- [ ] EXPLAIN ANALYZE for top 20 queries
- [ ] Identify N+1 query problems
- [ ] Review Prisma query generation
- [ ] Create index recommendations

#### 4.2.2 Connection Pooling
```typescript
// In app.module.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${DATABASE_URL}?connection_limit=20&pool_timeout=10`,
    },
  },
});
```

**Configuration:**
- Connection limit: 20 (production)
- Pool timeout: 10 seconds
- Monitor active connections
- Alert if connection limit exceeded

#### 4.2.3 Query Optimization Script
```typescript
// apps/scripts/analyze-queries.ts
// Analyze and log slow queries
// Generate index recommendations
// Export optimization report
```

### Deliverables
- [ ] Query analysis report
- [ ] Index creation script
- [ ] Connection pool tuning
- [ ] Query optimization tests

---

## 4.3 Caching Strategy - WEEK 3

### Objective
Implement multi-level caching for optimal performance.

### Tasks

#### 4.3.1 Multi-Level Cache
```typescript
// L1: In-memory (fast, small)
const l1Cache = new Map<string, any>();

// L2: Redis (medium speed, medium size)
const l2Cache = redis;

// L3: Database (slow, large)

async function getProperty(id: string) {
  // Check L1
  let property = l1Cache.get(id);
  if (property) return property;

  // Check L2
  const cached = await redis.get(`property:${id}`);
  if (cached) {
    property = JSON.parse(cached);
    l1Cache.set(id, property); // Populate L1
    return property;
  }

  // Check L3
  property = await prisma.property.findUnique({ where: { id } });
  
  // Populate L2 (1 hour TTL)
  await redis.set(`property:${id}`, JSON.stringify(property), 'EX', 3600);
  l1Cache.set(id, property);
  
  return property;
}
```

#### 4.3.2 Cache Invalidation
```typescript
// Invalidate on mutations
async updateProperty(id: string, data: PropertyUpdateDto) {
  const property = await prisma.property.update({
    where: { id },
    data,
  });

  // Invalidate caches
  l1Cache.delete(id);
  await redis.del(`property:${id}`);
  
  // Broadcast invalidation to other instances
  await redis.publish('property:updated', id);

  return property;
}
```

#### 4.3.3 Cache Warming
```typescript
// On startup, warm frequently accessed data
async function warmCache() {
  const properties = await prisma.property.findMany({
    where: { isActive: true },
    take: 100, // Most active properties
    orderBy: { listing_views: 'desc' },
  });

  for (const property of properties) {
    await redis.set(
      `property:${property.id}`,
      JSON.stringify(property),
      'EX',
      3600,
    );
  }
}
```

### Deliverables
- [ ] Multi-level cache implementation
- [ ] Cache invalidation logic
- [ ] Cache warming script
- [ ] Cache hit rate monitoring

---

## 4.4 Security Hardening - WEEK 4

### Objective
Secure API endpoints and protect against attacks.

### Tasks

#### 4.4.1 Per-Endpoint Rate Limiting
```typescript
// Update rate limits in guard
const ENDPOINT_LIMITS = {
  'GET /properties': { limit: 100, window: 60 }, // 100/min
  'POST /properties': { limit: 10, window: 60 }, // 10/min
  'GET /search': { limit: 20, window: 60 }, // 20/min
  'POST /auth/login': { limit: 5, window: 60 }, // 5/min
  'POST /admin/*': { limit: 50, window: 60 }, // 50/min
};
```

#### 4.4.2 IP Whitelisting for Admin
```typescript
// In admin.controller.ts
@UseGuards(IpWhitelistGuard)
@Controller('admin')
export class AdminController {
  // Only allow from whitelisted IPs
}
```

#### 4.4.3 Security Headers
```typescript
// In main.ts
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  }),
);
```

#### 4.4.4 Request Signing for Webhooks
```typescript
// Already implemented in webhooks.processor.ts
// Verify signature in webhook handlers
const signature = req.headers['x-signature-256'];
const hash = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature !== hash) {
  throw new UnauthorizedException('Invalid signature');
}
```

### Deliverables
- [ ] Per-endpoint rate limiting
- [ ] IP whitelisting implementation
- [ ] Security headers configuration
- [ ] Webhook signature validation

---

## 4.5 Performance Optimization - WEEK 5-6

### Objective
Achieve target performance metrics.

### Tasks

#### 4.5.1 Load Testing with k6
```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay
    { duration: '2m', target: 0 }, // Ramp down
  ],
};

export default function () {
  const res = http.get('http://api:3000/properties');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

#### 4.5.2 Bottleneck Analysis
```typescript
// apps/scripts/analyze-performance.ts
// Profile endpoints
// Identify slowest operations
// Generate optimization recommendations
```

#### 4.5.3 Caching Effectiveness
```typescript
// Monitor cache hit rates
const hitRate = hits / (hits + misses);
// Target: > 80%
```

### Performance Targets
- API P95 Response: < 200ms
- API P99 Response: < 500ms
- Search P95: < 300ms
- ML Prediction: < 50ms (cached)
- Database Query P95: < 100ms
- Error Rate: < 0.1%

### Deliverables
- [ ] k6 load testing scripts
- [ ] Performance profile analysis
- [ ] Optimization recommendations
- [ ] Performance tests passing

---

## 4.6 Monitoring & Alerting - WEEK 7

### Objective
Comprehensive observability for production.

### Tasks

#### 4.6.1 Prometheus Alerts
```yaml
# prometheus-rules.yml
groups:
  - name: auspropertydb
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.001
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: SlowResponses
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.2
        for: 5m
        annotations:
          summary: "API responses are slow"

      - alert: DatabaseConnectionsFull
        expr: db_active_connections >= 19
        for: 2m
        annotations:
          summary: "Database connections pool nearly full"
```

#### 4.6.2 Grafana Dashboards
```
Dashboards to Create:
1. Overview Dashboard
   - Requests/sec
   - Error rate
   - P95/P99 latency
   - Active users

2. API Dashboard
   - Per-endpoint latency
   - Error rate by endpoint
   - Cache hit rate
   - Rate limit violations

3. Database Dashboard
   - Query latency
   - Active connections
   - Slow queries
   - Index usage

4. ML Dashboard
   - Prediction latency
   - Model accuracy
   - Training duration
   - Cache hit rate

5. Business Dashboard
   - Properties ingested
   - Listings processed
   - Webhook success rate
   - Alert triggered count
```

#### 4.6.3 Custom Metrics
```typescript
// Track business metrics
propertiesIngested.labels('realestate-au').inc(100);
listingsProcessed.labels('created').inc(50);
webhookDeliveries.labels('property.created', 'success').inc();
```

### Deliverables
- [ ] Prometheus alert rules
- [ ] Grafana dashboards
- [ ] Custom metrics collection
- [ ] Alert notifications configured

---

## 4.7 Disaster Recovery - WEEK 7

### Objective
Prepare for failure scenarios.

### Tasks

#### 4.7.1 Backup Strategy
```bash
# Daily database backup
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +%Y%m%d).sql.gz

# Weekly backup to S3
0 3 * * 0 aws s3 cp /backups/db-$(date +%Y%m%d).sql.gz s3://backups/
```

#### 4.7.2 RTO/RPO Targets
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 1 hour

#### 4.7.3 Disaster Recovery Runbook
```
1. Database Failure
   - Check pg_dump backups
   - Restore from latest backup
   - Verify data integrity
   - Restart API service

2. Redis Failure
   - Restart Redis container
   - Rebuild cache from database
   - Verify cache coherence

3. ML Service Down
   - Detect circuit breaker opened
   - Return cached predictions
   - Alert operations team
   - Manual restart procedure

4. Complete Outage
   - Restore from backup
   - Update DNS to failover IP
   - Run smoke tests
   - Monitor error rate
```

### Deliverables
- [ ] Backup automation script
- [ ] Restore procedure tested
- [ ] Disaster recovery runbook
- [ ] Team training completed

---

## 4.8 Load Testing & Optimization - WEEK 8

### Objective
Validate production readiness at scale.

### Tests to Run
1. **Steady State**: 100 req/s for 10 minutes
2. **Ramp Up**: 10 → 1000 req/s over 10 minutes
3. **Spike**: 100 → 500 req/s instant
4. **Soak**: 50 req/s for 24 hours
5. **Stress**: Increase until failure

### Success Criteria
- P95 latency: < 200ms at all load levels
- Error rate: < 0.1% at all load levels
- CPU utilization: < 80%
- Memory utilization: < 85%
- No crashes or restarts

### Deliverables
- [ ] k6 test execution completed
- [ ] Performance report generated
- [ ] Bottlenecks identified and fixed
- [ ] Production readiness approved

---

## Timeline

```
Week 1: API Resilience (4.1)
Week 2: Database Optimization (4.2)
Week 3: Caching Strategy (4.3)
Week 4: Security Hardening (4.4)
Week 5-6: Performance Optimization (4.5)
Week 7: Monitoring + Disaster Recovery (4.6 + 4.7)
Week 8: Load Testing (4.8)
```

**Total: 8 weeks (~320 hours)**

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| API P95 Latency | < 200ms | ? |
| API Error Rate | < 0.1% | ? |
| Cache Hit Rate | > 80% | ? |
| Database Query P95 | < 100ms | ? |
| ML Prediction Time | < 50ms | ? |
| System Uptime | > 99.9% | ? |
| Test Coverage | > 80% | ? |

## Acceptance Criteria

- [ ] All performance targets met
- [ ] Security audit passed
- [ ] Load test at 1000 req/s passing
- [ ] Disaster recovery tested
- [ ] Monitoring dashboards live
- [ ] Team trained on operations
- [ ] Runbooks documented
- [ ] No critical vulnerabilities

## Risks

1. **Performance Not Met**: Increase caching, optimize queries
2. **Security Issues**: Implement WAF, increase validation
3. **Backup Failures**: Test restore procedures
4. **Team Readiness**: Increase training time

## Sign-Off

- Phase 4 Technical Lead: _______________
- Product Manager: _______________
- Operations Lead: _______________
- Date: _______________
