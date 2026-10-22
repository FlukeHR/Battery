import json

import pandas as pd
import pytest

from src.feature_engineering import extract_cycle_features, save_processed_datasets
from src.predictor import load_model_bundle
from src.train_xgboost import train_model


def test_training_saves_separate_models_and_training_only_defaults(tmp_path):
    rows = []
    for dataset, material in [("CALB", "NMC"), ("HUST", "LFP"), ("MATR", "LiFePO4")]:
        for cell in range(5):
            rows.extend(extract_cycle_features({
                "cell_id": f"{dataset}_{cell}", "cathode_material": material,
                "nominal_capacity_in_Ah": 1.1,
                "cycle_data": [{"discharge_capacity_in_Ah": [0, 1 - cycle / 10],
                                "temperature_in_C": None if dataset == "HUST" else [20 + cell * 10],
                                "current_in_A": [1, -1], "voltage_in_V": [3.0, 3.5],
                                "time_in_s": [0, 10]} for cycle in range(3)],
            }))
    paths = save_processed_datasets(pd.DataFrame(rows), tmp_path / "processed")
    model_root = tmp_path / "models"
    train = pd.read_csv(paths["train"])
    for chemistry, datasets in [("ncm", ["CALB"]), ("lfp", ["HUST", "MATR"])]:
        directory = model_root / "lfp" if chemistry == "lfp" else model_root
        train_model(paths["train"], paths["test"], directory, chemistry, tmp_path / "reports" / chemistry)
        metadata = json.loads((directory / "model_metadata.json").read_text())
        assert metadata["training_datasets"] == datasets
        assert not set(metadata["train_cells"]) & set(metadata["test_cells"])
        assert metadata["defaults"]["temperature_mean"] == train.loc[
            train["battery_chemistry"] == chemistry, "temperature_mean"
        ].median()
        assert set(metadata["dataset_metrics"]) == set(datasets)
        bundle = load_model_bundle(model_root, chemistry)
        assert bundle.battery_chemistry == chemistry
        assert list(bundle.training_datasets) == datasets
    assert load_model_bundle(tmp_path / "missing", "lfp") is None
    assert load_model_bundle(model_root, "lead_acid") is None
    # An incorrectly installed NCM model must not be treated as LFP.
    metadata["battery_chemistry"] = "ncm"
    (model_root / "lfp" / "model_metadata.json").write_text(json.dumps(metadata))
    assert load_model_bundle(model_root, "lfp") is None
    leaking = train.iloc[:3].copy()
    leaking.to_csv(tmp_path / "leak.csv", index=False)
    with pytest.raises(ValueError, match="whole cells"):
        train_model(tmp_path / "leak.csv", tmp_path / "leak.csv", tmp_path / "unused")
