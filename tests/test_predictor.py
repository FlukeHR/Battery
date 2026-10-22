import numpy as np
import pytest

from src.predictor import ModelBundle, predict_from_user_input


def test_predict_from_user_input_returns_user_facing_fields_without_model(monkeypatch):
    monkeypatch.setattr("src.predictor.load_model_bundle", lambda **kwargs: None)
    result = predict_from_user_input(
        {
            "battery_type": "LFP",
            "voltage": 48,
            "capacity_ah": 20,
            "battery_age_months": 24,
            "charge_start_soc": 10,
            "charge_end_soc": 100,
            "weekly_charge_times": 5,
            "driving_style": "aggressive",
            "city": "Chengdu",
            "parking_environment": "outdoor_sunlight",
            "load_condition": "two_people",
            "long_term_storage": "often",
        },
        model_bundle=None,
    )

    assert 0.0 < result["soh"] <= 1.0
    assert result["soh_percent"] == round(result["soh"] * 100)
    assert result["estimated_remaining_months"] >= 0
    assert result["risk_level"] in {"low", "medium", "high"}
    assert result["main_degradation_factors"]
    assert result["suggestions"]
    assert "single_charge_dod" in result["mapped_features"]
    assert "nominal_cycle_life" in result["mapped_features"]
    assert result["model_used"] is False
    assert result["training_datasets"] == []


class ConstantModel:
    def predict(self, frame):
        return np.full(len(frame), 0.92)


@pytest.mark.parametrize("battery_type,chemistry,datasets", [
    ("LFP", "lfp", ("HUST", "MATR")),
    ("LiFePO4", "lfp", ("HUST", "MATR")),
    ("磷酸铁锂", "lfp", ("HUST", "MATR")),
    ("NCM", "ncm", ("CALB",)),
    ("NMC", "ncm", ("CALB",)),
    ("三元锂电池", "ncm", ("CALB",)),
])
def test_prediction_routes_to_matching_chemistry(monkeypatch, battery_type, chemistry, datasets):
    bundle = ModelBundle(ConstantModel(), ["cycle_index"], {"cycle_index": 0}, {}, chemistry, datasets)
    calls = []

    def load(*, battery_chemistry):
        calls.append(battery_chemistry)
        return bundle

    monkeypatch.setattr("src.predictor.load_model_bundle", load)
    result = predict_from_user_input({"battery_type": battery_type})
    assert calls == [chemistry]
    assert result["model_used"]
    assert result["battery_chemistry"] == chemistry
    assert result["training_datasets"] == list(datasets)


@pytest.mark.parametrize("battery_type", ["LFP", "Lead-acid", "Unknown"])
def test_wrong_chemistry_bundle_is_never_used(battery_type):
    bundle = ModelBundle(ConstantModel(), ["cycle_index"], {}, {})
    result = predict_from_user_input({"battery_type": battery_type}, model_bundle=bundle)
    assert result["model_used"] is False
    assert result["training_datasets"] == []
