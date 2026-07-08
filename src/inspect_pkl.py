from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np

from src.config import RAW_DATA_DIR, REPORTS_DIR
from src.data_loader import iter_cell_pickles, load_pickle


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

    for path, data in iter_cell_pickles(raw_dir):
        report = inspect_pkl(path)
        file_reports.append(report)
        top_key_counter.update(report.get("top_level_keys", []))
        cycle_key_counter.update(report.get("cycle_keys", []))
        cycle_counts.append(report.get("cycle_count", 0))

    return {
        "file_count": len(file_reports),
        "cycle_count_total": int(np.sum(cycle_counts)),
        "cycle_count_min": int(np.min(cycle_counts)) if cycle_counts else 0,
        "cycle_count_max": int(np.max(cycle_counts)) if cycle_counts else 0,
        "top_level_key_frequency": dict(top_key_counter),
        "cycle_key_frequency": dict(cycle_key_counter),
        "files": file_reports,
    }


def write_markdown_report(report: dict[str, Any], output_path: str | Path) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# CALB Data Structure Report",
        "",
        "## Dataset Summary",
        "",
        f"- Pickle files: {report['file_count']}",
        f"- Total cycles: {report['cycle_count_total']}",
        f"- Cycles per cell: {report['cycle_count_min']} to {report['cycle_count_max']}",
        "",
        "## Top-Level Keys",
        "",
    ]
    lines.extend(f"- `{key}`: {count} files" for key, count in report["top_level_key_frequency"].items())
    lines.extend(["", "## Cycle Keys", ""])
    lines.extend(f"- `{key}`: {count} files" for key, count in report["cycle_key_frequency"].items())
    lines.extend(["", "## File Details", ""])
    for file_report in report["files"]:
        lines.extend(
            [
                f"### {Path(file_report['file']).name}",
                "",
                f"- Data type: `{file_report['data_type']}`",
                f"- Cycle count: {file_report.get('cycle_count', 0)}",
                f"- Cycle keys: {', '.join(f'`{key}`' for key in file_report.get('cycle_keys', []))}",
                "",
            ]
        )
    lines.extend(["## Machine-Readable Summary", "", "```json", json.dumps(report, indent=2), "```", ""])
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect CALB pickle files.")
    parser.add_argument("--raw-dir", default=str(RAW_DATA_DIR))
    parser.add_argument("--output", default=str(REPORTS_DIR / "data_structure_report.md"))
    args = parser.parse_args()

    report = inspect_dataset(args.raw_dir)
    output = write_markdown_report(report, args.output)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()

