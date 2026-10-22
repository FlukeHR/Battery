from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np

from src.config import DATASET_CHEMISTRIES, RAW_DATA_DIR, REPORTS_DIR
from src.data_loader import find_pickle_files, load_pickle


def _preview_value(value: Any) -> str:
    if isinstance(value, (list, tuple)):
        return f"{type(value).__name__}(len={len(value)})"
    if hasattr(value, "shape"):
        return f"{type(value).__name__}(shape={getattr(value, 'shape', None)})"
    text = repr(value)
    return text[:160] + ("..." if len(text) > 160 else "")


def inspect_pkl(path: str | Path) -> dict[str, Any]:
    data = load_pickle(path)
    report: dict[str, Any] = {
        "file": str(path),
        "data_type": type(data).__name__,
        "dataset": Path(path).parent.name,
        "battery_chemistry": DATASET_CHEMISTRIES.get(Path(path).parent.name),
    }
    if isinstance(data, dict):
        report["top_level_keys"] = list(data.keys())
        cycles = data.get("cycle_data")
        report["cycle_count"] = len(cycles) if isinstance(cycles, list) else 0
        report["metadata_preview"] = {
            key: _preview_value(value)
            for key, value in data.items()
            if key != "cycle_data"
        }
        if isinstance(cycles, list) and cycles:
            first_cycle = cycles[0]
            report["first_cycle_type"] = type(first_cycle).__name__
            if isinstance(first_cycle, dict):
                report["cycle_keys"] = list(first_cycle.keys())
                report["first_cycle_preview"] = {
                    key: _preview_value(value) for key, value in first_cycle.items()
                }
    else:
        report["preview"] = _preview_value(data)
    return report


def inspect_dataset(raw_dir: str | Path = RAW_DATA_DIR) -> dict[str, Any]:
    file_reports = []
    top_key_counter: Counter[str] = Counter()
    cycle_key_counter: Counter[str] = Counter()
    cycle_counts = []

    for path in find_pickle_files(raw_dir):
        report = inspect_pkl(path)
        file_reports.append(report)
        top_key_counter.update(report.get("top_level_keys", []))
        cycle_key_counter.update(report.get("cycle_keys", []))
        cycle_counts.append(report.get("cycle_count", 0))
        print(f"Inspected {path.name}: {report.get('cycle_count', 0)} cycles", flush=True)

    return {
        "file_count": len(file_reports),
        "cycle_count_total": int(np.sum(cycle_counts)),
        "cycle_count_min": int(np.min(cycle_counts)) if cycle_counts else 0,
        "cycle_count_max": int(np.max(cycle_counts)) if cycle_counts else 0,
        "top_level_key_frequency": dict(top_key_counter),
        "cycle_key_frequency": dict(cycle_key_counter),
        "files": file_reports,
        "datasets": dict(Counter(report["dataset"] for report in file_reports)),
    }


def write_markdown_report(report: dict[str, Any], output_path: str | Path) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# 电池数据结构报告",
        "",
        "## 数据集概况",
        "",
        f"- Pickle 文件数量：{report['file_count']}",
        f"- 总循环数：{report['cycle_count_total']}",
        f"- 单电芯循环数范围：{report['cycle_count_min']} 至 {report['cycle_count_max']}",
        f"- 各数据集文件数量：{report['datasets']}",
        "",
        "## 顶层字段",
        "",
    ]
    lines.extend(f"- `{key}`：{count} 个文件" for key, count in report["top_level_key_frequency"].items())
    lines.extend(["", "## 循环数据字段", ""])
    lines.extend(f"- `{key}`：{count} 个文件" for key, count in report["cycle_key_frequency"].items())
    lines.extend(["", "## 文件详情", ""])
    for file_report in report["files"]:
        lines.extend(
            [
                f"### {Path(file_report['file']).name}",
                "",
                f"- 数据类型：`{file_report['data_type']}`",
                f"- 循环数量：{file_report.get('cycle_count', 0)}",
                f"- 循环字段：{', '.join(f'`{key}`' for key in file_report.get('cycle_keys', []))}",
                "",
            ]
        )
    lines.extend(["## 机器可读摘要", "", "字段名、类型名和原始数据预览保留原始标识，便于程序读取和核对。",
                  "", "```json", json.dumps(report, indent=2, ensure_ascii=False), "```", ""])
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect CALB, HUST and MATR pickle files.")
    parser.add_argument("--raw-dir", default=str(RAW_DATA_DIR))
    parser.add_argument("--output", default=str(REPORTS_DIR / "data_structure_report.md"))
    args = parser.parse_args()

    report = inspect_dataset(args.raw_dir)
    output = write_markdown_report(report, args.output)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()

