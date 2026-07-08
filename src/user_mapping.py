from __future__ import annotations

from typing import Any, Mapping


PARKING_TEMPERATURE_FACTORS = {
    "indoor": 1.0,
    "underground": 1.0,
    "outdoor_shade": 1.1,
    "outdoor_sunlight": 1.25,
}

BATTERY_CHEMISTRY = {
    "lfp": {
        "label": "LFP",
        "nominal_cycle_life": 2500,
        "cycle_loss_factor": 0.65,
        "calendar_loss_factor": 0.90,
    },
    "ncm": {
        "label": "NCM",
        "nominal_cycle_life": 1500,
        "cycle_loss_factor": 1.00,
        "calendar_loss_factor": 1.00,
    },
    "lead_acid": {
        "label": "LEAD_ACID",
        "nominal_cycle_life": 500,
        "cycle_loss_factor": 1.75,
        "calendar_loss_factor": 1.35,
    },
    "unknown": {
        "label": "UNKNOWN",
        "nominal_cycle_life": 1500,
        "cycle_loss_factor": 1.00,
        "calendar_loss_factor": 1.00,
    },
}

DRIVING_STRESS_FACTORS = {
    "gentle": 0.85,
    "normal": 1.0,
    "aggressive": 1.25,
}

LOAD_STRESS_FACTORS = {
    "single": 1.0,
    "two_people": 1.15,
    "frequent_heavy_load": 1.30,
}

STORAGE_STRESS_FACTORS = {
    "rarely": 1.0,
    "never": 1.0,
    "occasionally": 1.08,
    "often": 1.25,
}

CITY_BASE_TEMPERATURES = {
    "chengdu": 24.0,
    "beijing": 22.0,
    "shanghai": 25.0,
    "guangzhou": 28.0,
    "shenzhen": 28.0,
    "wuhan": 27.0,
    "xian": 24.0,
    "harbin": 12.0,
    "chongqing": 28.0,
    "nanjing": 26.0,
    "hangzhou": 26.0,
    "changsha": 27.0,
    "zhengzhou": 25.0,
    "tianjin": 22.0,
    "shenyang": 16.0,
    "changchun": 14.0,
    "jinan": 24.0,
    "qingdao": 22.0,
    "hefei": 26.0,
    "fuzhou": 28.0,
    "xiamen": 28.0,
    "nanning": 29.0,
    "kunming": 20.0,
    "guiyang": 22.0,
    "haikou": 30.0,
    "urumqi": 18.0,
    "lanzhou": 19.0,
    "yinchuan": 18.0,
    "xining": 14.0,
    "lhasa": 12.0,
    "suzhou": 26.0,
    "ningbo": 26.0,
    "wuxi": 26.0,
    "foshan": 28.0,
    "dongguan": 28.0,
    "北京": 22.0,
    "上海": 25.0,
    "广州": 28.0,
    "深圳": 28.0,
    "成都": 24.0,
    "重庆": 28.0,
    "武汉": 27.0,
    "西安": 24.0,
    "南京": 26.0,
    "杭州": 26.0,
    "长沙": 27.0,
    "郑州": 25.0,
    "天津": 22.0,
    "哈尔滨": 12.0,
    "沈阳": 16.0,
    "长春": 14.0,
    "济南": 24.0,
    "青岛": 22.0,
    "合肥": 26.0,
    "福州": 28.0,
    "厦门": 28.0,
    "南宁": 29.0,
    "昆明": 20.0,
    "贵阳": 22.0,
    "海口": 30.0,
    "乌鲁木齐": 18.0,
    "兰州": 19.0,
    "银川": 18.0,
    "西宁": 14.0,
    "拉萨": 12.0,
}


def _float(payload: Mapping[str, Any], key: str, default: float) -> float:
    try:
        return float(payload.get(key, default))
    except (TypeError, ValueError):
        return default


def _norm(value: Any) -> str:
    return str(value or "unknown").strip().lower().replace(" ", "_").replace("-", "_")


def _battery_key(value: Any) -> str:
    normalized = _norm(value)
    if normalized in {"lfp", "lifepo4", "lithium_iron_phosphate", "磷酸铁锂"}:
        return "lfp"
    if normalized in {"ncm", "nmc", "ternary_lithium", "三元锂", "三元锂电池"}:
        return "ncm"
    if normalized in {"lead_acid", "leadacid", "lead", "铅酸", "铅酸电池"}:
        return "lead_acid"
    return "unknown"


def _weekly_charge_times(payload: Mapping[str, Any]) -> float:
    value = payload.get("weekly_charge_times", payload.get("charge_frequency", 4.0))
    try:
        times = float(value)
    except (TypeError, ValueError):
        digits = "".join(ch for ch in str(value) if ch.isdigit() or ch == ".")
        times = float(digits) if digits else 4.0
    return min(max(times, 0.0), 14.0)


def _factor(mapping: dict[str, float], value: Any, default_key: str) -> float:
    normalized = _norm(value)
    if normalized in {"two", "double"}:
        normalized = "two_people"
    if normalized in {"heavy", "frequent_heavy"}:
        normalized = "frequent_heavy_load"
    if normalized in {"mild", "calm"}:
        normalized = "gentle"
    if normalized in {"sport", "intense"}:
        normalized = "aggressive"
    return mapping.get(normalized, mapping[default_key])


def risk_level_from_soh(soh: float) -> str:
    if soh >= 0.88:
        return "low"
    if soh >= 0.80:
        return "medium"
    return "high"


def estimate_user_features(payload: Mapping[str, Any]) -> dict[str, Any]:
    battery_key = _battery_key(payload.get("battery_type", "unknown"))
    chemistry = BATTERY_CHEMISTRY[battery_key]
    voltage = _float(payload, "voltage", _float(payload, "battery_voltage", 48.0))
    capacity_ah = _float(payload, "capacity_ah", _float(payload, "battery_capacity_ah", 20.0))
    charge_start_soc = min(max(_float(payload, "charge_start_soc", 20.0), 0.0), 100.0)
    charge_end_soc = min(max(_float(payload, "charge_end_soc", 90.0), 0.0), 100.0)
    battery_energy_wh = max(voltage * capacity_ah, 1.0)
    single_charge_dod = min(max((charge_end_soc - charge_start_soc) / 100.0, 0.0), 1.0)
    weekly_charge_times = _weekly_charge_times(payload)
    annual_equivalent_cycles = single_charge_dod * weekly_charge_times * 52.0

    parking = _norm(payload.get("parking_environment", "indoor"))
    city = _norm(payload.get("city", "chengdu"))
    long_term_storage = _norm(payload.get("long_term_storage", payload.get("high_soc_storage", "occasionally")))
    driving_style = _norm(payload.get("driving_style", "normal"))
    load_condition = _norm(payload.get("load_condition", "single"))
    temperature_factor = PARKING_TEMPERATURE_FACTORS.get(parking, 1.05)
    base_temp = CITY_BASE_TEMPERATURES.get(city, 24.0)
    estimated_temperature = base_temp * temperature_factor
    driving_stress = _factor(DRIVING_STRESS_FACTORS, driving_style, "normal")
    load_stress = _factor(LOAD_STRESS_FACTORS, load_condition, "single")
    storage_stress = _factor(STORAGE_STRESS_FACTORS, long_term_storage, "occasionally")
    stress_factor = driving_stress * load_stress
    c_rate = 0.20 * stress_factor

    risk_factors: list[str] = []
    suggestions: list[str] = []
    if charge_end_soc >= 95:
        risk_factors.append("Frequent full charging")
        suggestions.append("Try to stop daily charging around 80%-90% instead of 100%.")
    if single_charge_dod >= 0.8:
        risk_factors.append("Large charge-discharge window")
        suggestions.append("Use a narrower daily SOC window when possible, such as 20%-90%.")
    if weekly_charge_times >= 6:
        risk_factors.append("High charging frequency")
        suggestions.append("Frequent charging is fine when the SOC window is moderate; avoid combining it with deep cycles.")
    if long_term_storage in {"often", "yes", "frequent"}:
        risk_factors.append("Long-term storage without disconnecting battery")
        suggestions.append("For long storage, avoid full charge and turn off the battery leakage switch if available.")
    if charge_start_soc <= 10:
        risk_factors.append("Deep discharge habit")
        suggestions.append("Start charging before the battery drops below about 20%.")
    if parking == "outdoor_sunlight" or temperature_factor >= 1.2:
        risk_factors.append("Outdoor high-temperature parking")
        suggestions.append("Park indoors or in shade during hot weather when possible.")
    if driving_stress > 1.0:
        risk_factors.append("Aggressive driving style")
        suggestions.append("Smooth starts and fewer hard accelerations reduce current stress.")
    if load_stress > 1.0:
        risk_factors.append("High vehicle load")
        suggestions.append("Heavy loads increase battery current stress and heat.")
    if battery_key == "lead_acid":
        risk_factors.append("Shorter lead-acid cycle life")
        suggestions.append("Lead-acid batteries usually age faster than lithium batteries under cycling.")

    if not risk_factors:
        risk_factors.append("Normal calendar and cycle aging")
        suggestions.append("Keep regular 20%-90% charging habits and avoid extreme temperatures.")

    return {
        "battery_type": chemistry["label"],
        "battery_chemistry": battery_key,
        "nominal_cycle_life": chemistry["nominal_cycle_life"],
        "chemistry_cycle_loss_factor": chemistry["cycle_loss_factor"],
        "chemistry_calendar_loss_factor": chemistry["calendar_loss_factor"],
        "voltage": voltage,
        "capacity_ah": capacity_ah,
        "battery_age_months": max(_float(payload, "battery_age_months", 12.0), 0.0),
        "battery_energy_wh": battery_energy_wh,
        "single_charge_dod": single_charge_dod,
        "daily_dod": single_charge_dod,
        "weekly_charge_times": weekly_charge_times,
        "annual_equivalent_cycles": annual_equivalent_cycles,
        "estimated_cycles_elapsed": annual_equivalent_cycles
        * max(_float(payload, "battery_age_months", 12.0), 0.0)
        / 12.0,
        "temperature_factor": temperature_factor,
        "estimated_temperature_c": estimated_temperature,
        "estimated_c_rate": c_rate,
        "driving_stress_factor": driving_stress,
        "load_stress_factor": load_stress,
        "storage_stress_factor": storage_stress,
        "stress_factor": stress_factor,
        "charge_start_soc": charge_start_soc,
        "charge_end_soc": charge_end_soc,
        "risk_factors": risk_factors,
        "suggestions": suggestions,
    }
