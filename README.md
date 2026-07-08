# Electric Bicycle Battery Life Predictor

This project predicts electric bicycle battery SOH and remaining useful life from CALB degradation data plus user riding and charging habits.

## What Is Implemented

- CALB pickle inspection for `dataset/CALB/*.pkl`.
- Cycle-level feature engineering into `data/processed/cycle_features.csv`.
- Grouped train/test split by `cell_id`.
- XGBoost SOH baseline with saved model artifacts.
- User behavior mapping from ordinary inputs to DOD, equivalent cycles, battery chemistry prior, temperature exposure, and current stress.
- FastAPI service with `/predict`, `/health`, and a static web app at `/`.
- Tests for mapping, feature extraction, predictor output, and API behavior.

Transformer training is intentionally skipped in v1. The XGBoost baseline is the product model and the Transformer path is reserved for a later sequence-model experiment.

## Environment

Use the conda environment named `dachuang`:

```powershell
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
conda run -n dachuang pytest -q
```

## Run The App

```powershell
conda run -n dachuang uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Open:

```text
http://127.0.0.1:8000/
```

## Main Artifacts

- `data/reports/data_structure_report.md`: real CALB pickle structure.
- `data/processed/cycle_features.csv`: all processed cycle rows.
- `data/processed/train.csv`: grouped training split.
- `data/processed/test.csv`: grouped test split.
- `data/plots/`: SOH, capacity, temperature, and voltage trend plots.
- `models/xgboost_model.pkl`: trained XGBoost model.
- `models/model_metadata.json`: feature columns, defaults, metrics.
- `data/reports/model_report.md`: baseline metrics.
- `data/reports/feature_importance.csv`: XGBoost feature importance.

## Verified Baseline

The current CALB dataset contains 27 pickle files and 2791 usable cycle rows. The saved split keeps whole cells together instead of randomly mixing cycles from the same cell.

Current XGBoost baseline:

- Train rows: 2196
- Test rows: 595
- MAE: 0.005945 SOH
- RMSE: 0.009101 SOH
- R2: 0.865801

The top feature-importance drivers in the current run are discharge time, ambient temperature, charge time, temperature mean, and cycle index.

## API Example

```json
{
  "battery_type": "LFP",
  "voltage": 48,
  "capacity_ah": 20,
  "battery_age_months": 18,
  "charge_start_soc": 20,
  "charge_end_soc": 90,
  "weekly_charge_times": 4,
  "driving_style": "normal",
  "city": "Chengdu",
  "parking_environment": "outdoor_sunlight",
  "load_condition": "single",
  "long_term_storage": "often"
}
```

The response includes SOH, remaining months, risk level, degradation factors, suggestions, and mapped physical features.

Current user-cycle mapping:

```text
single_charge_dod = (charge_end_soc - charge_start_soc) / 100
annual_equivalent_cycles = single_charge_dod * weekly_charge_times * 52
estimated_cycles_elapsed = annual_equivalent_cycles * battery_age_months / 12
```

## Limitations

- User inputs cannot fully reproduce laboratory current, temperature, and voltage sequences, so `/predict` combines the trained XGBoost estimate with a conservative usage-based mapping layer.
- Battery type affects the heuristic lifecycle prior. The saved XGBoost model is still trained from CALB lab cycle features, not user chemistry labels.
- The v1 model is calibrated on the included CALB cells. More e-bike field data would improve user-level accuracy.
- Transformer training is not part of v1; `src/train_transformer.py` documents the future experiment path.
