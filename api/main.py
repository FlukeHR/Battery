from __future__ import annotations

from typing import Literal

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from src.config import STATIC_DIR
from src.predictor import load_model_bundle, predict_from_user_input


class PredictionRequest(BaseModel):
    model_config = {"extra": "ignore"}

    battery_type: str = "LFP"
    voltage: float = Field(default=48, gt=0, le=120)
    capacity_ah: float = Field(default=20, gt=0, le=120)
    battery_age_months: float = Field(default=18, ge=0, le=240)
    charge_start_soc: float = Field(default=20, ge=0, le=100)
    charge_end_soc: float = Field(default=100, ge=0, le=100)
    weekly_charge_times: float = Field(default=4, ge=0, le=14)
    driving_style: str = "normal"
    load_condition: str = "single"
    long_term_storage: str = "occasionally"
    city: str = "Chengdu"
    parking_environment: str = "indoor"


class PredictionResponse(BaseModel):
    soh: float
    soh_percent: int
    estimated_remaining_months: int
    estimated_remaining_years: float
    risk_level: Literal["low", "medium", "high"]
    main_degradation_factors: list[str]
    suggestions: list[str]
    mapped_features: dict[str, float]
    model_used: bool
    battery_chemistry: str
    training_datasets: list[str]
    prediction_note: str


app = FastAPI(title="E-bike Battery Life Predictor", version="1.0.0")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", response_model=None)
def index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"message": "Battery Life Predictor API"}


@app.get("/health")
def health() -> dict:
    models = {}
    for chemistry in ("ncm", "lfp"):
        bundle = load_model_bundle(battery_chemistry=chemistry)
        models[chemistry] = {
            "model_loaded": bundle is not None,
            "training_datasets": list(bundle.training_datasets) if bundle else [],
        }
    return {
        "status": "ok",
        "model_loaded": all(model["model_loaded"] for model in models.values()),
        "models": models,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> dict:
    return predict_from_user_input(request.model_dump())
