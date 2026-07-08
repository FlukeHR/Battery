# Agent Guide

This file contains stable project instructions for future agents. Put changing progress, next steps, and known issues in `STATUS.md`.

## Project Goal

Build an electric bicycle battery life predictor that combines:

- CALB experimental battery aging data
- Reproducible feature engineering
- An explainable XGBoost SOH baseline
- A user behavior mapping layer
- A FastAPI service and static web prototype

The app should return SOH, estimated remaining useful life, main degradation factors, and user-friendly suggestions.

## Current Architecture

```text
dataset/CALB/*.pkl
  -> src.inspect_pkl
  -> data/reports/data_structure_report.md
  -> src.feature_engineering
  -> data/processed/cycle_features.csv, train.csv, test.csv
  -> src.train_xgboost
  -> models/xgboost_model.pkl, models/model_metadata.json
  -> src.user_mapping + src.predictor
  -> api.main / web/static
```

Key modules:

- `src/data_loader.py`: locate and load CALB pickle files.
- `src/inspect_pkl.py`: inspect actual pickle structure and write the structure report.
- `src/feature_engineering.py`: extract cycle-level features and SOH labels.
- `src/train_xgboost.py`: train and save the XGBoost baseline.
- `src/user_mapping.py`: map ordinary user inputs to physical/model features.
- `src/predictor.py`: load model, predict SOH/RUL, and generate explanations.
- `api/main.py`: FastAPI app with `/`, `/health`, and `/predict`.
- `web/static/`: static app prototype.

## Environment

Use the conda environment named `dachuang`.

Run commands through `conda run` unless there is a specific reason not to:

```powershell
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
conda run -n dachuang pytest -q
conda run -n dachuang uvicorn api.main:app --host 127.0.0.1 --port 8000
```

## Data Contract

Raw data lives in:

```text
dataset/CALB/*.pkl
```

Current inspected CALB files are dictionaries with:

- top-level metadata such as `cell_id`, `nominal_capacity_in_Ah`, `depth_of_charge`, `depth_of_discharge`
- `cycle_data`, a list of cycle dictionaries
- per-cycle arrays: `current_in_A`, `voltage_in_V`, `charge_capacity_in_Ah`, `discharge_capacity_in_Ah`, `time_in_s`, `temperature_in_C`, `internal_resistance_in_ohm`

SOH definition:

```text
SOH = current cycle capacity / first valid cycle capacity
```

End of life:

```text
SOH <= 0.80
```

## Modeling Rules

- Always inspect pickle structure before changing feature engineering.
- Keep XGBoost as the first working baseline and comparison target.
- Do not train or promote Transformer models before the XGBoost pipeline is reproducible.
- Use grouped train/test splitting by `cell_id` to reduce same-cell leakage.
- Save generated processed datasets, reports, plots, model, and metadata.
- Keep predictions explainable through mapped features, risk factors, suggestions, and feature importance.

## User Mapping Rules

Ordinary users should not be asked for lab terms such as SOH, DOD, C-rate, or internal resistance.

Map user inputs to model features in `src/user_mapping.py` and `src/predictor.py`:

- Battery type -> nominal cycle-life prior and chemistry aging factors.
- Battery voltage and capacity -> battery energy and model nominal capacity.
- Charge start/end SOC -> single-charge DOD.
- Single-charge DOD, weekly charge frequency, and age -> estimated elapsed equivalent cycles.
- Driving style and load -> current/stress estimate.
- City and parking environment -> estimated temperature exposure.
- Long-term storage -> calendar-aging risk, risk factors, and suggestions.
- SOC habits -> DOC, DOD, risk factors, and suggestions.

If a model feature cannot be inferred from user input, use the training-set median default stored in `models/model_metadata.json`.

## API Contract

Main endpoint:

```text
POST /predict
```

Response must include:

- `soh`
- `soh_percent`
- `estimated_remaining_months`
- `estimated_remaining_years`
- `risk_level`
- `main_degradation_factors`
- `suggestions`
- `mapped_features`
- `model_used`

## Quality Gates

Before claiming completion, run:

```powershell
conda run -n dachuang pytest -q
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
```

For API changes, also smoke test:

```powershell
conda run -n dachuang python -c "from fastapi.testclient import TestClient; from api.main import app; c=TestClient(app); print(c.get('/health').json())"
```

## Guardrails

- Do not hard-code assumptions about future pickle schemas.
- Do not mix dynamic project status into this file; update `STATUS.md` instead.
- Do not delete raw data.
- Do not overwrite trained artifacts without rerunning the full pipeline and updating reports.
- Do not claim UI/browser verification unless a browser or HTTP smoke test was actually run.
