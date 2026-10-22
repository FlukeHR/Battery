import math

import pandas as pd
import pytest

from src.data_loader import find_pickle_files
from src.feature_engineering import clean_feature_table, extract_cycle_features, save_processed_datasets


def test_extract_cycle_features_calculates_soh_from_initial_capacity():
    cell = {
        "cell_id": "cell-a",
        "nominal_capacity_in_Ah": 100.0,
        "depth_of_discharge": 80,
        "cycle_data": [
            {
                "cycle_number": 1,
                "current_in_A": [1.0, -1.0, 0.0],
                "voltage_in_V": [3.4, 3.5, 3.6],
                "temperature_in_C": [25.0, 26.0, 27.0],
                "capacity_in_Ah": 100.0,
                "time_in_s": [0, 10, 20],
            },
            {
                "cycle_number": 2,
                "current_in_A": [2.0, -2.0, 0.0],
                "voltage_in_V": [3.3, 3.4, 3.5],
                "temperature_in_C": [28.0, 29.0, 30.0],
                "capacity_in_Ah": 90.0,
                "time_in_s": [0, 8, 18],
            },
        ],
    }

    rows = extract_cycle_features(cell)

    assert len(rows) == 2
    assert rows[0]["cell_id"] == "cell-a"
    assert rows[0]["cycle_index"] == 1
    assert rows[0]["soh"] == 1.0
    assert math.isclose(rows[1]["soh"], 0.9)
    assert rows[1]["temperature_max"] == 30.0
    assert rows[1]["voltage_std"] > 0
    assert rows[1]["discharge_time"] == 10.0


def test_hust_missing_temperature_is_preserved_without_inventing_measurements():
    cell = {
        "cell_id": "HUST_1-1", "cathode_material": "LFP", "nominal_capacity_in_Ah": 1.1,
        "cycle_data": [{"discharge_capacity_in_Ah": [0, 1.0], "temperature_in_C": None,
                        "voltage_in_V": [3.2, 3.5], "current_in_A": [1, -1]}],
    }
    rows = extract_cycle_features(cell, "HUST_1-1.pkl")
    cleaned = clean_feature_table(pd.DataFrame(rows))
    assert len(cleaned) == 1
    assert cleaned.iloc[0]["battery_chemistry"] == "lfp"
    assert math.isnan(cleaned.iloc[0]["temperature_mean"])
    assert math.isnan(cleaned.iloc[0]["ambient_temperature_in_C"])
    with pytest.raises(ValueError, match="cathode"):
        extract_cycle_features({**cell, "cathode_material": "NMC"}, "HUST_1-1.pkl")


def test_dataset_discovery_and_grouped_split_include_each_source(tmp_path):
    rows = []
    for dataset in ("CALB", "HUST", "MATR"):
        directory = tmp_path / dataset
        directory.mkdir()
        (directory / "cell.pkl").touch()
        for cell in range(5):
            for cycle in range(3):
                rows.append({"dataset": dataset, "cell_id": f"{dataset}_{cell}",
                             "cycle_index": cycle + 1, "soh": 1 - cycle / 10})
    assert len(find_pickle_files(tmp_path)) == 3
    paths = save_processed_datasets(pd.DataFrame(rows), tmp_path / "processed")
    train, test = pd.read_csv(paths["train"]), pd.read_csv(paths["test"])
    assert set(train["dataset"]) == set(test["dataset"]) == {"CALB", "HUST", "MATR"}
    assert not set(train["cell_id"]) & set(test["cell_id"])
    assert len(train) + len(test) == len(rows)
