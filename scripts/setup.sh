#!/usr/bin/env bash
# CAT Smart Operator Assistant — one-command setup
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "=== CAT Ops Setup ==="

# Python deps
pip install -r requirements.txt --quiet

# Generate dataset if missing
if [ ! -f "$ROOT/operator_sessions.csv" ]; then
  echo "Generating synthetic dataset..."
  cd "$ROOT/data" && python generate_dataset.py && cd "$ROOT"
else
  echo "Dataset already exists — skipping generation."
fi

# Train models if any are missing
TRAIN_NEEDED=0
for model in anomaly_detector task_estimator maintenance_hours_predictor maintenance_component_predictor; do
  [ ! -f "$ROOT/models/${model}.txt" ] && TRAIN_NEEDED=1 && break
done
if [ $TRAIN_NEEDED -eq 1 ]; then
  echo "Training models..."
  cd "$ROOT/models"
  python train_anomaly.py
  python train_estimator.py
  python train_maintenance.py
  cd "$ROOT"
else
  echo "All models already trained — skipping."
fi

# Frontend deps
if [ -d "$ROOT/frontend" ] && [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd "$ROOT/frontend" && npm install --silent && cd "$ROOT"
fi

echo ""
echo "=== Setup complete ==="
echo "  Backend:  uvicorn api.main:app --reload --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo "  Optional: ollama pull qwen2.5vl:7b"
