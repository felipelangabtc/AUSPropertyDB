# Production Deployment Playbook

**Version**: 1.0  
**Created**: February 1, 2026  
**Status**: Ready for Production  
**Audience**: DevOps Engineers, Release Managers  

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Strategies](#deployment-strategies)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Monitoring & Validation](#monitoring--validation)
5. [Rollback Procedures](#rollback-procedures)
6. [Incident Response](#incident-response)
7. [Post-Deployment](#post-deployment)

---

## Pre-Deployment Checklist

### 48 Hours Before Deployment

- [ ] Code review complete (all PRs merged to main)
- [ ] All tests passing (400+ tests, >85% coverage)
- [ ] Security scan complete (no critical vulnerabilities)
- [ ] Performance testing completed (p95 <200ms)
- [ ] Load testing results reviewed (handle 10K req/s)
- [ ] Database migrations tested on staging
- [ ] Rollback procedure documented and tested
- [ ] Communication plan finalized
- [ ] On-call team briefed and ready
- [ ] Monitoring dashboards prepared
- [ ] Alert thresholds configured
- [ ] Slack/PagerDuty integrations verified

### 24 Hours Before Deployment

- [ ] Final code review approved
- [ ] Build artifacts ready (Docker images built and tested)
- [ ] Kubernetes manifests validated
- [ ] Database backups verified (automated backup running)
- [ ] Configuration management reviewed
- [ ] Secrets rotated (if needed)
- [ ] DNS and CDN settings prepared
- [ ] Customer communication sent (if applicable)
- [ ] Support team prepared for increased tickets
- [ ] Deployment window confirmed with stakeholders

### 1 Hour Before Deployment

- [ ] Team in deployment channel (Slack/Teams)
- [ ] PagerDuty on-call armed and ready
- [ ] Monitoring dashboards open
- [ ] Logs streaming (Elasticsearch/Kibana)
- [ ] Load balancer health checks passing
- [ ] Database connections optimal
- [ ] Cache cleared and ready
- [ ] Final security scan run
- [ ] Deployment scripts tested (dry run)

---

## Deployment Strategies

### 1. Blue-Green Deployment (Recommended)

**Best for**: Critical updates, zero-downtime requirements

```
Current State (Blue):
  - API v1.0 (2 pods)
  - DB master
  - Cache warm

New State (Green):
  - API v2.0 (2 pods, parallel)
  - DB master (same)
  - Cache warm

Switch:
  - Route 100% traffic → Green
  - Monitor for 30 min
  - Keep Blue running 30 min (quick rollback)
```

**Timeline**: 60 minutes  
**Risk**: Low (instant rollback)  
**Downtime**: 0 seconds  

### 2. Canary Deployment (Recommended for high-risk changes)

**Best for**: Major feature changes, ML model updates

```
Phase 1 (10 min):
  - Route 5% traffic → v2.0 (1 pod)
  - Monitor error rate, latency
  - 98%+ success = proceed

Phase 2 (15 min):
  - Route 25% traffic → v2.0 (2 pods)
  - Monitor key metrics
  - 98%+ success = proceed

Phase 3 (15 min):
  - Route 50% traffic → v2.0 (3 pods)
  - Monitor end-to-end flow
  - 98%+ success = proceed

Phase 4 (10 min):
  - Route 100% traffic → v2.0
  - Retire v1.0 pods
  - Keep backups 1 hour
```

**Timeline**: 50 minutes  
**Risk**: Very low (progressive rollout)  
**Downtime**: 0 seconds  

### 3. Rolling Deployment

**Best for**: Non-critical updates, maintenance patches

```
Pod 1: v1.0 → v2.0 (drain, deploy, verify)
Pod 2: v1.0 → v2.0 (drain, deploy, verify)
Pod 3: v1.0 → v2.0 (drain, deploy, verify)
```

**Timeline**: 30 minutes  
**Risk**: Medium (brief capacity reduction)  
**Downtime**: 0 seconds  

---

## Step-by-Step Deployment

### Phase 1: Pre-flight Checks (0-5 min)

```bash
# 1. Verify current state
kubectl get pods -n production
kubectl get services -n production
kubectl top nodes

# 2. Check database health
psql -h db.prod -c "SELECT version();"
psql -h db.prod -c "SELECT pg_database.datname FROM pg_database;"

# 3. Check cache
redis-cli -h cache.prod ping
redis-cli -h cache.prod INFO memory

# 4. Verify backups
aws s3 ls s3://backups/prod/ --recursive --human-readable | tail -5

# 5. Check DNS
nslookup api.realestate.com
```

### Phase 2: Deploy New Version (5-15 min)

```bash
# For Blue-Green:
kubectl apply -f deployment-green-v2.0.yaml

# For Canary:
kubectl patch deployment api-canary -p "{\"spec\": {\"replicas\": 1}}"

# For Rolling:
kubectl set image deployment/api api=realestate/api:v2.0 \
  --record -n production

# Verify deployment
kubectl rollout status deployment/api -n production
kubectl logs deployment/api -n production --tail=50
```

### Phase 3: Traffic Routing (15-25 min)

```bash
# For Blue-Green:
kubectl patch service api -p '{"spec": {"selector": {"version": "v2.0"}}}'

# For Canary (use Istio/Linkerd):
kubectl apply -f canary-traffic-split.yaml

# For Rolling:
kubectl wait --for=condition=ready pod \
  -l app=api,version=v2.0 --timeout=300s

# Verify routing
curl -H "User-Agent: debug" https://api.realestate.com/health
```

### Phase 4: Health Checks (25-35 min)

```bash
# Check API responses
curl https://api.realestate.com/health -v
curl https://api.realestate.com/api/v1/properties -H "Authorization: Bearer $TOKEN"

# Check application metrics
curl https://api.realestate.com/metrics | grep http_requests_total

# Check database queries
psql -h db.prod -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"

# Monitor logs in real-time
kubectl logs -f deployment/api -n production

# Check error rate (Prometheus)
curl http://prometheus:9090/api/v1/query?query=rate(http_requests_total%5B1m%5D)
```

### Phase 5: Load Testing (Optional, 35-50 min)

```bash
# Run smoke test (50 concurrent users)
ab -n 1000 -c 50 https://api.realestate.com/api/v1/properties

# Run load test (100 concurrent users)
# Using Apache Bench, JMeter, or Locust
locust -f load_test.py -u 100 -r 10 --run-time 5m

# Monitor during test
watch kubectl top pods -n production
```

### Phase 6: Monitor & Validate (50-60 min)

```bash
# Create monitoring dashboard (Grafana)
1. Open Grafana dashboard
2. Select "Deployment Validation"
3. Monitor for 10 minutes:
   - Error rate (target: <0.1%)
   - P95 latency (target: <200ms)
   - CPU usage (target: <60%)
   - Memory usage (target: <70%)
   - Cache hit rate (target: >90%)
   - Database connections (target: <80%)

# Check all alerts
kubectl get alerts -n production
```

### Phase 7: Finalize Deployment (60+ min)

```bash
# For Blue-Green: Retire old version after 30 min
kubectl delete deployment api-blue -n production

# For Canary: Complete the rollout
kubectl patch deployment api \
  -p '{"spec": {"selector": {"version": "v2.0"}}}'

# Verify final state
kubectl get deployment api -n production
kubectl get pods -n production

# Document deployment
echo "Deployment completed: $(date)" >> /var/log/deployments.log
```

---

## Monitoring & Validation

### Real-Time Monitoring

**Dashboards**:
- Deployment Health (Kubernetes events, pod status)
- Application Metrics (requests, latency, errors)
- Infrastructure Metrics (CPU, memory, disk)
- Business Metrics (users online, transactions)

**Key Metrics to Monitor**:

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Error Rate | <0.1% | >0.5% | >1% |
| P95 Latency | <200ms | >300ms | >500ms |
| P99 Latency | <500ms | >750ms | >1000ms |
| CPU Usage | <50% | >60% | >80% |
| Memory Usage | <60% | >70% | >85% |
| Disk Usage | <70% | >80% | >90% |
| Cache Hit Rate | >90% | <85% | <75% |
| DB Connection Pool | <80% | >85% | >95% |
| Queue Depth | <100 | >500 | >1000 |

### Automated Checks

```bash
# Error rate check
ERROR_RATE=$(curl -s http://prometheus:9090/api/v1/query?query=rate(http_requests_total%7Bstatus=%22500%22%7D%5B5m%5D) | jq '.data.result[0].value[1]' | tr -d '"')

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "ERROR: Error rate too high: $ERROR_RATE"
  exit 1
fi

# Latency check
P95_LATENCY=$(curl -s http://prometheus:9090/api/v1/query?query=histogram_quantile\(0.95,http_request_duration_seconds\) | jq '.data.result[0].value[1]' | tr -d '"')

if (( $(echo "$P95_LATENCY > 0.2" | bc -l) )); then
  echo "WARNING: P95 latency high: ${P95_LATENCY}s"
fi
```

### Manual Validation

**Test User Flows**:
1. Property Search → Retrieve list (10 results)
2. Property Details → Load full details
3. User Login → Authentication flow
4. Create Inquiry → End-to-end transaction
5. Analytics Query → BigQuery integration
6. ML Valuation → ML model inference

---

## Rollback Procedures

### Automatic Rollback (Canary)

```yaml
kind: CanaryDeployment
metadata:
  name: api-canary
spec:
  target: 100
  threshold: 98  # % success rate
  interval: 5m
  rollback:
    trigger: FAILURE
    duration: 5m
    strategy: INSTANT
```

### Manual Rollback (Blue-Green)

```bash
# Immediate rollback to previous version
kubectl patch service api -p '{"spec": {"selector": {"version": "v1.0"}}}'

# Verify rollback
curl https://api.realestate.com/health

# Scale down new version
kubectl scale deployment api-v2 --replicas=0

# Monitor rollback
kubectl logs deployment/api -f
```

### Database Rollback

```bash
# If database migrations were part of deployment:

# List available backups
aws s3 ls s3://backups/prod/ --recursive

# Restore database to pre-deployment state
# (WARNING: This causes downtime, use only if necessary)

pg_restore -h db.prod \
  -d realestatedb \
  -Fc s3://backups/prod/db-backup-2026-02-01-10-00.sql
```

### Communication During Rollback

```bash
# Alert team
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🔴 DEPLOYMENT ROLLBACK IN PROGRESS",
    "attachments": [{
      "color": "danger",
      "text": "Rolling back to v1.0 due to error rate spike"
    }]
  }'

# Update status page
curl -X PATCH https://status.realestate.com/api/v1/incidents/123 \
  -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
  -d '{"status": "investigating"}'
```

---

## Incident Response

### Error Rate Spike (>1%)

```
1. Alert triggered by monitoring
2. Immediate actions:
   - Trigger rollback if automated (canary)
   - Manually rollback if manual (blue-green)
   - Check error logs for root cause
   
3. Investigation:
   - Query error logs (Kibana)
   - Check recent code changes
   - Review deployment changes
   - Check external service health
   
4. Resolution:
   - If infrastructure: Scale up resources
   - If code: Rollback to stable version
   - If external: Failover or use fallback
   
5. Post-incident:
   - Root cause analysis
   - Process improvement
   - Monitoring enhancement
```

### High Latency (P95 >500ms)

```
1. Check dashboard for bottleneck:
   - Database queries (query logs)
   - Cache hit rate (Redis stats)
   - External API calls (distributed tracing)
   - Resource contention (CPU/memory)

2. Quick fixes:
   - Increase query timeout
   - Clear cache and rebuild
   - Add database indexes
   - Scale up affected service

3. Longer-term fixes:
   - Optimize slow queries
   - Improve caching strategy
   - Refactor expensive operations
```

### Database Connection Issues

```
1. Check connection pool:
   kubectl logs deployment/api -f | grep "pool exhausted"

2. Actions:
   - Increase pool size (CONFIG_DB_POOL_SIZE)
   - Restart pod to reset connections
   - Scale up replicas to distribute load
   
3. Investigation:
   - Check for connection leaks
   - Review query duration
   - Monitor connection lifecycle
```

---

## Post-Deployment

### 1 Hour Post-Deployment

- [ ] All health checks green
- [ ] Error rate normal (<0.1%)
- [ ] Latency within targets
- [ ] Users actively using platform
- [ ] No error spikes
- [ ] Analytics showing normal traffic patterns

### 4 Hours Post-Deployment

- [ ] Document any issues encountered
- [ ] Update runbooks if needed
- [ ] Review metrics and performance
- [ ] Check user feedback (Intercom, support tickets)
- [ ] Archive deployment logs
- [ ] Update deployment timeline

### 24 Hours Post-Deployment

- [ ] All systems operating normally
- [ ] No degradation in performance
- [ ] Customer satisfaction maintained
- [ ] Team debrief scheduled
- [ ] Lessons learned documented
- [ ] Post-deployment tasks completed

### Communication

```bash
# Send post-deployment report
cat <<EOF > deployment_report.txt
DEPLOYMENT REPORT
Date: $(date)
Version: v2.0
Duration: 60 minutes
Downtime: 0 seconds
Status: ✅ SUCCESSFUL

Metrics:
- Error Rate: 0.02% (target: <0.1%)
- P95 Latency: 145ms (target: <200ms)
- CPU Peak: 58% (target: <80%)
- Memory Peak: 62% (target: <85%)

Issues Encountered: None
Rollbacks: 0

Next Deployment: $(date -d '+2 weeks')
EOF

# Send to team
mail -s "Deployment Report v2.0" team@realestate.com < deployment_report.txt
```

---

## Deployment Checklist Template

```bash
#!/bin/bash

DEPLOYMENT_ID=$(date +%s)
LOG_FILE="/var/log/deployments/${DEPLOYMENT_ID}.log"

echo "=== DEPLOYMENT CHECKLIST ===" | tee $LOG_FILE

# Pre-flight
echo "[1/7] Running pre-flight checks..."
# ... checks ...

# Deploy
echo "[2/7] Deploying new version..."
# ... deployment ...

# Health checks
echo "[3/7] Running health checks..."
# ... health checks ...

# Monitoring
echo "[4/7] Monitoring metrics..."
# ... monitoring ...

# Validation
echo "[5/7] Validating deployment..."
# ... validation ...

# Cleanup
echo "[6/7] Cleaning up old version..."
# ... cleanup ...

# Finalize
echo "[7/7] Finalizing deployment..."
# ... finalization ...

echo "=== DEPLOYMENT COMPLETE ===" | tee -a $LOG_FILE
```

---

## Emergency Procedures

### Complete Rollback (Last Resort)

```bash
#!/bin/bash

# Emergency rollback script (run only if all else fails)

echo "🚨 INITIATING EMERGENCY ROLLBACK"

# 1. Notify all stakeholders
echo "Alerting team..."
# Send alerts

# 2. Immediate traffic redirect
echo "Redirecting traffic to v1.0..."
kubectl patch service api -p '{"spec": {"selector": {"version": "v1.0"}}}'

# 3. Scale down problematic version
echo "Scaling down v2.0..."
kubectl scale deployment api-v2 --replicas=0

# 4. Verify fallback working
echo "Verifying v1.0..."
sleep 10
curl https://api.realestate.com/health

# 5. Document incident
echo "Incident occurred at: $(date)" >> /var/log/incidents.log
```

---

## Deployment Sign-Off

**Deployment Manager**:  
Name: _________________ Date: _________

**Technical Lead**:  
Name: _________________ Date: _________

**DevOps Engineer**:  
Name: _________________ Date: _________

---

## Appendix: Useful Commands

```bash
# View deployment status
kubectl rollout status deployment/api -n production

# View pod logs
kubectl logs -f pod/api-xyz -n production

# Describe pod (for troubleshooting)
kubectl describe pod/api-xyz -n production

# Scale deployment
kubectl scale deployment api --replicas=5 -n production

# Restart pods
kubectl rollout restart deployment/api -n production

# Get events
kubectl get events -n production --sort-by='.lastTimestamp'

# Edit configuration
kubectl edit deployment/api -n production

# View resource usage
kubectl top pods -n production
```

---

**Version**: 1.0  
**Last Updated**: February 1, 2026  
**Next Review**: May 1, 2026  

