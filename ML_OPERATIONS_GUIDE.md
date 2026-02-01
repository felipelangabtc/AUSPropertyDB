# AI/ML Operations Guide

**Version**: 1.0
**Created**: February 1, 2026
**Status**: Ready for Production
**Audience**: ML Engineers, Data Scientists, DevOps

---

## Table of Contents

1. [Model Lifecycle Management](#model-lifecycle-management)
2. [Monitoring & Observability](#monitoring--observability)
3. [Performance Optimization](#performance-optimization)
4. [Version Control & Rollback](#version-control--rollback)
5. [Testing & Validation](#testing--validation)
6. [Scaling & Infrastructure](#scaling--infrastructure)
7. [Incident Response](#incident-response)
8. [Cost Optimization](#cost-optimization)

---

## Model Lifecycle Management

### Phase 1: Model Development

**Objective**: Build and validate ML models locally/staging

**Process**:
```
1. Data Collection
   - Gather historical data
   - Ensure 12+ months of data for time series
   - Document data sources and quality

2. Feature Engineering
   - Create derived features
   - Handle missing values
   - Scale and normalize data

3. Model Training
   - Split data (70% train, 15% val, 15% test)
   - Cross-validation (k-fold)
   - Hyperparameter tuning

4. Model Validation
   - Test on holdout set
   - Compare against baseline
   - Check for data leakage

5. Documentation
   - Feature importance
   - Model assumptions
   - Known limitations
```

**Deliverables**:
- Trained model artifact
- Feature definitions
- Performance metrics
- Validation report

### Phase 2: Model Packaging

**Containerization**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy model artifacts
COPY models/ ./models/
COPY src/ ./src/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run model serving
CMD ["python", "src/server.py"]
```

**Requirements**:
```
tensorflow==2.13.0
scikit-learn==1.3.0
pandas==2.0.0
numpy==1.24.0
flask==2.3.0
prometheus-client==0.17.0
```

### Phase 3: Model Deployment

**Registry**:
```bash
# Tag model version
docker tag realestateai/valuation:latest \
  realestateai/valuation:v2.0.1

# Push to registry
docker push realestateai/valuation:v2.0.1

# Deploy to production
kubectl set image deployment/ml-valuation \
  valuation=realestateai/valuation:v2.0.1 \
  -n production --record
```

### Phase 4: Model Monitoring

**Key Metrics**:
- **Prediction Accuracy**: Compare predictions vs actuals
- **Latency**: P95, P99 prediction time
- **Throughput**: Predictions per second
- **Model Drift**: Statistical change detection
- **Data Drift**: Input distribution change
- **Resource Usage**: CPU, memory, GPU

---

## Monitoring & Observability

### Model Performance Metrics

```python
# Tracking predictions and actuals
from prometheus_client import Counter, Histogram

# Prediction accuracy
prediction_accuracy = Gauge(
    'ml_prediction_accuracy',
    'Model prediction accuracy',
    ['model_name', 'model_version']
)

# Prediction latency
prediction_latency = Histogram(
    'ml_prediction_latency_seconds',
    'Model prediction latency',
    ['model_name'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0)
)

# Model drift detection
model_drift_score = Gauge(
    'ml_model_drift_score',
    'Model drift score (0-1)',
    ['model_name', 'model_version']
)

# Data drift detection
data_drift_score = Gauge(
    'ml_data_drift_score',
    'Data drift score (0-1)',
    ['model_name', 'input_feature']
)
```

### Grafana Dashboard

**Dashboard: ML Model Health**

Panels:
1. **Prediction Accuracy Over Time**
   - Query: avg(ml_prediction_accuracy{model_name="valuation"})
   - Alert: Accuracy drop >5%

2. **Prediction Latency (P95)**
   - Query: histogram_quantile(0.95, ml_prediction_latency_seconds)
   - Alert: Latency >200ms

3. **Model Drift Score**
   - Query: ml_model_drift_score
   - Alert: Drift >0.1

4. **Data Drift Scores**
   - Query: ml_data_drift_score
   - Alert: Individual feature drift >0.15

5. **Prediction Throughput**
   - Query: rate(ml_predictions_total[1m])
   - Alert: Throughput drop >30%

---

## Performance Optimization

### Inference Optimization

**Techniques**:

1. **Model Quantization**
   ```python
   # Reduce model size by 75%
   import tensorflow as tf

   converter = tf.lite.TFLiteConverter.from_saved_model(model_path)
   converter.optimizations = [tf.lite.Optimize.DEFAULT]

   tflite_model = converter.convert()
   # Original: 50MB → Quantized: 12.5MB
   ```

2. **Batch Processing**
   ```python
   # Process multiple predictions at once
   batch_size = 100

   for batch in batches:
       predictions = model.predict(batch)
       # Latency: 100 predictions in 500ms (5ms per prediction)
   ```

3. **Model Caching**
   ```python
   # Cache predictions for common inputs
   from functools import lru_cache

   @lru_cache(maxsize=10000)
   def predict_cached(property_hash):
       return model.predict(property_hash)
   ```

4. **GPU Acceleration**
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: ml-server-gpu
   spec:
     containers:
     - name: server
       image: realestateai/valuation:v2.0.1
       resources:
         limits:
           nvidia.com/gpu: 1  # 1 GPU
   ```

### Cost Optimization

**Strategies**:

1. **Right-sizing Compute**
   ```
   Before: n1-highmem-8 ($0.44/hour)
   After: n1-standard-4 ($0.10/hour)
   Savings: 77% ($3,000/month)

   Latency impact: 5ms → 8ms (acceptable)
   ```

2. **Spot Instances**
   ```yaml
   nodeSelector:
     cloud.google.com/gke-preemptible: "true"  # 70% cheaper
   ```

3. **Model Distillation**
   ```
   Original Model: 100MB, 200ms latency
   Distilled Model: 20MB, 30ms latency
   Accuracy: 96% → 94% (acceptable trade-off)
   ```

---

## Version Control & Rollback

### Model Versioning

**Naming Convention**:
```
valuation-v2.0.1-prod-20260201-abc123
├─ model: valuation
├─ semver: v2.0.1
├─ env: prod
├─ date: 20260201
└─ git_hash: abc123
```

**Version Tracking**:
```json
{
  "model": "valuation",
  "version": "v2.0.1",
  "git_commit": "abc123def456",
  "trained_at": "2026-02-01T10:30:00Z",
  "accuracy": 0.962,
  "latency_p95_ms": 85,
  "training_data_version": "v1.3",
  "feature_schema_version": "v2.0",
  "created_by": "ml-engineer@realestate.com"
}
```

### Rollback Procedure

```bash
# List available model versions
kubectl get rollout history deployment/ml-valuation -n production

# Rollback to previous version
kubectl rollout undo deployment/ml-valuation -n production

# Rollback to specific version
kubectl rollout undo deployment/ml-valuation \
  --to-revision=5 -n production

# Monitor rollback
kubectl rollout status deployment/ml-valuation -n production

# Verify new model
curl http://ml-valuation:8000/health
curl -X POST http://ml-valuation:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"property_id": "123"}'
```

---

## Testing & Validation

### Pre-Production Testing

```python
# 1. Unit Tests
def test_valuation_bounds():
    """Test that valuations are within reasonable bounds"""
    result = model.predict(property)
    assert 10000 <= result <= 10000000, "Valuation out of bounds"

# 2. Regression Tests
def test_known_properties():
    """Test against known property valuations"""
    known_data = [
        (property1, expected_value1),
        (property2, expected_value2),
    ]

    for prop, expected in known_data:
        predicted = model.predict(prop)
        error_pct = abs(predicted - expected) / expected
        assert error_pct < 0.05, f"Error > 5%: {error_pct}"

# 3. Performance Tests
def test_latency():
    """Test prediction latency"""
    import time

    start = time.time()
    for _ in range(100):
        model.predict(test_property)
    elapsed = time.time() - start

    avg_latency = elapsed / 100
    assert avg_latency < 0.1, f"Latency > 100ms: {avg_latency}s"

# 4. Fairness Tests
def test_valuation_fairness():
    """Test for bias in valuations"""
    properties_by_location = group_by_location(test_data)

    for location, properties in properties_by_location.items():
        valuations = [model.predict(p) for p in properties]
        price_per_sqm = [v / p.area for v, p in zip(valuations, properties)]

        # Check variance not too high
        variance = statistics.stdev(price_per_sqm)
        expected_variance = 0.1  # 10%
        assert variance < expected_variance, f"High variance in {location}"
```

### A/B Testing

```python
# A/B Test: New valuation model vs baseline
import hashlib

def assign_variant(property_id):
    """Assign property to variant (A or B)"""
    hash_val = int(hashlib.md5(property_id.encode()).hexdigest(), 16)
    return 'new_model' if hash_val % 2 == 0 else 'baseline'

def predict_with_variant(property):
    if assign_variant(property.id) == 'new_model':
        return new_model.predict(property)
    else:
        return baseline_model.predict(property)

# Track results
new_model_accuracy = 0.962
baseline_accuracy = 0.951
improvement = (new_model_accuracy - baseline_accuracy) / baseline_accuracy
# 1.16% improvement ✅
```

---

## Scaling & Infrastructure

### Auto-scaling Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ml-valuation-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ml-valuation
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale up at 70% CPU
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75  # Scale up at 75% memory
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 30  # Gradually scale down
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 10  # Quickly scale up
      - type: Pods
        value: 2
        periodSeconds: 10
      selectPolicy: Max
```

### Resource Requests

```yaml
resources:
  requests:
    cpu: 500m          # 0.5 CPU reserved
    memory: 1Gi        # 1GB reserved
    ephemeral-storage: 10Gi
  limits:
    cpu: 2000m         # 2 CPU max
    memory: 2Gi        # 2GB max
    ephemeral-storage: 20Gi
```

---

## Incident Response

### Model Degradation (Accuracy Drop)

**Symptoms**:
- Accuracy drop >5%
- Systematic errors in specific categories
- User complaints about predictions

**Investigation**:
```python
# 1. Check recent predictions
recent_errors = db.query("""
    SELECT * FROM predictions
    WHERE created_at > NOW() - INTERVAL 1 HOUR
    AND actual IS NOT NULL
    AND ABS(predicted - actual) > THRESHOLD
""")

# 2. Analyze error patterns
errors_by_location = recent_errors.groupby('location').size()
errors_by_price = recent_errors.groupby('price_range').size()

# 3. Check for data drift
from scipy.stats import ks_2samp
drift_score = ks_2samp(training_data, recent_data)

# 4. Review model logs
kubectl logs deployment/ml-valuation -n production --tail=1000
```

**Response**:
1. If data drift detected: Retrain model with new data
2. If model bug: Rollback to previous version
3. If infrastructure: Restart pods or scale

### High Latency (>500ms)

**Investigation**:
```bash
# Check pod resource usage
kubectl top pods -l app=ml-valuation

# Check GPU usage (if applicable)
kubectl exec ml-valuation-pod -- nvidia-smi

# Profile model inference
python -m cProfile -s cumtime inference.py

# Check queue depth
kubectl logs ml-valuation -f | grep "queue"
```

**Solutions**:
- Scale up replicas (HPA)
- Reduce batch size
- Enable model quantization
- Add GPU resources

---

## Cost Optimization

### Monthly Cost Breakdown

```
Compute:       $2,000 (4× n1-standard-4)
Storage:       $  300 (model artifacts, features)
BigQuery:      $  500 (model training data)
GPUs (optional): $1,000 (if using)
─────────────────
Total:         $3,800/month
```

### Optimization Strategy

1. **Batch Inference** (70% cost reduction)
   ```python
   # Instead of: 1000 inference requests at 10ms each = 10s
   # Use: 1 batch of 1000 at 500ms = 0.5s
   # 20× faster, 95% cheaper
   ```

2. **Model Caching** (50% reduction)
   - Cache predictions for common inputs
   - Time-to-live: 1 day for most predictions
   - Save on redundant inference

3. **Scheduled Retraining** (optimize timing)
   - Retrain during off-peak hours (2-4 AM)
   - Use spot instances for training
   - 50% cheaper training infrastructure

---

## Checklist

### Daily
- [ ] Check model accuracy metrics
- [ ] Monitor prediction latency
- [ ] Review error logs
- [ ] Verify all pods are healthy

### Weekly
- [ ] Analyze model drift
- [ ] Review cost metrics
- [ ] Check data quality
- [ ] Test fallback models

### Monthly
- [ ] Performance review
- [ ] Cost optimization analysis
- [ ] Model retraining evaluation
- [ ] Documentation updates
- [ ] Team knowledge sharing

---

**Status**: Production Ready
**Last Updated**: February 1, 2026
**Next Review**: May 1, 2026
