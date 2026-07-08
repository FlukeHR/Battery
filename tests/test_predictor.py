from src.predictor import predict_from_user_input


def test_predict_from_user_input_returns_user_facing_fields_without_model():
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
