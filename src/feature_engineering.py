from __future__ import annotations

import json
import math
import os
import re
from pathlib import Path
from typing import Any

os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parents[1] / ".matplotlib"))
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, train_test_split

from src.config import PLOTS_DIR, PROCESSED_DIR, RANDOM_STATE, REPORTS_DIR
from src.data_loader import iter_cell_pickles


CAPACITY_KEYS = (
    "capacity_in_Ah",
    "discharge_capacity_in_Ah",
    "Qd",
    "qd",
    "capacity",
    "Capacity",
)
VOLTAGE_KEYS = ("voltage_in_V", "voltage", "Voltage", "V")
CURRENT_KEYS = ("current_in_A", "current", "Current", "I")
TEMP_KEYS = ("temperature_in_C", "temperature", "Temperature", "T")
TIME_KEYS = ("time_in_s", "time", "Time", "test_time_in_s")


def _first_present(mapping: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        if key in mapping:
            return mapping[key]
    return None


def _numeric_array(value: Any) -> np.ndarray:
    if value is None:
        return np.array([], dtype=float)
    if isinstance(value, (str, bytes)):
        return np.array([], dtype=float)
    try:
        arr = np.asarray(value, dtype=float).reshape(-1)
    except (TypeError, ValueError):
        return np.array([], dtype=float)
    return arr[np.isfinite(arr)]


def _numeric_scalar(value: Any) -> float | None:
    arr = _numeric_array(value)
    if arr.size == 0:
        return None
    return float(arr[-1])


def _capacity_scalar(cycle: dict[str, Any]) -> float | None:
    value = _first_present(cycle, CAPACITY_KEYS)
    arr = _numeric_array(value)
    if arr.size == 0:
        return None
    positive = arr[arr > 0]
    if positive.size == 0:
        return None
    return float(np.max(positive))


def _stats(prefix: str, values: Any) -> dict[str, float]:
    arr = _numeric_array(values)
    if arr.size == 0:
        return {
            f"{prefix}_mean": np.nan,
            f"{prefix}_std": np.nan,
            f"{prefix}_min": np.nan,
            f"{prefix}_max": np.nan,
        }
    return {
        f"{prefix}_mean": float(np.mean(arr)),
        f"{prefix}_std": float(np.std(arr)),
        f"{prefix}_min": float(np.min(arr)),
        f"{prefix}_max": float(np.max(arr)),
    }


def _time_by_current_sign(cycle: dict[str, Any]) -> tuple[float, float]:
    time = _numeric_array(_first_present(cycle, TIME_KEYS))
    current = _numeric_array(_first_present(cycle, CURRENT_KEYS))
    if time.size < 2 or current.size < 2:
        return np.nan, np.nan
    n = min(time.size, current.size)
    time = time[:n]
    current = current[:n]
    diffs = np.diff(time)
    signs = current[:-1]
    valid = np.isfinite(diffs) & (diffs >= 0)
    charge_time = float(np.sum(diffs[valid & (signs > 0)]))
    discharge_time = float(np.sum(diffs[valid & (signs < 0)]))
    return charge_time, discharge_time


def _depth_fraction(value: Any) -> float:
    scalar = _numeric_scalar(value)
    if scalar is None:
        return np.nan
    return float(scalar / 100.0 if scalar > 1.0 else scalar)


def _temperature_from_name(name: str) -> float | None:
    match = re.search(r"CALB_(-?\d+)", name)
    if not match:
        return None
    return float(match.group(1))


def extract_cycle_features(cell_data: dict[str, Any], source_file: str | None = None) -> list[dict[str, Any]]:
    """Extract one row per cycle and calculate SOH from capacity."""
    cycles = cell_data.get("cycle_data") or []
    if not isinstance(cycles, list):
        return []

    capacities = [_capacity_scalar(cycle) for cycle in cycles if isinstance(cycle, dict)]
    capacities = [capacity for capacity in capacities if capacity is not None and capacity > 0]
    initial_capacity = capacities[0] if capacities else _numeric_scalar(cell_data.get("nominal_capacity_in_Ah"))
    if initial_capacity is None or initial_capacity <= 0:
        initial_capacity = 1.0

    nominal_capacity = _numeric_scalar(cell_data.get("nominal_capacity_in_Ah")) or initial_capacity
    ambient_temp = _temperature_from_name(source_file or cell_data.get("cell_id", ""))
    rows: list[dict[str, Any]] = []

    for position, cycle in enumerate(cycles, start=1):
        if not isinstance(cycle, dict):
            continue
        capacity = _capacity_scalar(cycle)
        if capacity is None or capacity <= 0:
            continue

        current_values = _first_present(cycle, CURRENT_KEYS)
        current_arr = _numeric_array(current_values)
        charge_time, discharge_time = _time_by_current_sign(cycle)
        cycle_number = _numeric_scalar(cycle.get("cycle_number")) or float(position)

        row: dict[str, Any] = {
            "cell_id": cell_data.get("cell_id") or Path(source_file or "unknown").stem,
            "source_file": source_file or "",
            "cycle_index": int(cycle_number),
            "cycle_position": position,
            "nominal_capacity_in_Ah": float(nominal_capacity),
            "measured_capacity_in_Ah": float(capacity),
            "soh": float(np.clip(capacity / initial_capacity, 0.0, 1.2)),
            "DOD": _depth_fraction(cell_data.get("depth_of_discharge")),
            "DOC": _depth_fraction(cell_data.get("depth_of_charge")),
            "ambient_temperature_in_C": ambient_temp if ambient_temp is not None else np.nan,
            "charge_time": charge_time,
            "discharge_time": discharge_time,
        }
        row.update(_stats("voltage", _first_present(cycle, VOLTAGE_KEYS)))
        row.update(_stats("current", current_values))
        row.update(_stats("temperature", _first_present(cycle, TEMP_KEYS)))
        row["temperature_mean"] = (
            row["temperature_mean"]
            if not math.isnan(row["temperature_mean"])
            else row["ambient_temperature_in_C"]
        )
        row["temperature_max"] = (
            row["temperature_max"]
            if not math.isnan(row["temperature_max"])
            else row["ambient_temperature_in_C"]
        )
        row["current_abs_mean"] = float(np.mean(np.abs(current_arr))) if current_arr.size else np.nan
        row["current_abs_max"] = float(np.max(np.abs(current_arr))) if current_arr.size else np.nan
        row["C_rate"] = row["current_abs_mean"] / nominal_capacity if nominal_capacity else np.nan
        rows.append(row)

    return rows


def build_feature_table(raw_dir: str | Path) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for path, cell_data in iter_cell_pickles(raw_dir):
        rows.extend(extract_cycle_features(cell_data, source_file=path.name))
    if not rows:
        raise ValueError(f"No cycle feature rows extracted from {raw_dir}")
    df = pd.DataFrame(rows)
    df = df.sort_values(["cell_id", "cycle_index"]).reset_index(drop=True)
    numeric_columns = df.select_dtypes(include=[np.number]).columns
    df[numeric_columns] = df[numeric_columns].replace([np.inf, -np.inf], np.nan)
    return df


def clean_feature_table(df: pd.DataFrame) -> pd.DataFrame:
    cleaned = df.copy()
    required = ["soh", "cycle_index", "temperature_mean", "voltage_mean", "current_abs_mean"]
    cleaned = cleaned.dropna(subset=[col for col in required if col in cleaned.columns])
    cleaned = cleaned[(cleaned["soh"] > 0.2) & (cleaned["soh"] <= 1.2)]
    numeric_columns = cleaned.select_dtypes(include=[np.number]).columns
    cleaned[numeric_columns] = cleaned[numeric_columns].fillna(cleaned[numeric_columns].median(numeric_only=True))
    return cleaned.reset_index(drop=True)


def save_processed_datasets(
    df: pd.DataFrame,
    output_dir: str | Path = PROCESSED_DIR,
    test_size: float = 0.2,
) -> dict[str, Path]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    clean_df = clean_feature_table(df)
    if clean_df["cell_id"].nunique() > 1:
        splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=RANDOM_STATE)
        train_idx, test_idx = next(splitter.split(clean_df, groups=clean_df["cell_id"]))
        train_df = clean_df.iloc[train_idx]
        test_df = clean_df.iloc[test_idx]
    else:
        train_df, test_df = train_test_split(
            clean_df,
            test_size=test_size,
            random_state=RANDOM_STATE,
            shuffle=True,
        )
    paths = {
        "cycle_features": output / "cycle_features.csv",
        "train": output / "train.csv",
        "test": output / "test.csv",
    }
    clean_df.to_csv(paths["cycle_features"], index=False)
    train_df.to_csv(paths["train"], index=False)
    test_df.to_csv(paths["test"], index=False)
    return paths


def generate_plots(df: pd.DataFrame, output_dir: str | Path = PLOTS_DIR) -> list[Path]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []

    def save_line(y_column: str, title: str, filename: str) -> None:
        fig, ax = plt.subplots(figsize=(10, 6))
        for cell_id, group in df.groupby("cell_id"):
            group = group.sort_values("cycle_index")
            ax.plot(group["cycle_index"], group[y_column], linewidth=1.0, alpha=0.75, label=str(cell_id))
        ax.set_xlabel("Cycle")
        ax.set_ylabel(y_column)
        ax.set_title(title)
        if df["cell_id"].nunique() <= 12:
            ax.legend(fontsize=8)
        ax.grid(alpha=0.25)
        fig.tight_layout()
        path = output / filename
        fig.savefig(path, dpi=160)
        plt.close(fig)
        paths.append(path)

    save_line("soh", "SOH vs Cycle", "soh_vs_cycle.png")
    save_line("measured_capacity_in_Ah", "Capacity vs Cycle", "capacity_vs_cycle.png")
    save_line("temperature_mean", "Temperature vs Cycle", "temperature_vs_cycle.png")
    save_line("voltage_mean", "Voltage Mean vs Cycle", "voltage_mean_vs_cycle.png")
    return paths


def write_feature_summary(df: pd.DataFrame, paths: dict[str, Path], output_path: str | Path) -> Path:
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    summary = {
        "rows": int(len(df)),
        "cells": int(df["cell_id"].nunique()),
        "min_cycle": int(df["cycle_index"].min()),
        "max_cycle": int(df["cycle_index"].max()),
        "soh_min": float(df["soh"].min()),
        "soh_max": float(df["soh"].max()),
        "files": {name: str(path) for name, path in paths.items()},
    }
    output.write_text(
        "# Feature Engineering Report\n\n"
        "## Summary\n\n"
        f"```json\n{json.dumps(summary, indent=2)}\n```\n\n"
        "## Columns\n\n"
        + "\n".join(f"- `{column}`" for column in df.columns)
        + "\n",
        encoding="utf-8",
    )
    return output


def run_feature_pipeline(raw_dir: str | Path, output_dir: str | Path = PROCESSED_DIR) -> dict[str, Path]:
    df = build_feature_table(raw_dir)
    paths = save_processed_datasets(df, output_dir=output_dir)
    clean_df = pd.read_csv(paths["cycle_features"])
    generate_plots(clean_df, PLOTS_DIR)
    write_feature_summary(clean_df, paths, REPORTS_DIR / "feature_engineering_report.md")
    return paths
