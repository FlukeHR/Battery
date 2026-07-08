import math

from src.feature_engineering import extract_cycle_features


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
