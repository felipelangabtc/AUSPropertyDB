AUSProperty ML Service

This is a small FastAPI scaffold used in Phase 3 for price predictions.

Quick start:

```bash
cd apps/ml
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:
- `GET /health` - health check
- `POST /predict` - accepts JSON `{ "features": [..] }` and returns `{ "price_prediction": number }`
