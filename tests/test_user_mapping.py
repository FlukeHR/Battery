import math

from src.user_mapping import estimate_user_features, risk_level_from_soh


def test_estimate_user_features_maps_daily_use_to_model_inputs():
    payload = {
        "battery_type": "LFP",
        "voltage": 48,
        "capacity_ah": 20,
        "battery_age_months": 18,
        "charge_start_soc": 20,
        "charge_end_soc": 90,
        "weekly_charge_times": 4,
        "driving_style": "aggressive",
        "city": "Shenzhen",
        "parking_environment": "outdoor_sunlight",
        "load_condition": "two_people",
        "long_term_storage": "often",
    }

    features = estimate_user_features(payload)

    assert math.isclose(features["battery_energy_wh"], 960.0)
    assert math.isclose(features["single_charge_dod"], 0.7)
    assert math.isclose(features["daily_dod"], 0.7)
    assert math.isclose(features["annual_equivalent_cycles"], 145.6)
    assert math.isclose(features["estimated_cycles_elapsed"], 218.4)
    assert features["nominal_cycle_life"] == 2500
    assert features["temperature_factor"] == 1.25
    assert math.isclose(features["estimated_temperature_c"], 35.0)
    assert features["estimated_c_rate"] > 0.2
    assert features["stress_factor"] > 1.0
    assert "Long-term storage without disconnecting battery" in features["risk_factors"]


def test_battery_type_changes_nominal_cycle_life():
    base_payload = {
        "voltage": 48,
        "capacity_ah": 20,
        "battery_age_months": 12,
        "charge_start_soc": 30,
        "charge_end_soc": 90,
        "weekly_charge_times": 3,
        "city": "Beijing",
        "parking_environment": "indoor",
    }

    assert estimate_user_features({**base_payload, "battery_type": "LFP"})["nominal_cycle_life"] == 2500
    assert estimate_user_features({**base_payload, "battery_type": "NCM"})["nominal_cycle_life"] == 1500
    assert estimate_user_features({**base_payload, "battery_type": "Lead-acid"})["nominal_cycle_life"] == 500


def test_risk_level_from_soh_has_clear_thresholds():
    assert risk_level_from_soh(0.92) == "low"
    assert risk_level_from_soh(0.84) == "medium"
    assert risk_level_from_soh(0.76) == "high"
