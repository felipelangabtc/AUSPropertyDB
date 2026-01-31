from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import numpy as np
import os
import joblib
import json
from datetime import datetime
import hashlib
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import redis

app = FastAPI(title="AUSProperty ML Service")

class PropertyFeatures(BaseModel):
    bedrooms: Optional[int] = 2
    bathrooms: Optional[int] = 1
    parkingSpaces: Optional[int] = 1
    landSizeM2: Optional[float] = 500
    buildingSizeM2: Optional[float] = 120
    lat: Optional[float] = -33.8688
    lng: Optional[float] = 151.2093
    convenienceScore: Optional[float] = 50

class PredictRequest(BaseModel):
    property: PropertyFeatures
    last_price: Optional[int] = None

class PredictResponse(BaseModel):
    price: Optional[float]
    confidence: Optional[float] = None
    model_version: str = "v1"
    predicted_at: str

class TrainingData(BaseModel):
    properties: list[dict]
    prices: list[float]

@app.get("/health")
def health():
    model_path = os.path.join(os.getcwd(), 'models', 'model.joblib')
    has_model = os.path.exists(model_path)
    return {"status": "ok", "model_available": has_model}

def extract_features(prop: PropertyFeatures) -> np.ndarray:
    """Extract feature vector from property data."""
    return np.array([
        prop.bedrooms or 2,
        prop.bathrooms or 1,
        prop.parkingSpaces or 1,
        prop.landSizeM2 or 500,
        prop.buildingSizeM2 or 120,
        prop.lat or -33.8688,
        prop.lng or 151.2093,
        prop.convenienceScore or 50,
    ])

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Predict price using trained model or fallback heuristic."""
    model_path = os.path.join(os.getcwd(), 'models', 'model.joblib')
    cache = None
    try:
        cache = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
    except Exception:
        cache = None

    # Create cache key from property features
    feat_tuple = tuple(extract_features(req.property).tolist())
    cache_key = f"ml:predict:{hashlib.md5(str(feat_tuple).encode()).hexdigest()}"
    if cache:
        try:
            cached = cache.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass

    # Extract features
    features = extract_features(req.property).reshape(1, -1)

    if os.path.exists(model_path):
        try:
            model_data = joblib.load(model_path)
            model = model_data['model']
            scaler = model_data.get('scaler', None)

            if scaler:
                features_scaled = scaler.transform(features)
            else:
                features_scaled = features

            pred = float(model.predict(features_scaled)[0])
            confidence = 0.75
        except Exception as e:
            print(f"Model prediction error: {e}. Using fallback.")
            pred = float(np.mean(features) * 1000)
            confidence = 0.3
    else:
        # Fallback heuristic when no model available
        pred = float(np.mean(features) * 1000)
        confidence = 0.3

    result = {
        "price": pred,
        "confidence": confidence,
        "model_version": "v1",
        "predicted_at": datetime.utcnow().isoformat(),
    }

    if cache:
        try:
            cache.set(cache_key, json.dumps(result), ex=3600)
        except Exception:
            pass

    return result


@app.post('/train')
def train(data: TrainingData):
    """Train a simple linear regression model.

    Expects payload with properties list and prices list.
    """
    model_dir = os.path.join(os.getcwd(), 'models')
    os.makedirs(model_dir, exist_ok=True)

    try:
        if not data.properties or not data.prices:
            return {"trained": False, "message": "No data provided"}

        if len(data.properties) != len(data.prices):
            return {"trained": False, "message": "Mismatch: properties and prices length differ"}

        # Extract features from all properties
        X = np.array([extract_features(PropertyFeatures(**p)) for p in data.properties])
        y = np.array(data.prices)

        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Train model
        model = LinearRegression()
        model.fit(X_scaled, y)

        # Save model and scaler
        model_path = os.path.join(model_dir, 'model.joblib')
        joblib.dump({'model': model, 'scaler': scaler}, model_path)

        # Clear prediction cache
        cache = None
        try:
            cache = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
            cache.delete('ml:predict:*')
        except Exception:
            pass

        return {
            "trained": True,
            "model_path": model_path,
            "samples": len(data.properties),
            "r_squared": float(model.score(X_scaled, y)),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"trained": False, "error": str(e)}
