#!/usr/bin/env bash
set -e

echo "==> Installing Node dependencies..."
cd server && npm install && cd ..

echo "==> Installing Python dependencies..."
pip3 install scikit-learn pandas numpy joblib 2>/dev/null || pip install scikit-learn pandas numpy joblib

echo "==> Generating dataset and training model if not present..."
if [ ! -f "model/task_time_model.joblib" ]; then
  cd model && python3 generate_data.py && python3 predictor.py train && cd ..
else
  echo "Model already exists, skipping training."
fi

echo "==> Build complete."
