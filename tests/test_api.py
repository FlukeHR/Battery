from fastapi.testclient import TestClient

from api.main import app


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
