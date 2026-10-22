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
    battery_chemistry: str = "ncm",
    reports_dir: str | Path = REPORTS_DIR,
) -> dict[str, float]:
    train_df = pd.read_csv(train_csv)
    test_df = pd.read_csv(test_csv)
    if battery_chemistry not in {"ncm", "lfp"}:
        raise ValueError(f"Unsupported chemistry: {battery_chemistry}")
    for frame in (train_df, test_df):
        if "battery_chemistry" not in frame:
            raise ValueError("Run src.run_feature_pipeline to label dataset chemistry before training")
    train_df = train_df[train_df["battery_chemistry"] == battery_chemistry].copy()
    test_df = test_df[test_df["battery_chemistry"] == battery_chemistry].copy()
    if train_df.empty or test_df.empty:
        raise ValueError(f"No train/test rows for {battery_chemistry}")
    if set(train_df["cell_id"]) & set(test_df["cell_id"]):
        raise ValueError("Train/test split must keep whole cells separate")
    datasets = sorted(train_df["dataset"].unique().tolist())
    if set(datasets) != set(test_df["dataset"]):
        raise ValueError("Every dataset must be represented in both train and test")
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
    dataset_metrics = {
        name: regression_metrics(y_test.loc[group.index], predictions[test_df.index.isin(group.index)])
        for name, group in test_df.groupby("dataset")
    }

    model_path = Path(model_dir)
    model_path.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path / "xgboost_model.pkl")

    metadata: dict[str, Any] = {
        "feature_columns": feature_columns,
        "defaults": {key: float(value) for key, value in defaults.items()},
        "metrics": metrics,
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "battery_chemistry": battery_chemistry,
        "training_datasets": datasets,
        "train_cells": sorted(train_df["cell_id"].unique().tolist()),
        "test_cells": sorted(test_df["cell_id"].unique().tolist()),
        "dataset_metrics": dataset_metrics,
        "imputation": "training median; 0 only for features missing throughout training",
    }
    (model_path / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    report_path = Path(reports_dir)
    report_path.mkdir(parents=True, exist_ok=True)
    importance = pd.DataFrame(
        {
            "feature": feature_columns,
            "importance": model.feature_importances_,
        }
    ).sort_values("importance", ascending=False)
    importance.to_csv(report_path / "feature_importance.csv", index=False)
    (report_path / "model_report.md").write_text(
        "# XGBoost 基线模型报告\n\n"
        f"- 电池化学类型：{battery_chemistry.upper()}\n"
        f"- 训练数据集：{', '.join(datasets)}\n"
        f"- 训练样本数：{len(train_df)}\n"
        f"- 测试样本数：{len(test_df)}\n"
        f"- 平均绝对误差（MAE）：{metrics['mae']:.6f}\n"
        f"- 均方根误差（RMSE）：{metrics['rmse']:.6f}\n"
        f"- 决定系数（R²）：{metrics['r2']:.6f}\n"
        "- 划分方式：按 `cell_id` 分组，避免同一电芯进入训练集和测试集\n"
        f"- 模型文件：`{model_path / 'xgboost_model.pkl'}`\n"
        f"- 元数据文件：`{model_path / 'model_metadata.json'}`\n"
        "- 缺失特征：使用训练集中位数填补；训练集整列缺失时填零\n\n"
        "## 各来源数据集的测试指标\n\n"
        "以下指标基于未参与训练的电芯，JSON 键名与程序中的指标名保持一致。\n\n"
        f"```json\n{json.dumps(dataset_metrics, indent=2, ensure_ascii=False)}\n```\n",
        encoding="utf-8",
    )
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train XGBoost SOH baseline.")
    parser.add_argument("--train-csv", default=str(PROCESSED_DIR / "train.csv"))
    parser.add_argument("--test-csv", default=str(PROCESSED_DIR / "test.csv"))
    parser.add_argument("--model-dir", default=str(MODEL_DIR))
    parser.add_argument("--chemistry", choices=["all", "ncm", "lfp"], default="all")
    parser.add_argument("--reports-dir", default=str(REPORTS_DIR))
    args = parser.parse_args()
    for chemistry in (["ncm", "lfp"] if args.chemistry == "all" else [args.chemistry]):
        model_dir = Path(args.model_dir) / "lfp" if chemistry == "lfp" else Path(args.model_dir)
        reports_dir = Path(args.reports_dir) / "lfp" if chemistry == "lfp" else Path(args.reports_dir)
        metrics = train_model(args.train_csv, args.test_csv, model_dir, chemistry, reports_dir)
        print(chemistry.upper(), json.dumps(metrics, indent=2), flush=True)


if __name__ == "__main__":
    main()
