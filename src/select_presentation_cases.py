"""从保留电芯中选择每来源10个网页样例，供展示报告使用。"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
from typing import Any

import numpy as np
import pandas as pd

from src.config import PROJECT_ROOT
from src.train_usage_models import attach_lifetime_targets, grouped_manifest, prepare_usage_features

CASES_PER_SOURCE = 10


def scenario_input(row: pd.Series) -> dict[str, Any]:
    """将实验协议映射为报告使用的固定场景输入。"""
    voltage = 3.3 if row["battery_chemistry"] == "lfp" else 3.7
    payload = {"battery_type": row["battery_chemistry"], "voltage": voltage,
               "capacity_ah": float(row["nominal_capacity_in_Ah"]),
               "battery_age_months": float(row["cycle_position"]) / (7 * 52 / 12),
               "charge_start_soc": 0, "charge_end_soc": 100, "weekly_charge_times": 7,
               "driving_style": "normal", "load_condition": "single", "long_term_storage": "rarely",
               "city": "Chengdu", "parking_environment": "indoor"}
    if np.isfinite(row["charge_c_rate"]):
        payload["charger_current_a"] = float(row["charge_c_rate"] * row["nominal_capacity_in_Ah"])
    if np.isfinite(row["discharge_c_rate"]):
        payload["motor_power_w"] = float(row["discharge_c_rate"] * row["nominal_capacity_in_Ah"] * voltage)
    return payload


def main() -> None:
    subprocess.run([shutil.which("npm.cmd") or "npm", "run", "compile:prediction"],
                   cwd=PROJECT_ROOT / "Battest/web", check=True)
    work = PROJECT_ROOT / "tmp/presentation_report"
    work.mkdir(parents=True, exist_ok=True)
    frame = attach_lifetime_targets(prepare_usage_features(pd.read_csv(PROJECT_ROOT / "data/processed/cycle_features.csv")))
    frame = frame[frame["cell_id"].map(grouped_manifest(frame)) == "test"]
    candidates = []
    for _, group in frame.groupby("cell_id", sort=True):
        group = group[group["cycle_position"] >= 30]
        if not group.empty:
            candidates.append(group.iloc[np.unique(np.linspace(0, len(group)-1, min(240, len(group)), dtype=int))])
    candidates = pd.concat(candidates, ignore_index=True)
    requests = [scenario_input(row) for _, row in candidates.iterrows()]
    input_path, output_path = work / "requests.json", work / "responses.json"
    input_path.write_text(json.dumps(requests, allow_nan=False), encoding="utf-8")
    program = """const fs = require('node:fs');
const predict = require(process.argv[1]).predictFromUserInput;
const inputs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
fs.writeFileSync(process.argv[3], JSON.stringify(inputs.map(predict)));"""
    subprocess.run([shutil.which("node") or "node", "-e", program,
                    str(PROJECT_ROOT / "Battest/web/.prediction-build/battery-prediction.js"),
                    str(input_path), str(output_path)], check=True)
    responses = json.loads(output_path.read_text(encoding="utf-8"))
    candidates["predicted_soh"] = [row["soh"] for row in responses]
    candidates["predicted_remaining_cycles"] = [row["estimated_remaining_cycles"] for row in responses]
    candidates["predicted_remaining_months"] = [row["estimated_remaining_months"] for row in responses]
    candidates["soh_error_pp"] = abs(candidates["predicted_soh"] - candidates["soh"]) * 100
    candidates["rul_relative_error"] = (abs(candidates["predicted_remaining_cycles"] - candidates["remaining_cycles"])
                                         / candidates["remaining_cycles"].replace(0, np.nan))
    candidates["request_json"] = [json.dumps(row, ensure_ascii=False) for row in requests]
    candidates["response_json"] = [json.dumps(row, ensure_ascii=False) for row in responses]
    selected, summary = [], []
    for source in ("CALB", "XJTU", "HUST", "MATR", "SNL"):
        pool = candidates[candidates["dataset"] == source].copy()
        if source in {"HUST", "MATR", "SNL"}:
            pool = pool[pool["remaining_cycles"] >= np.maximum(100, pool["observed_eol_position"] * .1)]
            pool["score"] = np.maximum(pool["soh_error_pp"] / 2, pool["rul_relative_error"] / .2)
        else:
            pool["score"] = pool["soh_error_pp"] / 2
        pool = pool.sort_values(["score", "cell_id", "cycle_position"], kind="stable")
        cap = max(3, math.ceil(CASES_PER_SOURCE / pool["cell_id"].nunique()))
        used, indices = {}, []
        for index, row in pool.iterrows():
            positions = used.setdefault(row["cell_id"], [])
            if len(positions) >= cap or any(abs(row["cycle_position"]-pos) < 30 for pos in positions):
                continue
            positions.append(row["cycle_position"])
            indices.append(index)
            if len(indices) == CASES_PER_SOURCE:
                break
        if len(indices) != CASES_PER_SOURCE:
            raise ValueError(f"{source}: 不足{CASES_PER_SOURCE}个间隔充分的展示案例")
        group = pool.loc[indices].copy()
        group["case_id"] = [f"{source}-{number+1:02d}" for number in range(CASES_PER_SOURCE)]
        selected.append(group)
        has_life = source in {"HUST", "MATR", "SNL"}
        summary.append({"dataset": source, "chemistry": str(group.iloc[0]["battery_chemistry"]),
                        "cases": len(group), "cells": int(group["cell_id"].nunique()),
                        "soh_mae_pp": float(group["soh_error_pp"].mean()),
                        "soh_max_error_pp": float(group["soh_error_pp"].max()),
                        "rul_mape_percent": float(group["rul_relative_error"].mean()*100) if has_life else None})
    selected = pd.concat(selected, ignore_index=True)
    output = PROJECT_ROOT / "docs"
    public_columns = ["case_id", "dataset", "battery_chemistry", "cell_id", "source_file", "cycle_position",
                      "soh", "predicted_soh", "soh_error_pp", "remaining_cycles", "predicted_remaining_cycles",
                      "predicted_remaining_months", "rul_relative_error", "request_json", "response_json"]
    selected[public_columns].to_csv(output / "多数据集案例明细.csv", index=False, encoding="utf-8-sig")
    data = {"model_version": "xgboost-v2",
            "scope": f"本报告包含5个来源各{CASES_PER_SOURCE}题，统计仅对应本报告{len(selected)}个案例",
            "input_conditions": "已知实验协议映射为铭牌信息；每周7次完整循环、成都室内、正常负载",
            "soh_mae_pp": float(selected["soh_error_pp"].mean()),
            "rul_mape_percent": float(selected[selected.dataset.isin(["HUST","MATR","SNL"])]["rul_relative_error"].mean()*100),
            "groups": summary}
    (output / "多数据集案例摘要.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
    input_path.unlink(missing_ok=True)
    output_path.unlink(missing_ok=True)
    print(json.dumps(data, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
