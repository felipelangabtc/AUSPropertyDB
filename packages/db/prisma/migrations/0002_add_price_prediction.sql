-- Manual migration: add PricePrediction table

CREATE TABLE IF NOT EXISTS price_prediction (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  model_version TEXT,
  predicted_price INT,
  confidence DOUBLE PRECISION,
  features JSONB,
  predicted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_prediction_property_id ON price_prediction(property_id);
CREATE INDEX IF NOT EXISTS idx_price_prediction_predicted_at ON price_prediction(predicted_at);
