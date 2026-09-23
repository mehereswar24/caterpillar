# CAT Smart Operator Assistant

AI-powered safety, coaching, and efficiency platform for CAT 320 excavator operators.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | SQLite (better-sqlite3) |
| AI Models | LightGBM + Random Forest + XGBoost |
| Vision AI | Qwen2.5-VL:7b via Ollama |
| Voice AI | Qwen2.5:7b via Ollama + BM25 RAG |
| Deployment | Render |

## Live API

```
https://caterpillar-stack.onrender.com
```

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predict` | Task time prediction — RF + XGBoost ensemble, 20 features |
| POST | `/api/anomaly/detect` | Anomaly classification — 7 fault classes, LightGBM |
| GET | `/api/anomaly/scan` | Scan all 5 machines for anomalies |
| POST | `/api/maintenance/predict` | Hours until next service — LightGBM |
| GET | `/api/maintenance/status` | Maintenance urgency for a machine |
| POST | `/api/fuel/check` | Fuel sufficiency + GPS nearest station + range |
| GET | `/api/fuel/status` | Quick fuel alert for dashboard |
| POST | `/api/voice/ask` | RAG voice assistant — BM25 + Qwen2.5:7b |
| POST | `/api/vision/analyze` | Vision analysis — Qwen2.5-VL:7b |
| POST | `/api/vision/seatbelt` | Seatbelt compliance check |
| POST | `/api/vision/proximity` | Worker proximity detection |
| POST | `/api/vision/fatigue` | Operator fatigue detection |
| POST | `/api/auth/face` | Face authentication — Qwen2.5-VL |
| GET | `/api/dashboard` | Dashboard summary |
| GET | `/api/safety-alerts` | Live safety alerts |
| GET | `/api/machines` | Fleet machine data |
| GET | `/api/operators` | Operator profiles |
| GET | `/api/training/:operatorId` | Personalised training modules |
| GET | `/api/maintenance/status` | Machine maintenance status |

## ML Models

| Model | Algorithm | Performance |
|---|---|---|
| Task Time Predictor | RF + XGBoost Ensemble | MAE 20 min (XGB), 25 min (RF) |
| Anomaly Classifier | LightGBM — 7 classes | F1-macro 0.9947 |
| Maintenance Predictor | LightGBM regressor | MAE 81 hours |
| Fuel Sufficiency | LightGBM classifier + regressor | F1 0.9925, MAE 2.87L |

Model files and training scripts: [caterpillar-models](https://github.com/mehereswar24/caterpillar-models)

## Features

1. **Real-Time Safety** — LightGBM anomaly classifier, Qwen2.5-VL vision (seatbelt, proximity, fatigue), face authentication
2. **Task Time Prediction** — RF + XGBoost ensemble, 20 features, confidence range
3. **RAG Voice Assistant** — BM25 + TF-IDF, 8 CAT knowledge base documents, Qwen2.5:7b answers
4. **Maintenance Intelligence** — LightGBM service predictor, rule-based training recommendations
5. **Fuel Intelligence** — LightGBM sufficiency classifier, GPS range calculation, nearest station alert

## Local Setup

```bash
# Backend
cd server
npm install
node src/index.js

# Frontend
cd frontend
npm install
npm run dev
```

### .env (server/)
```
PORT=5000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TEXT_MODEL=qwen2.5:7b
OLLAMA_VISION_MODEL=qwen2.5vl:7b
NODE_ENV=development
```

Requires [Ollama](https://ollama.ai) with `qwen2.5:7b` and `qwen2.5vl:7b` pulled locally.

## Repo Structure

```
caterpillar-stack/
├── frontend/          React + Vite + Tailwind
│   └── src/
│       ├── pages/     Dashboard, FaceAuth, Predict, Safety, Anomaly, Maintenance, Training, Supervisor
│       └── components/ TruckSimulator, VoiceAgent, ProximityRadar, VoiceBar, TaskCard
└── server/            Node.js + Express
    └── src/
        ├── index.js
        └── routes/    14 route files
```
