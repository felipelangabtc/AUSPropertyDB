from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np
import os
import joblib
from sklearn.linear_model import LinearRegression
import redis

app = FastAPI(title="AUSProperty ML Service")

class PredictRequest(BaseModel):
    features: list[float]

class PredictResponse(BaseModel):
    price_prediction: float

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    # Try to use a trained model if available, otherwise fallback to simple mean
    model_path = os.path.join(os.getcwd(), 'models', 'model.joblib')
    cache = None
    try:
        cache = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
    except Exception:
        cache = None

    cache_key = f"ml:predict:{hash(tuple(req.features))}"
    if cache:
        cached = cache.get(cache_key)
        if cached:
            return {"price_prediction": float(cached)}

    if os.path.exists(model_path):
        model = joblib.load(model_path)
        feat = np.array(req.features).reshape(1, -1)
        pred = float(model.predict(feat)[0])
    else:
        if not req.features:
            pred = 0.0
        else:
            feat = np.array(req.features)
            pred = float(np.mean(feat) * 1000)

    if cache:
        try:
            cache.set(cache_key, str(pred), ex=3600)
        except Exception:
            pass

    return {"price_prediction": pred}


@app.post('/train')
def train(data: dict):
    """Train a simple linear regression model.

    Expects payload: { "X": [[...], [...]], "y": [..] }
    """
    model_dir = os.path.join(os.getcwd(), 'models')
    os.makedirs(model_dir, exist_ok=True)
    X = np.array(data.get('X', []))
    y = np.array(data.get('y', []))
    if X.size == 0 or y.size == 0:
        return {"trained": False, "message": "No data provided"}

    model = LinearRegression()
    model.fit(X, y)
    model_path = os.path.join(model_dir, 'model.joblib')
    joblib.dump(model, model_path)
    return {"trained": True, "model_path": model_path}
