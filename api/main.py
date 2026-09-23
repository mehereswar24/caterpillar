from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .safety import router as safety_router
from .voice import router as voice_router
from .anomaly import router as anomaly_router
from .tasks import router as tasks_router
from .training import router as training_router
from .incidents import router as incidents_router
from .maintenance import router as maintenance_router
from .operator import router as operator_router
from .fleet import router as fleet_router

app = FastAPI(title="CAT Smart Operator Assistant API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(safety_router, prefix="/safety", tags=["Safety"])
app.include_router(voice_router, prefix="/voice", tags=["Voice"])
app.include_router(anomaly_router, prefix="/anomaly", tags=["Anomaly"])
app.include_router(tasks_router, prefix="/task", tags=["Tasks"])
app.include_router(training_router, prefix="/training", tags=["Training"])
app.include_router(incidents_router, prefix="/incidents", tags=["Incidents"])
app.include_router(maintenance_router, prefix="/maintenance", tags=["Maintenance"])
app.include_router(operator_router, prefix="/operator", tags=["Operator"])
app.include_router(fleet_router, prefix="/fleet", tags=["Fleet"])

@app.get("/")
def read_root():
    return {"message": "CAT Smart Operator API is running."}
