import sys
from pathlib import Path

# Make the repo root importable so `from engine import ...` picks up the
# real implementations in <repo>/engine/ rather than the backend/engine/ stubs.
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, employees, dashboard, gaps, simulator

app = FastAPI(title="PayGap Radar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:8000", "http://localhost:8001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(gaps.router, prefix="/api")
app.include_router(simulator.router, prefix="/api")
