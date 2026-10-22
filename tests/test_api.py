from fastapi.testclient import TestClient
import pytest

from api.main import app
from src.predictor import ModelBundle


def test_predict_endpoint_returns_prediction_payload():
    client = TestClient(app)

    response = client.post(
        "/predict",
        json={
            "battery_type": "LFP",
            "voltage": 48,
            "capacity_ah": 20,
            "battery_age_months": 18,
            "charge_start_soc": 20,
            "charge_end_soc": 90,
            "weekly_charge_times": 4,
            "driving_style": "normal",
            "city": "Chengdu",
            "parking_environment": "outdoor_sunlight",
            "load_condition": "single",
            "long_term_storage": "often",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) >= {
        "soh",
        "soh_percent",
        "estimated_remaining_months",
        "risk_level",
        "main_degradation_factors",
        "suggestions",
    }


def test_health_endpoint_reports_model_status():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert "model_loaded" in response.json()
    assert set(response.json()["models"]) == {"ncm", "lfp"}


@pytest.mark.parametrize("battery_type,chemistry,datasets", [
    ("LFP", "lfp", ["HUST", "MATR"]),
    ("NCM", "ncm", ["CALB"]),
    ("Lead-acid", "lead_acid", []),
    ("Unknown", "unknown", []),
])
def test_api_reports_matching_model_source(monkeypatch, battery_type, chemistry, datasets):
    class Model:
        def predict(self, frame):
            return [0.92]

    def load(*, battery_chemistry):
        assert battery_chemistry == chemistry
        return ModelBundle(Model(), ["cycle_index"], {}, {}, chemistry, tuple(datasets)) if datasets else None

    monkeypatch.setattr("src.predictor.load_model_bundle", load)
    response = TestClient(app).post("/predict", json={"battery_type": battery_type})
    assert response.status_code == 200
    result = response.json()
    assert result["battery_chemistry"] == chemistry
    assert result["training_datasets"] == datasets
    assert result["model_used"] == bool(datasets)
    assert result["prediction_note"]
