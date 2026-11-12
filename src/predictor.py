from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping

import joblib
import numpy as np
import pandas as pd

from src.config import EOL_SOH, MODEL_DIR
from src.user_mapping import estimate_user_features, risk_level_from_soh


@dataclass
class ModelBundle:
    model: Any
    feature_columns: list[str]
    defaults: dict[str, float]
    metrics: dict[str, float]
    battery_chemistry: str = "ncm"
    training_datasets: tuple[str, ...] = ("CALB",)
    model_version: int = 1
    lifetime_model: Any | None = None
    lifetime_metadata: dict[str, Any] = field(default_factory=dict)
    training_domain: dict[str, Any] = field(default_factory=dict)


def load_model_bundle(
    model_dir: str | Path = MODEL_DIR, battery_chemistry: str = "ncm",
) -> ModelBundle | None:
    if battery_chemistry not in {"ncm", "lfp"}:
        return None
    directory = Path(model_dir)
    if battery_chemistry == "lfp":
        directory = directory / "lfp"
    model_path = directory / "xgboost_model.pkl"
    metadata_path = directory / "model_metadata.json"
    if not model_path.exists() or not metadata_path.exists():
        return None
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("battery_chemistry", "ncm") != battery_chemistry:
        return None
    if metadata.get("model_version", 1) not in {1, 2}:
        raise ValueError("不支持的模型版本。")
    model = joblib.load(model_path)
    lifetime_metadata = metadata.get("lifetime", {})
    lifetime_model = None
    if lifetime_metadata.get("model_loaded"):
        lifetime_model = joblib.load(directory / "remaining_cycles_model.pkl")
    return ModelBundle(
        model=model,
        feature_columns=list(metadata["feature_columns"]),
        defaults={key: float(value) for key, value in metadata["defaults"].items()},
        metrics={key: float(value) for key, value in metadata.get("metrics", {}).items()},
        battery_chemistry=battery_chemistry,
        training_datasets=tuple(metadata.get("training_datasets", ["CALB"])),
        model_version=int(metadata.get("model_version", 1)),
        lifetime_model=lifetime_model,
        lifetime_metadata=lifetime_metadata,
        training_domain=metadata.get("training_domain", {}),
    )


def _model_features(user_features: Mapping[str, Any], bundle: ModelBundle) -> pd.DataFrame:
    if bundle.model_version == 2:
        row = dict(bundle.defaults)
        row.update({"cycle_position": float(user_features["estimated_cycles_elapsed"]),
                    "DOD": float(user_features["single_charge_dod"]),
                    "DOC": float(user_features["single_charge_dod"]),
                    "context_temperature_c": float(user_features["estimated_temperature_c"]),
                    "cold_exposure": max((10 - float(user_features["estimated_temperature_c"])) / 10, 0),
                    "heat_exposure": max((float(user_features["estimated_temperature_c"]) - 35) / 10, 0),
                    "charge_rate_known": float(user_features.get("charge_c_rate") is not None),
                    "discharge_rate_known": float(user_features.get("discharge_c_rate") is not None)})
        for name in ("charge_c_rate", "discharge_c_rate"):
            if user_features.get(name) is not None:
                row[name] = float(user_features[name])
        return pd.DataFrame([{name: row[name] for name in bundle.feature_columns}])
    row = dict(bundle.defaults)
    row.update(
        {
            "cycle_index": float(user_features["estimated_cycles_elapsed"]),
            "cycle_position": float(user_features["estimated_cycles_elapsed"]),
            "nominal_capacity_in_Ah": float(user_features["capacity_ah"]),
            "DOD": float(user_features["daily_dod"]),
            "DOC": max((float(user_features["charge_end_soc"]) - float(user_features["charge_start_soc"])) / 100.0, 0.0),
            "temperature_mean": float(user_features["estimated_temperature_c"]),
            "temperature_max": float(user_features["estimated_temperature_c"]) + 4.0,
            "ambient_temperature_in_C": float(user_features["estimated_temperature_c"]),
            "C_rate": float(user_features["estimated_c_rate"]),
            "current_abs_mean": float(user_features["estimated_c_rate"]) * float(user_features["capacity_ah"]),
            "current_abs_max": float(user_features["estimated_c_rate"]) * float(user_features["capacity_ah"]) * 1.5,
        }
    )
    return pd.DataFrame([{column: row.get(column, bundle.defaults.get(column, 0.0)) for column in bundle.feature_columns}])


def _heuristic_soh(user_features: Mapping[str, Any]) -> float:
    age_months = float(user_features["battery_age_months"])
    cycles_elapsed = float(user_features["estimated_cycles_elapsed"])
    daily_dod = float(user_features["daily_dod"])
    temp_factor = float(user_features["temperature_factor"])
    stress_factor = float(user_features.get("stress_factor", 1.0))
    storage_factor = float(user_features.get("storage_stress_factor", 1.0))
    chemistry_cycle_factor = float(user_features.get("chemistry_cycle_loss_factor", 1.0))
    chemistry_calendar_factor = float(user_features.get("chemistry_calendar_loss_factor", 1.0))
    nominal_cycle_life = max(float(user_features.get("nominal_cycle_life", 1500.0)), 1.0)
    c_rate = float(user_features["estimated_c_rate"])
    charge_end_soc = float(user_features["charge_end_soc"])
    charge_start_soc = float(user_features["charge_start_soc"])

    calendar_loss = age_months * 0.0017 * temp_factor * storage_factor * chemistry_calendar_factor
    cycle_life_fraction = cycles_elapsed / nominal_cycle_life
    cycle_loss = cycle_life_fraction * 0.20 * (0.75 + daily_dod) * stress_factor * chemistry_cycle_factor
    charge_loss = max(charge_end_soc - 90.0, 0.0) * 0.0012
    deep_discharge_loss = max(20.0 - charge_start_soc, 0.0) * 0.0009
    c_rate_loss = max(c_rate - 0.25, 0.0) * 0.08
    soh = 1.0 - calendar_loss - cycle_loss - charge_loss - deep_discharge_loss - c_rate_loss
    return float(np.clip(soh, 0.55, 1.0))


def _remaining_months(soh: float, user_features: Mapping[str, Any]) -> int:
    if soh <= EOL_SOH:
        return 0
    age_months = max(float(user_features["battery_age_months"]), 1.0)
    observed_monthly_loss = max((1.0 - soh) / age_months, 0.002)
    nominal_cycle_life = max(float(user_features.get("nominal_cycle_life", 1500.0)), 1.0)
    annual_cycles = float(user_features.get("annual_equivalent_cycles", 0.0))
    stress_factor = float(user_features.get("stress_factor", 1.0))
    storage_factor = float(user_features.get("storage_stress_factor", 1.0))
    future_stress = (
        1.0
        + max(float(user_features["daily_dod"]) - 0.35, 0.0)
        + max(float(user_features["temperature_factor"]) - 1.0, 0.0) * 0.8
        + max(float(user_features["estimated_c_rate"]) - 0.25, 0.0)
        + max(storage_factor - 1.0, 0.0)
    )
    cycle_monthly_loss = annual_cycles / 12.0 / nominal_cycle_life * 0.20 * stress_factor
    monthly_loss = max(observed_monthly_loss * future_stress, cycle_monthly_loss, 0.0015)
    return int(max(round((soh - EOL_SOH) / monthly_loss), 0))


def predict_from_user_input(
    payload: Mapping[str, Any],
    model_bundle: ModelBundle | None = None,
) -> dict[str, Any]:
    user_features = estimate_user_features(payload)
    chemistry = user_features["battery_chemistry"]
    if model_bundle is None:
        model_bundle = load_model_bundle(battery_chemistry=chemistry)
    if model_bundle is not None and model_bundle.battery_chemistry != chemistry:
        model_bundle = None

    if model_bundle is not None and model_bundle.model_version == 2:
        return _predict_v2(user_features, model_bundle)

    model_soh: float | None = None
    if model_bundle is not None:
        model_input = _model_features(user_features, model_bundle)
        model_soh = float(np.clip(model_bundle.model.predict(model_input)[0], 0.55, 1.0))

    heuristic_soh = _heuristic_soh(user_features)
    soh = model_soh if model_soh is not None else heuristic_soh
    if model_soh is not None:
        soh = float(np.clip(0.75 * model_soh + 0.25 * heuristic_soh, 0.55, 1.0))

    if model_bundle is not None:
        note = "使用同类型电池实验数据训练的 XGBoost，结合充电与使用习惯估算。"
    elif chemistry in {"ncm", "lfp"}:
        note = "该类型模型尚未加载，当前使用习惯规则估算。"
    else:
        note = "暂无匹配该电池类型的训练数据，当前使用习惯规则估算。"

    return {
        "soh": round(soh, 4),
        "soh_percent": round(soh * 100),
        "estimated_remaining_months": _remaining_months(soh, user_features),
        "estimated_remaining_years": round(_remaining_months(soh, user_features) / 12.0, 1),
        "risk_level": risk_level_from_soh(soh),
        "main_degradation_factors": user_features["risk_factors"][:4],
        "suggestions": user_features["suggestions"][:4],
        "mapped_features": {
            "single_charge_dod": round(float(user_features["single_charge_dod"]), 4),
            "daily_dod": round(float(user_features["daily_dod"]), 4),
            "weekly_charge_times": round(float(user_features["weekly_charge_times"]), 2),
            "annual_equivalent_cycles": round(float(user_features["annual_equivalent_cycles"]), 2),
            "temperature_factor": round(float(user_features["temperature_factor"]), 2),
            "estimated_c_rate": round(float(user_features["estimated_c_rate"]), 3),
            "stress_factor": round(float(user_features["stress_factor"]), 3),
            "nominal_cycle_life": round(float(user_features["nominal_cycle_life"]), 0),
        },
        "model_used": model_bundle is not None,
        "battery_chemistry": chemistry,
        "training_datasets": list(model_bundle.training_datasets) if model_bundle is not None else [],
        "prediction_note": note,
        "algorithm_version": "xgboost-v1" if model_bundle is not None else "rules-v1",
    }


def _lifetime_features(features: Mapping[str, Any], bundle: ModelBundle) -> pd.DataFrame:
    inputs = _model_features(features, bundle)
    for name, value in bundle.lifetime_metadata.get("defaults", {}).items():
        if name in {"charge_c_rate", "discharge_c_rate"} and features.get(name) is None:
            inputs[name] = value
    return inputs


def _predict_v2(features: Mapping[str, Any], bundle: ModelBundle) -> dict[str, Any]:
    model_input = _model_features(features, bundle)
    model_soh = float(np.clip(bundle.model.predict(model_input)[0], 0.0, 1.0))
    elapsed = float(features["estimated_cycles_elapsed"])
    annual = float(features["annual_equivalent_cycles"])
    remaining_cycles = None
    if bundle.lifetime_model is not None:
        # 剩余寿命头直接学习 log1p(剩余循环)，未观测终点的电芯不作精确标签。
        raw = float(bundle.lifetime_model.predict(_lifetime_features(features, bundle))[0])
        key = f"{int(features.get('charge_c_rate') is not None)}{int(features.get('discharge_c_rate') is not None)}"
        scale = bundle.lifetime_metadata.get("calibration_scales", {}).get(key, 1.0)
        remaining_cycles = max(float(np.expm1(raw)) * scale, 0.0)
    nominal_life = max(elapsed + remaining_cycles, 1.0) if remaining_cycles is not None else float(features["nominal_cycle_life"])
    calendar_rate = (0.0017 * float(features["temperature_factor"]) * float(features["storage_stress_factor"])
                     * float(features["chemistry_calendar_loss_factor"]))
    calendar_loss = float(features["battery_age_months"]) * calendar_rate
    cycle_loss = 0.2 * elapsed / nominal_life * float(features["stress_factor"])
    charge_loss = max(float(features["charge_end_soc"]) - 90, 0) * 0.0012
    deep_loss = max(20 - float(features["charge_start_soc"]), 0) * 0.0009
    # 等效循环已包含 DOD；取两类老化的较大项，避免重复累计相同使用年限。
    rule_soh = float(np.clip(1 - max(calendar_loss, cycle_loss) - charge_loss - deep_loss, 0.0, 1.0))
    soh = float(np.clip(0.75 * model_soh + 0.25 * rule_soh, 0.0, 1.0))
    if remaining_cycles is None:
        months = _remaining_months(soh, features)
        cycles = months * annual / 12.0
        method = "rules"
        life_note = "该类型缺少足够的实测寿命终点，剩余时间仍为规则估算，未经寿命模型验证。"
    else:
        calendar_months = max((soh - EOL_SOH) / calendar_rate, 0.0)
        cycle_months = remaining_cycles * 12 / annual if annual > 0 else float("inf")
        months = int(max(round(min(calendar_months, cycle_months)), 0))
        cycles = max(min(remaining_cycles, calendar_months * annual / 12), 0.0)
        method = "trained_cycles"
        life_note = "剩余循环由实测寿命终点训练，月份按当前使用频率换算，并受日历老化假设限制；不代表实测车辆日历寿命。"
    if soh <= EOL_SOH:
        months, cycles = 0, 0.0
    note = "使用与网页输入对应的 XGBoost 特征，按 75% 模型与 25% 使用习惯规则融合。"
    if features.get("charge_c_rate") is None or features.get("discharge_c_rate") is None:
        note += "部分铭牌信息未提供，使用训练集默认条件，结果参考性降低。"
    outside = any(
        not bounds["min"] <= float(model_input.iloc[0][name]) <= bounds["max"]
        for name, bounds in bundle.training_domain.items()
    )
    if outside:
        note += "部分使用条件超出现有实验覆盖范围。"
    return {
        "soh": round(soh, 4), "soh_percent": round(soh * 100),
        "estimated_remaining_months": months, "estimated_remaining_years": round(months / 12, 1),
        "estimated_remaining_cycles": round(cycles, 1), "remaining_life_method": method,
        "remaining_life_note": life_note, "risk_level": risk_level_from_soh(soh),
        "main_degradation_factors": features["risk_factors"][:4], "suggestions": features["suggestions"][:4],
        "mapped_features": {
            "single_charge_dod": round(float(features["single_charge_dod"]), 4),
            "daily_dod": round(float(features["daily_dod"]), 4),
            "weekly_charge_times": round(float(features["weekly_charge_times"]), 2),
            "annual_equivalent_cycles": round(annual, 2),
            "temperature_factor": round(float(features["temperature_factor"]), 2),
            "estimated_temperature_c": round(float(features["estimated_temperature_c"]), 1),
            "estimated_c_rate": round(float(features["estimated_c_rate"]), 3),
            "charge_c_rate": round(float(model_input.iloc[0]["charge_c_rate"]), 3),
            "discharge_c_rate": round(float(model_input.iloc[0]["discharge_c_rate"]), 3),
            "stress_factor": round(float(features["stress_factor"]), 3),
            "nominal_cycle_life": round(nominal_life),
        },
        "model_used": True, "battery_chemistry": bundle.battery_chemistry,
        "training_datasets": list(bundle.training_datasets), "prediction_note": note,
        "algorithm_version": "xgboost-v2",
    }
