from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from xgboost import XGBRegressor

from src.config import MODEL_DIR, PROCESSED_DIR, RANDOM_STATE, REPORTS_DIR
from src.evaluate import regression_metrics


FEATURE_COLUMNS = [
    "cycle_index",
    "cycle_position",
    "nominal_capacity_in_Ah",
    "DOD",
    "DOC",
    "ambient_temperature_in_C",
    "voltage_mean",
    "voltage_std",
    "voltage_min",
    "voltage_max",
    "current_mean",
    "current_std",
    "current_min",
    "current_max",
    "current_abs_mean",
    "current_abs_max",
    "temperature_mean",
    "temperature_max",
    "charge_time",
    "discharge_time",
    "C_rate",
]


def _available_features(df: pd.DataFrame) -> list[str]:
    return [column for column in FEATURE_COLUMNS if column in df.columns]


def train_model(
    train_csv: str | Path = PROCESSED_DIR / "train.csv",
    test_csv: str | Path = PROCESSED_DIR / "test.csv",
    model_dir: str | Path = MODEL_DIR,
) -> dict[str, float]:
    train_df = pd.read_csv(train_csv)
    test_df = pd.read_csv(test_csv)
    feature_columns = _available_features(train_df)
    defaults = train_df[feature_columns].median(numeric_only=True).fillna(0.0).to_dict()

    x_train = train_df[feature_columns].fillna(defaults)
    y_train = train_df["soh"]
    x_test = test_df[feature_columns].fillna(defaults)
    y_test = test_df["soh"]

    model = XGBRegressor(
        n_estimators=350,
        max_depth=4,
        learning_rate=0.035,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:squarederror",
        random_state=RANDOM_STATE,
        n_jobs=0,
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    metrics = regression_metrics(y_test, predictions)

    model_path = Path(model_dir)
    model_path.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path / "xgboost_model.pkl")

    metadata: dict[str, Any] = {
        "feature_columns": feature_columns,
        "defaults": {key: float(value) for key, value in defaults.items()},
        "metrics": metrics,
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
    }
    (model_path / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    importance = pd.DataFrame(
        {
            "feature": feature_columns,
            "importance": model.feature_importances_,
        }
    ).sort_values("importance", ascending=False)
    importance.to_csv(REPORTS_DIR / "feature_importance.csv", index=False)
    (REPORTS_DIR / "model_report.md").write_text(
        "# XGBoost Baseline Report\n\n"
        f"- Train rows: {len(train_df)}\n"
        f"- Test rows: {len(test_df)}\n"
        f"- MAE: {metrics['mae']:.6f}\n"
        f"- RMSE: {metrics['rmse']:.6f}\n"
        f"- R2: {metrics['r2']:.6f}\n"
        "- Split: grouped by `cell_id` to reduce same-cell leakage\n"
        "- Model: `models/xgboost_model.pkl`\n"
        "- Metadata: `models/model_metadata.json`\n",
        encoding="utf-8",
    )
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train XGBoost SOH baseline.")
    parser.add_argument("--train-csv", default=str(PROCESSED_DIR / "train.csv"))
    parser.add_argument("--test-csv", default=str(PROCESSED_DIR / "test.csv"))
    parser.add_argument("--model-dir", default=str(MODEL_DIR))
    args = parser.parse_args()
    metrics = train_model(args.train_csv, args.test_csv, args.model_dir)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
