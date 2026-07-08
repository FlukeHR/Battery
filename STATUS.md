# Project Status

Last updated: 2026-07-08

## Current State

- Project v1 is implemented with CALB data inspection, cycle feature engineering, XGBoost SOH prediction, FastAPI, and a static web prototype.
- Transformer training is intentionally skipped for v1.
- The project directory is not currently a git repository.
- The Python environment is `dachuang`.

## Verified Artifacts

- Raw data: `dataset/CALB/*.pkl`
- Data structure report: `data/reports/data_structure_report.md`
- Processed data: `data/processed/cycle_features.csv`
- Train/test split: `data/processed/train.csv`, `data/processed/test.csv`
- Plots: `data/plots/*.png`
- Model: `models/xgboost_model.pkl`
- Model metadata: `models/model_metadata.json`
- Model report: `data/reports/model_report.md`
- API: `api/main.py`
- Static app: `web/static/index.html`

## Current Metrics

- CALB pickle files: 27
- Usable cycle rows: 2791
- Train rows: 2196
- Test rows: 595
- Split strategy: grouped by `cell_id`
- XGBoost MAE: 0.005945 SOH
- XGBoost RMSE: 0.009101 SOH
- XGBoost R2: 0.865801
- Tests: 7 passed

## Useful Commands

```powershell
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
conda run -n dachuang pytest -q
conda run -n dachuang uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Open the app at:

```text
http://127.0.0.1:8000/
```

## Done

- Created project structure.
- Inspected CALB pickle structure.
- Generated cycle-level features and SOH labels.
- Saved processed datasets and plots.
- Trained XGBoost baseline.
- Saved model, metadata, metrics, and feature importance.
- Built user behavior mapping layer.
- Built `/predict`, `/health`, and static app UI.
- Added tests for mapping, feature extraction, predictor output, and API behavior.

## Next TODOs

- Add SHAP explanations or per-prediction feature contribution output.
- Add internal resistance features from `internal_resistance_in_ohm`.
- Improve user-to-model mapping with measured e-bike data.
- Add confidence bands or prediction uncertainty.
- Add a calibration/evaluation notebook for model comparison.
- Add optional sequence-model experiment after XGBoost remains the baseline.
- Consider initializing a git repository if version history is needed.

## Known Issues

- User inputs cannot directly reconstruct lab voltage/current/temperature sequences, so some XGBoost features use training-set median defaults.
- The app no longer asks for daily mileage; equivalent cycles are estimated from charge SOC window and weekly charge frequency.
- Battery type is active in the heuristic lifecycle prior, but the saved XGBoost model itself was not retrained with chemistry one-hot features.
- Prediction combines XGBoost SOH with a conservative heuristic blend; this improves product stability but is not a pure lab-model prediction.
- Browser automation was unavailable in the previous verification session, so UI validation was HTTP-level rather than screenshot-level.
- Starting uvicorn as a long-lived hidden background process was unreliable in the managed shell; run it in a terminal with the command above.
