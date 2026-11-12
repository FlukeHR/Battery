"""将已训练的单输出 XGBoost 回归树导出为网站服务端使用的轻量 JSON。"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from src.config import MODEL_DIR, PROJECT_ROOT
from src.predictor import load_model_bundle


def export_regressor(model: Any, columns: list[str], defaults: dict[str, float]) -> dict[str, Any]:
    learner = json.loads(model.get_booster().save_raw(raw_format="json"))["learner"]
    params = learner["learner_model_param"]
    if learner["objective"]["name"] != "reg:squarederror" or int(params["num_target"]) != 1:
        raise ValueError("网站导出仅支持单输出的 reg:squarederror 回归模型。")
    booster = learner["gradient_booster"]
    if booster["name"] != "gbtree":
        raise ValueError("网站导出仅支持 gbtree。")
    trees = booster["model"]["trees"]
    if any(any(tree["split_type"]) for tree in trees):
        raise ValueError("网站导出不支持分类特征分裂。")
    if int(params["num_feature"]) != len(columns) or list(learner.get("feature_names", [])) != columns:
        raise ValueError("模型特征数量或顺序与元数据不一致。")
    if set(columns) != set(defaults) or not all(math.isfinite(defaults[name]) for name in columns):
        raise ValueError("模型默认值缺失或包含非有限数值。")
    base = json.loads(params["base_score"])
    return {"feature_columns": columns, "defaults": defaults,
            "base_score": base[0] if isinstance(base, list) else base,
            "trees": [{key: tree[key] for key in (
                "left_children", "right_children", "default_left", "split_indices", "split_conditions",
            )} for tree in trees]}


def export_web_models(model_dir: Path = MODEL_DIR, web_dir: Path = PROJECT_ROOT / "Battest" / "web") -> None:
    output = web_dir / "src" / "lib" / "models"
    output.mkdir(parents=True, exist_ok=True)
    for chemistry in ("ncm", "lfp"):
        bundle = load_model_bundle(model_dir, chemistry)
        if bundle is None:
            raise ValueError(f"缺少 {chemistry} 模型，请先运行特征处理与模型训练。")
        model = {
            **export_regressor(bundle.model, bundle.feature_columns, bundle.defaults),
            "battery_chemistry": chemistry,
            "training_datasets": list(bundle.training_datasets),
            "metrics": bundle.metrics,
            "model_version": bundle.model_version,
            "training_domain": bundle.training_domain,
            "lifetime": (export_regressor(bundle.lifetime_model, bundle.feature_columns,
                                           bundle.lifetime_metadata["defaults"])
                         if bundle.lifetime_model is not None else None),
            "lifetime_training_datasets": bundle.lifetime_metadata.get("training_datasets", []),
            "lifetime_calibration_scales": bundle.lifetime_metadata.get("calibration_scales", {}),
        }
        path = output / f"{chemistry}.json"
        path.write_text(json.dumps(model, separators=(",", ":"), allow_nan=False), encoding="utf-8")
        print(f"已导出 {chemistry}: {path.stat().st_size} 字节", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, default=MODEL_DIR)
    parser.add_argument("--web-dir", type=Path, default=PROJECT_ROOT / "Battest" / "web")
    args = parser.parse_args()
    export_web_models(args.model_dir, args.web_dir)
