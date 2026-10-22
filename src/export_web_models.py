"""将已训练的单输出 XGBoost 回归树导出为网站服务端使用的轻量 JSON。"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from src.config import MODEL_DIR, PROJECT_ROOT
from src.predictor import _model_features, load_model_bundle, predict_from_user_input
from src.user_mapping import estimate_user_features


def export_web_models(model_dir: Path = MODEL_DIR, web_dir: Path = PROJECT_ROOT / "Battest" / "web") -> None:
    output = web_dir / "src" / "lib" / "models"
    output.mkdir(parents=True, exist_ok=True)
    parity = []
    for chemistry in ("ncm", "lfp"):
        bundle = load_model_bundle(model_dir, chemistry)
        if bundle is None:
            raise ValueError(f"缺少 {chemistry} 模型，请先运行特征处理与模型训练。")
        learner = json.loads(bundle.model.get_booster().save_raw(raw_format="json"))["learner"]
        params = learner["learner_model_param"]
        if learner["objective"]["name"] != "reg:squarederror" or int(params["num_target"]) != 1:
            raise ValueError("网站导出仅支持单输出的 reg:squarederror 回归模型。")
        booster = learner["gradient_booster"]
        if booster["name"] != "gbtree":
            raise ValueError("网站导出仅支持 gbtree。")
        trees = booster["model"]["trees"]
        if any(any(tree["split_type"]) for tree in trees):
            raise ValueError("网站导出不支持分类特征分裂。")
        base = json.loads(params["base_score"])
        model = {
            "battery_chemistry": chemistry,
            "training_datasets": list(bundle.training_datasets),
            "feature_columns": bundle.feature_columns,
            "defaults": bundle.defaults,
            "metrics": bundle.metrics,
            "base_score": base[0] if isinstance(base, list) else base,
            "trees": [{key: tree[key] for key in (
                "left_children", "right_children", "default_left", "split_indices", "split_conditions",
            )} for tree in trees],
        }
        path = output / f"{chemistry}.json"
        path.write_text(json.dumps(model, separators=(",", ":"), allow_nan=False), encoding="utf-8")
        print(f"已导出 {chemistry}: {path.stat().st_size} 字节", flush=True)
        for age, start, end, frequency in [(0, 20, 90, 4), (18, 20, 90, 4), (48, 10, 100, 7), (120, 40, 80, 2)]:
            payload = {"battery_type": chemistry.upper(), "voltage": 48, "capacity_ah": 20,
                       "battery_age_months": age, "charge_start_soc": start, "charge_end_soc": end,
                       "weekly_charge_times": frequency, "city": "Chengdu", "driving_style": "normal",
                       "load_condition": "single", "long_term_storage": "occasionally",
                       "parking_environment": "indoor"}
            features = _model_features(estimate_user_features(payload), bundle)
            parity.append({"input": payload, "model_features": features.iloc[0].to_dict(),
                           "raw_prediction": float(bundle.model.predict(features)[0]),
                           "expected": predict_from_user_input(payload, bundle)})
    fixtures = web_dir / "tests" / "fixtures"
    fixtures.mkdir(parents=True, exist_ok=True)
    (fixtures / "prediction-parity.json").write_text(json.dumps(parity, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, default=MODEL_DIR)
    parser.add_argument("--web-dir", type=Path, default=PROJECT_ROOT / "Battest" / "web")
    args = parser.parse_args()
    export_web_models(args.model_dir, args.web_dir)
