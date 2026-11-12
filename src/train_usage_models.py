"""按完整电芯重训面向使用信息的 SOH 与剩余循环模型。"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor

from src.config import EOL_SOH, PROJECT_ROOT
from src.evaluate import regression_metrics


USAGE_FEATURES = ["cycle_position", "DOD", "DOC", "cold_exposure", "heat_exposure",
                  "charge_c_rate", "discharge_c_rate", "charge_rate_known", "discharge_rate_known"]
MIN_LIFETIME_CELLS = 10
SPLIT_SEED = 20261112


def prepare_usage_features(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    # 环境温度未知不以循环发热温度冒充；只编码超出普通环境的暴露程度。
    ambient = result["ambient_temperature_in_C"]
    result["cold_exposure"] = ((10 - ambient) / 10).clip(lower=0)
    result["heat_exposure"] = ((ambient - 35) / 10).clip(lower=0)
    result["charge_rate_known"] = result["charge_c_rate"].notna().astype(float)
    result["discharge_rate_known"] = result["discharge_c_rate"].notna().astype(float)
    return result


def mask_rates(frame: pd.DataFrame, defaults: dict[str, float], charge: bool, discharge: bool) -> pd.DataFrame:
    inputs = frame[USAGE_FEATURES].copy()
    for available, rate, known in ((charge, "charge_c_rate", "charge_rate_known"),
                                    (discharge, "discharge_c_rate", "discharge_rate_known")):
        if not available:
            inputs[rate], inputs[known] = defaults[rate], 0.0
    return inputs.fillna(defaults)


def grouped_manifest(frame: pd.DataFrame) -> dict[str, str]:
    """来源内按整电芯和是否观察到终点分层；极少数终点仅放训练集。"""
    if (frame.groupby("cell_id")["dataset"].nunique() > 1).any():
        raise ValueError("电芯标识跨来源重复")
    cells = frame.groupby(["dataset", "cell_id"], as_index=False).agg(min_soh=("soh", "min"))
    manifest: dict[str, str] = {}
    for _, source in cells.groupby("dataset"):
        for _, group in source.groupby(source["min_soh"] <= EOL_SOH):
            names = np.array(sorted(group["cell_id"]))
            np.random.default_rng(SPLIT_SEED).shuffle(names)
            holdout = max(1, round(len(names) * 0.2)) if len(names) >= 5 else 1 if len(names) >= 3 else 0
            for index, name in enumerate(names):
                manifest[str(name)] = (
                    "test" if index < holdout else "validation" if index < 2 * holdout else "train"
                )
    if len(manifest) != frame["cell_id"].nunique():
        raise ValueError("电芯标识跨来源重复")
    return manifest


def attach_lifetime_targets(frame: pd.DataFrame) -> pd.DataFrame:
    """终点只作为答案；右删失电芯的精确寿命保持缺失。"""
    groups = []
    for _, group in frame.groupby("cell_id", sort=True):
        group = group.sort_values("cycle_position").copy()
        crossing = group[group["soh"] <= EOL_SOH]
        endpoint = float(crossing.iloc[0]["cycle_position"]) if not crossing.empty else np.nan
        group["observed_eol_position"] = endpoint
        group["remaining_cycles"] = np.maximum(endpoint - group["cycle_position"], 0)
        group["observed_remaining_lower_bound"] = group["cycle_position"].max() - group["cycle_position"]
        groups.append(group)
    return pd.concat(groups, ignore_index=True)


def lifetime_examples(frame: pd.DataFrame, per_cell: int = 80) -> pd.DataFrame:
    selected = []
    for _, group in frame.groupby("cell_id", sort=True):
        group = group[(group["cycle_position"] >= 30) & (group["remaining_cycles"] > 0)]
        if not group.empty:
            indices = np.unique(np.linspace(0, len(group) - 1, min(per_cell, len(group)), dtype=int))
            selected.append(group.iloc[indices])
    return pd.concat(selected, ignore_index=True) if selected else frame.iloc[:0].copy()


def balanced_weights(frame: pd.DataFrame) -> np.ndarray:
    weight = 1 / frame["cell_id"].map(frame.groupby("cell_id").size())
    weight /= frame["dataset"].map(frame.groupby("dataset")["cell_id"].nunique())
    return (weight * len(frame) / weight.sum()).to_numpy(dtype=float)


def fit_head(
    frame: pd.DataFrame, target: np.ndarray, parameters: dict[str, Any],
) -> tuple[XGBRegressor, dict[str, float]]:
    defaults = frame[USAGE_FEATURES].median().fillna(0.0).to_dict()
    views = [mask_rates(frame, defaults, charge, discharge)
             for charge, discharge in ((True, True), (False, False), (True, False), (False, True))]
    inputs = pd.concat(views, ignore_index=True).replace([np.inf, -np.inf], np.nan)
    target = np.tile(target, 4)
    if not np.isfinite(inputs.to_numpy()).all() or not np.isfinite(target).all():
        raise ValueError("训练输入或标签存在非有限值")
    model = XGBRegressor(**parameters)
    model.fit(inputs, target, sample_weight=np.tile(balanced_weights(frame), 4))
    return model, {key: float(value) for key, value in defaults.items()}


def soh_metrics(frame: pd.DataFrame, predictions: np.ndarray) -> dict[str, Any]:
    scored = frame.assign(absolute_error=np.abs(predictions - frame["soh"]))
    return {**regression_metrics(frame["soh"], predictions),
            "cell_mae": float(scored.groupby("cell_id")["absolute_error"].mean().mean()),
            "dataset_mae": scored.groupby("dataset")["absolute_error"].mean().to_dict(),
            "rows": len(frame), "cells": int(frame["cell_id"].nunique())}


def lifetime_metrics(frame: pd.DataFrame, predictions: np.ndarray) -> dict[str, Any]:
    # 排除接近零的分母；规则与候选选择、测试时保持一致。
    eligible = frame["remaining_cycles"] >= np.maximum(50, frame["observed_eol_position"] * 0.1)
    scored = frame.loc[eligible].copy()
    scored["prediction"] = predictions[eligible]
    scored["absolute_error"] = abs(scored["prediction"] - scored["remaining_cycles"])
    scored["relative_error"] = scored["absolute_error"] / scored["remaining_cycles"]
    return {"mae_cycles": float(scored["absolute_error"].mean()),
            "mape": float(scored["relative_error"].mean()),
            "cell_mape": float(scored.groupby("cell_id")["relative_error"].mean().mean()),
            "dataset_mape": scored.groupby("dataset")["relative_error"].mean().to_dict(),
            "rows": len(scored), "cells": int(scored["cell_id"].nunique())}


def relative_error_scale(frame: pd.DataFrame, predictions: np.ndarray) -> float:
    """在验证电芯上最小化逐电芯平均相对绝对误差的单个乘法系数。"""
    eligible = (frame["remaining_cycles"] >= np.maximum(50, frame["observed_eol_position"] * .1))
    eligible &= np.isfinite(predictions) & (predictions > 0)
    subset, predicted = frame.loc[eligible], predictions[eligible]
    if subset.empty:
        return 1.0
    true = subset["remaining_cycles"].to_numpy()
    ratios = true / predicted
    weights = predicted / true / subset["cell_id"].map(subset.groupby("cell_id").size()).to_numpy()
    order = np.argsort(ratios, kind="stable")
    index = np.searchsorted(np.cumsum(weights[order]), weights.sum() / 2)
    return float(ratios[order[min(index, len(order)-1)]])


def calibration_scales(model: Any, validation: pd.DataFrame, defaults: dict[str, float]) -> dict[str, float]:
    scales = {}
    for charge, discharge in ((True, True), (False, False), (True, False), (False, True)):
        inputs = mask_rates(validation, defaults, charge, discharge)
        predictions = np.expm1(model.predict(inputs).astype(float))
        key = f"{int(charge)}{int(discharge)}"
        scales[key] = relative_error_scale(validation, predictions)
    return scales


def apply_lifetime_calibration(predictions: np.ndarray, inputs: pd.DataFrame, scales: dict[str, float]) -> np.ndarray:
    factors = np.array([scales.get(f"{int(charge)}{int(discharge)}", 1.0)
                        for charge, discharge in zip(inputs["charge_rate_known"], inputs["discharge_rate_known"])])
    return predictions * factors


def train_candidates(frame: pd.DataFrame, output: Path) -> dict[str, Any]:
    output.mkdir(parents=True, exist_ok=True)
    frame = prepare_usage_features(frame)
    manifest = grouped_manifest(frame)
    frame = attach_lifetime_targets(frame)
    frame["split"] = frame["cell_id"].map(manifest)
    (output / "split_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    records, packages = [], {}
    for depth in (3, 4, 5, 6):
        parameters = {"n_estimators": 350, "max_depth": depth, "learning_rate": 0.035,
                      "subsample": 0.85, "colsample_bytree": 0.85, "objective": "reg:squarederror",
                      "random_state": 42, "n_jobs": 4}
        candidate: dict[str, Any] = {"parameters": parameters, "chemistries": {}}
        for chemistry in ("ncm", "lfp"):
            group = frame[frame["battery_chemistry"] == chemistry]
            train, validation = group[group["split"] == "train"], group[group["split"] == "validation"]
            model, defaults = fit_head(train, train["soh"].to_numpy(), parameters)
            predictions = model.predict(validation[USAGE_FEATURES].fillna(defaults))
            metrics = soh_metrics(validation, predictions)
            missing_predictions = model.predict(mask_rates(validation, defaults, False, False))
            missing_metrics = soh_metrics(validation, missing_predictions)
            training_life, validation_life = lifetime_examples(train), lifetime_examples(validation)
            lifetime_model, lifetime_defaults, life_metrics, missing_life_metrics = None, {}, None, None
            if training_life["cell_id"].nunique() >= MIN_LIFETIME_CELLS and not validation_life.empty:
                lifetime_model, lifetime_defaults = fit_head(
                    training_life, np.log1p(training_life["remaining_cycles"].to_numpy()), parameters)
                raw = lifetime_model.predict(validation_life[USAGE_FEATURES].fillna(lifetime_defaults))
                life_metrics = lifetime_metrics(validation_life, np.expm1(raw.astype(float)))
                raw_missing = lifetime_model.predict(mask_rates(validation_life, lifetime_defaults, False, False))
                missing_life_metrics = lifetime_metrics(validation_life, np.expm1(raw_missing.astype(float)))
            package = {"soh_model": model, "defaults": defaults, "lifetime_model": lifetime_model,
                       "lifetime_defaults": lifetime_defaults, "validation_soh": metrics,
                       "validation_lifetime": life_metrics, "parameters": parameters}
            package.update(validation_missing_soh=missing_metrics, validation_missing_lifetime=missing_life_metrics)
            packages[(depth, chemistry)] = package
            candidate["chemistries"][chemistry] = {"soh": metrics, "lifetime": life_metrics,
                                                   "missing_soh": missing_metrics, "missing_lifetime": missing_life_metrics}
        mean_soh = np.mean([item[key]["cell_mae"] for item in candidate["chemistries"].values()
                            for key in ("soh", "missing_soh")])
        life_errors = [item[key]["cell_mape"] for item in candidate["chemistries"].values()
                       for key in ("lifetime", "missing_lifetime") if item[key]]
        candidate["selection_score"] = float(mean_soh / 0.02 + (np.mean(life_errors) / 0.30 if life_errors else 0))
        records.append(candidate)
        print(json.dumps(candidate, ensure_ascii=False), flush=True)
    winner = min(records, key=lambda item: item["selection_score"])
    depth = winner["parameters"]["max_depth"]
    summary: dict[str, Any] = {"candidates": records, "selected_parameters": winner["parameters"],
                               "selection_rule": "mean known/missing-info chemistry cell SOH MAE/0.02 + mean known/missing lifetime cell MAPE/0.30",
                               "split_seed": SPLIT_SEED, "models": {}}
    for chemistry in ("ncm", "lfp"):
        package = packages[(depth, chemistry)]
        group = frame[frame["battery_chemistry"] == chemistry]
        train, validation, test = [group[group["split"] == split] for split in ("train", "validation", "test")]
        model, defaults = package["soh_model"], package["defaults"]
        predictions = model.predict(test[USAGE_FEATURES].fillna(defaults))
        metrics = soh_metrics(test, predictions)
        missing_metrics = soh_metrics(test, model.predict(mask_rates(test, defaults, False, False)))
        training_life, test_life = lifetime_examples(train), lifetime_examples(test)
        lifetime_metadata: dict[str, Any] = {
            "model_loaded": package["lifetime_model"] is not None,
            "observed_training_cells": int(training_life["cell_id"].nunique()),
            "minimum_training_cells": MIN_LIFETIME_CELLS,
            "training_datasets": sorted(training_life["dataset"].unique().tolist()) if package["lifetime_model"] is not None else [],
            "defaults": package["lifetime_defaults"], "output_transform": "expm1",
            "validation_metrics": package["validation_lifetime"], "test_metrics": None,
            "validation_missing_info_metrics": package["validation_missing_lifetime"], "test_missing_info_metrics": None,
            "censoring_note": "仅使用实际观测终点的电芯拟合精确剩余循环；未达终点不是寿命结束，存在事件条件选择偏差",
        }
        if package["lifetime_model"] is not None:
            scales = calibration_scales(package["lifetime_model"], lifetime_examples(validation), package["lifetime_defaults"])
            lifetime_metadata["calibration_scales"] = scales
            lifetime_metadata["calibration_note"] = "按铭牌已知/未知四种组合，在验证集拟合乘法校准；未使用测试答案"
        if package["lifetime_model"] is not None and not test_life.empty:
            test_inputs = test_life[USAGE_FEATURES].fillna(package["lifetime_defaults"])
            raw = package["lifetime_model"].predict(test_inputs)
            life_predictions = apply_lifetime_calibration(np.expm1(raw.astype(float)), test_inputs, scales)
            lifetime_metadata["test_metrics"] = lifetime_metrics(test_life, life_predictions)
            missing_inputs = mask_rates(test_life, package["lifetime_defaults"], False, False)
            raw_missing = package["lifetime_model"].predict(missing_inputs)
            calibrated_missing = apply_lifetime_calibration(np.expm1(raw_missing.astype(float)), missing_inputs, scales)
            lifetime_metadata["test_missing_info_metrics"] = lifetime_metrics(test_life, calibrated_missing)
            test_life.assign(predicted_remaining_cycles=life_predictions).to_csv(
                output / f"{chemistry}_lifetime_test.csv", index=False)
        directory = output / "models" / ("lfp" if chemistry == "lfp" else "")
        directory.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, directory / "xgboost_model.pkl")
        if package["lifetime_model"] is not None:
            joblib.dump(package["lifetime_model"], directory / "remaining_cycles_model.pkl")
        metadata = {"model_version": 2, "feature_columns": USAGE_FEATURES, "defaults": defaults,
                    "metrics": {key: metrics[key] for key in ("mae", "rmse", "r2")},
                    "battery_chemistry": chemistry, "training_datasets": sorted(train["dataset"].unique().tolist()),
                    "train_rows": len(train), "validation_rows": len(validation), "test_rows": len(test),
                    "train_cells": sorted(train["cell_id"].unique()),
                    "validation_cells": sorted(validation["cell_id"].unique()),
                    "test_cells": sorted(test["cell_id"].unique()), "parameters": winner["parameters"],
                    "imputation": "training median; 0 only for all-missing training columns",
                    "validation_metrics": package["validation_soh"], "test_metrics": metrics,
                    "validation_missing_info_metrics": package["validation_missing_soh"], "test_missing_info_metrics": missing_metrics,
                    "training_domain": {column: {"min": float(train[column].min()), "max": float(train[column].max())}
                                        for column in USAGE_FEATURES if train[column].notna().any()},
                    "lifetime": lifetime_metadata}
        for known in ("charge_rate_known", "discharge_rate_known"):
            metadata["training_domain"][known] = {"min": 0.0, "max": 1.0}
        (directory / "model_metadata.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
        summary["models"][chemistry] = metadata
        test.assign(predicted_soh=predictions).to_csv(output / f"{chemistry}_soh_test.csv", index=False)
    frame.groupby(["dataset", "cell_id", "split"], as_index=False).agg(
        observed_eol_position=("observed_eol_position", "first"), last_position=("cycle_position", "max"),
    ).to_csv(output / "endpoint_audit.csv", index=False)
    (output / "training_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
    report = ["# V2 使用信息模型训练报告", "",
              "按完整电芯分来源划分，使用验证集选择参数和校准；内部保留测试不等同新的独立外部验证。", "",
              "| 类型 | 训练 / 验证 / 测试循环 | SOH MAE（点） | 寿命 MAPE |", "|---|---:|---:|---:|"]
    for chemistry, model in summary["models"].items():
        life = model["lifetime"]["test_metrics"]
        life_text = f"{life['mape']*100:.1f}%" if life else "终点样本不足，保留规则估算"
        report.append(f"| {chemistry.upper()} | {model['train_rows']} / {model['validation_rows']} / {model['test_rows']} | "
                      f"{model['metrics']['mae']*100:.3f} | {life_text} |")
    report += ["", "缺少铭牌时的指标、各来源误差、模型参数、删失限制和校准系数见同目录 training_summary.json。",
               "剩余月数依赖使用频率和日历老化假设，未验证真实车辆日历月份准确率。"]
    (output / "model_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("SELECTED", depth, json.dumps({key: value["test_metrics"] for key, value in summary["models"].items()}), flush=True)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features-csv", type=Path, default=PROJECT_ROOT / "data/processed/cycle_features.csv")
    parser.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "output/v2-training")
    parser.add_argument("--model-dir", type=Path, help="完整训练与报告生成后，将模型安装到指定本地目录")
    args = parser.parse_args()
    frame = pd.read_csv(args.features_csv)
    train_candidates(frame, args.output_dir)
    if args.model_dir is not None:
        for source in (args.output_dir / "models").rglob("*"):
            if source.is_file():
                target = args.model_dir / source.relative_to(args.output_dir / "models")
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)


if __name__ == "__main__":
    main()
