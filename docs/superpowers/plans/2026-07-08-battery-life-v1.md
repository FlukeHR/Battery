# Battery Life Predictor V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working v1 electric-bicycle battery life prediction app using CALB pickle data, XGBoost SOH regression, user behavior mapping, FastAPI, and a static web prototype.

**Architecture:** CALB pickle files are inspected and converted into cycle-level tabular features. XGBoost trains on those features and the API maps ordinary user inputs into model-compatible features, returning SOH, RUL, degradation factors, and suggestions.

**Tech Stack:** Python 3.12 in conda env `dachuang`, numpy, pandas, scikit-learn, xgboost, matplotlib, joblib, FastAPI, pydantic, pytest.

## Global Constraints

- Do not assume CALB pickle structure before inspection; report real structure first.
- Keep XGBoost as the first working baseline.
- Transformer training is skipped for v1 and left as a documented experiment path.
- Save processed datasets, trained model artifacts, evaluation report, and plots.
- Expose a user-friendly `/predict` API and static app prototype.

---

### Task 1: Project Scaffold and Tests

**Files:**

- Create: `requirements.txt`, `.gitignore`, `README.md`
- Create: `tests/test_user_mapping.py`, `tests/test_feature_engineering.py`, `tests/test_predictor.py`, `tests/test_api.py`

**Interfaces:**

- Produces test-defined APIs for `src.user_mapping`, `src.feature_engineering`, `src.predictor`, and `api.main`.

- [X] Write failing tests for mapping, feature extraction, predictor fallback, and API response.
- [X] Run tests to verify red state.

### Task 2: Core Modules

**Files:**

- Create: `src/__init__.py`, `src/config.py`, `src/data_loader.py`, `src/inspect_pkl.py`
- Create: `src/feature_engineering.py`, `src/user_mapping.py`, `src/predictor.py`

**Interfaces:**

- `estimate_user_features(payload: Mapping[str, Any]) -> dict[str, float | str | list[str]]`
- `extract_cycle_features(cell_data: dict[str, Any]) -> list[dict[str, Any]]`
- `predict_from_user_input(payload: Mapping[str, Any]) -> dict[str, Any]`

- [X] Implement minimal code to pass unit tests.
- [X] Run focused tests, then full tests.

### Task 3: Data Inspection and Feature Pipeline

**Files:**

- Create: `src/run_feature_pipeline.py`
- Generate: `data/reports/data_structure_report.md`
- Generate: `data/processed/cycle_features.csv`, `train.csv`, `test.csv`
- Generate: `data/plots/*.png`

**Interfaces:**

- `build_feature_table(raw_dir: Path) -> pandas.DataFrame`
- `save_processed_datasets(df: pandas.DataFrame, output_dir: Path) -> dict[str, Path]`

- [X] Inspect all CALB pickle files.
- [X] Extract cycle-level features and calculate SOH.
- [X] Save processed CSV files and plots.

### Task 4: XGBoost Baseline

**Files:**

- Create: `src/train_xgboost.py`, `src/evaluate.py`
- Generate: `models/xgboost_model.pkl`, `models/model_metadata.json`
- Generate: `data/reports/model_report.md`, `data/reports/feature_importance.csv`

**Interfaces:**

- `train_model(train_csv: Path, test_csv: Path, model_dir: Path) -> dict[str, float]`
- `load_model_bundle(model_dir: Path) -> ModelBundle`

- [X] Train XGBoost on processed features.
- [X] Save model, feature list, metrics, and feature importance.

### Task 5: API and App Prototype

**Files:**

- Create: `api/__init__.py`, `api/main.py`
- Create: `web/static/index.html`, `web/static/styles.css`, `web/static/app.js`

**Interfaces:**

- `POST /predict`
- `GET /health`
- `GET /`

- [X] Serve API and static web form.
- [X] Verify API with TestClient.

### Task 6: Final Verification

**Files:**

- Update: `README.md`

- [X] Run `pytest`.
- [X] Run data inspection and feature pipeline.
- [X] Run XGBoost training.
- [X] Run API smoke prediction.
- [X] Summarize verified artifacts and remaining limitations.
