export type RiskLevel = "low" | "medium" | "high";

export interface PredictionInput {
  battery_type: string;
  voltage: number;
  capacity_ah: number;
  battery_age_months: number;
  charge_start_soc: number;
  charge_end_soc: number;
  weekly_charge_times: number;
  driving_style: string;
  load_condition: string;
  long_term_storage: string;
  city: string;
  parking_environment: string;
}

export interface PredictionResult {
  soh: number;
  soh_percent: number;
  estimated_remaining_months: number;
  estimated_remaining_years: number;
  risk_level: RiskLevel;
  main_degradation_factors: string[];
  suggestions: string[];
  mapped_features: Record<string, number>;
  model_used: boolean;
}

type BatteryKey = "lfp" | "ncm" | "lead_acid" | "unknown";

interface ChemistryProfile {
  nominalCycleLife: number;
  cycleLossFactor: number;
  calendarLossFactor: number;
}

interface UserFeatures {
  batteryAgeMonths: number;
  chargeStartSoc: number;
  chargeEndSoc: number;
  singleChargeDod: number;
  weeklyChargeTimes: number;
  annualEquivalentCycles: number;
  estimatedCyclesElapsed: number;
  temperatureFactor: number;
  estimatedTemperature: number;
  estimatedCRate: number;
  stressFactor: number;
  storageStressFactor: number;
  nominalCycleLife: number;
  chemistryCycleLossFactor: number;
  chemistryCalendarLossFactor: number;
  riskFactors: string[];
  suggestions: string[];
}

const EOL_SOH = 0.8;

const BATTERY_CHEMISTRY: Record<BatteryKey, ChemistryProfile> = {
  lfp: {
    nominalCycleLife: 2500,
    cycleLossFactor: 0.65,
    calendarLossFactor: 0.9,
  },
  ncm: {
    nominalCycleLife: 1500,
    cycleLossFactor: 1,
    calendarLossFactor: 1,
  },
  lead_acid: {
    nominalCycleLife: 500,
    cycleLossFactor: 1.75,
    calendarLossFactor: 1.35,
  },
  unknown: {
    nominalCycleLife: 1500,
    cycleLossFactor: 1,
    calendarLossFactor: 1,
  },
};

const PARKING_TEMPERATURE_FACTORS: Record<string, number> = {
  indoor: 1,
  underground: 1,
  outdoor_shade: 1.1,
  outdoor_sunlight: 1.25,
};

const DRIVING_STRESS_FACTORS: Record<string, number> = {
  gentle: 0.85,
  normal: 1,
  aggressive: 1.25,
};

const LOAD_STRESS_FACTORS: Record<string, number> = {
  single: 1,
  two_people: 1.15,
  frequent_heavy_load: 1.3,
};

const STORAGE_STRESS_FACTORS: Record<string, number> = {
  rarely: 1,
  never: 1,
  occasionally: 1.08,
  often: 1.25,
};

const CITY_BASE_TEMPERATURES: Record<string, number> = {
  chengdu: 24,
  beijing: 22,
  shanghai: 25,
  guangzhou: 28,
  shenzhen: 28,
  wuhan: 27,
  xian: 24,
  harbin: 12,
  chongqing: 28,
  nanjing: 26,
  hangzhou: 26,
  changsha: 27,
  zhengzhou: 25,
  tianjin: 22,
  shenyang: 16,
  changchun: 14,
  jinan: 24,
  qingdao: 22,
  hefei: 26,
  fuzhou: 28,
  xiamen: 28,
  nanning: 29,
  kunming: 20,
  guiyang: 22,
  haikou: 30,
  urumqi: 18,
  lanzhou: 19,
  yinchuan: 18,
  xining: 14,
  lhasa: 12,
  suzhou: 26,
  ningbo: 26,
  wuxi: 26,
  foshan: 28,
  dongguan: 28,
  北京: 22,
  上海: 25,
  广州: 28,
  深圳: 28,
  成都: 24,
  重庆: 28,
  武汉: 27,
  西安: 24,
  南京: 26,
  杭州: 26,
  长沙: 27,
  郑州: 25,
  天津: 22,
  哈尔滨: 12,
  沈阳: 16,
  长春: 14,
  济南: 24,
  青岛: 22,
  合肥: 26,
  福州: 28,
  厦门: 28,
  南宁: 29,
  昆明: 20,
  贵阳: 22,
  海口: 30,
  乌鲁木齐: 18,
  兰州: 19,
  银川: 18,
  西宁: 14,
  拉萨: 12,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function batteryKey(value: string): BatteryKey {
  const normalized = normalize(value);
  if (["lfp", "lifepo4", "lithium_iron_phosphate", "磷酸铁锂"].includes(normalized)) {
    return "lfp";
  }
  if (["ncm", "nmc", "ternary_lithium", "三元锂", "三元锂电池"].includes(normalized)) {
    return "ncm";
  }
  if (["lead_acid", "leadacid", "lead", "铅酸", "铅酸电池"].includes(normalized)) {
    return "lead_acid";
  }
  return "unknown";
}

function factor(
  factors: Record<string, number>,
  rawValue: string,
  defaultKey: string
) {
  let normalized = normalize(rawValue);
  if (["two", "double"].includes(normalized)) normalized = "two_people";
  if (["heavy", "frequent_heavy"].includes(normalized)) {
    normalized = "frequent_heavy_load";
  }
  if (["mild", "calm"].includes(normalized)) normalized = "gentle";
  if (["sport", "intense"].includes(normalized)) normalized = "aggressive";
  return factors[normalized] ?? factors[defaultKey];
}

function riskLevelFromSoh(soh: number): RiskLevel {
  if (soh >= 0.88) return "low";
  if (soh >= 0.8) return "medium";
  return "high";
}

function estimateUserFeatures(input: PredictionInput): UserFeatures {
  const key = batteryKey(input.battery_type);
  const chemistry = BATTERY_CHEMISTRY[key];
  const chargeStartSoc = clamp(input.charge_start_soc, 0, 100);
  const chargeEndSoc = clamp(input.charge_end_soc, 0, 100);
  const singleChargeDod = clamp((chargeEndSoc - chargeStartSoc) / 100, 0, 1);
  const weeklyChargeTimes = clamp(input.weekly_charge_times, 0, 14);
  const annualEquivalentCycles = singleChargeDod * weeklyChargeTimes * 52;
  const batteryAgeMonths = Math.max(input.battery_age_months, 0);

  const parking = normalize(input.parking_environment);
  const city = normalize(input.city);
  const longTermStorage = normalize(input.long_term_storage);
  const temperatureFactor = PARKING_TEMPERATURE_FACTORS[parking] ?? 1.05;
  const estimatedTemperature = (CITY_BASE_TEMPERATURES[city] ?? 24) * temperatureFactor;
  const drivingStress = factor(DRIVING_STRESS_FACTORS, input.driving_style, "normal");
  const loadStress = factor(LOAD_STRESS_FACTORS, input.load_condition, "single");
  const storageStress = factor(
    STORAGE_STRESS_FACTORS,
    input.long_term_storage,
    "occasionally"
  );
  const stressFactor = drivingStress * loadStress;
  const estimatedCRate = 0.2 * stressFactor;

  const riskFactors: string[] = [];
  const suggestions: string[] = [];

  if (chargeEndSoc >= 95) {
    riskFactors.push("经常充至满电");
    suggestions.push("日常充电尽量在 80%–90% 左右停止，避免频繁充满至 100%。");
  }
  if (singleChargeDod >= 0.8) {
    riskFactors.push("充放电区间较大");
    suggestions.push("条件允许时缩小日常电量区间，例如保持在 20%–90%。");
  }
  if (weeklyChargeTimes >= 6) {
    riskFactors.push("充电频率较高");
    suggestions.push("适度电量区间内频繁补电影响有限，但应避免同时进行深度循环。");
  }
  if (["often", "yes", "frequent"].includes(longTermStorage)) {
    riskFactors.push("长期存放时未断开电池");
    suggestions.push("长期存放时避免满电，并在条件允许时关闭电池漏电保护开关。");
  }
  if (chargeStartSoc <= 10) {
    riskFactors.push("存在深度放电习惯");
    suggestions.push("尽量在电量降至约 20% 前开始充电。");
  }
  if (parking === "outdoor_sunlight" || temperatureFactor >= 1.2) {
    riskFactors.push("经常在室外高温环境停放");
    suggestions.push("高温天气尽量停放在室内或阴凉处。");
  }
  if (drivingStress > 1) {
    riskFactors.push("驾驶习惯较激烈");
    suggestions.push("平稳起步并减少急加速，可以降低电流冲击。");
  }
  if (loadStress > 1) {
    riskFactors.push("车辆负载较高");
    suggestions.push("重载会增加电池电流压力与发热，应尽量减少持续重载。");
  }
  if (key === "lead_acid") {
    riskFactors.push("铅酸电池循环寿命相对较短");
    suggestions.push("铅酸电池在循环使用中通常比锂电池老化更快，建议缩短检查周期。");
  }
  if (riskFactors.length === 0) {
    riskFactors.push("正常的日历老化与循环衰减");
    suggestions.push("保持规律的 20%–90% 充电习惯，并避免极端温度环境。");
  }

  return {
    batteryAgeMonths,
    chargeStartSoc,
    chargeEndSoc,
    singleChargeDod,
    weeklyChargeTimes,
    annualEquivalentCycles,
    estimatedCyclesElapsed: (annualEquivalentCycles * batteryAgeMonths) / 12,
    temperatureFactor,
    estimatedTemperature,
    estimatedCRate,
    stressFactor,
    storageStressFactor: storageStress,
    nominalCycleLife: chemistry.nominalCycleLife,
    chemistryCycleLossFactor: chemistry.cycleLossFactor,
    chemistryCalendarLossFactor: chemistry.calendarLossFactor,
    riskFactors,
    suggestions,
  };
}

function heuristicSoh(features: UserFeatures) {
  const calendarLoss =
    features.batteryAgeMonths *
    0.0017 *
    features.temperatureFactor *
    features.storageStressFactor *
    features.chemistryCalendarLossFactor;
  const cycleLifeFraction = features.estimatedCyclesElapsed / features.nominalCycleLife;
  const cycleLoss =
    cycleLifeFraction *
    0.2 *
    (0.75 + features.singleChargeDod) *
    features.stressFactor *
    features.chemistryCycleLossFactor;
  const chargeLoss = Math.max(features.chargeEndSoc - 90, 0) * 0.0012;
  const deepDischargeLoss = Math.max(20 - features.chargeStartSoc, 0) * 0.0009;
  const cRateLoss = Math.max(features.estimatedCRate - 0.25, 0) * 0.08;

  return clamp(
    1 - calendarLoss - cycleLoss - chargeLoss - deepDischargeLoss - cRateLoss,
    0.55,
    1
  );
}

function remainingMonths(soh: number, features: UserFeatures) {
  if (soh <= EOL_SOH) return 0;

  const ageMonths = Math.max(features.batteryAgeMonths, 1);
  const observedMonthlyLoss = Math.max((1 - soh) / ageMonths, 0.002);
  const futureStress =
    1 +
    Math.max(features.singleChargeDod - 0.35, 0) +
    Math.max(features.temperatureFactor - 1, 0) * 0.8 +
    Math.max(features.estimatedCRate - 0.25, 0) +
    Math.max(features.storageStressFactor - 1, 0);
  const cycleMonthlyLoss =
    (features.annualEquivalentCycles / 12 / features.nominalCycleLife) *
    0.2 *
    features.stressFactor;
  const monthlyLoss = Math.max(
    observedMonthlyLoss * futureStress,
    cycleMonthlyLoss,
    0.0015
  );

  return Math.max(Math.round((soh - EOL_SOH) / monthlyLoss), 0);
}

/**
 * Online inference used by the unified Next.js application.
 * The XGBoost training pipeline remains in the repository for offline research;
 * the browser-facing runtime uses this deterministic, explainable estimator.
 */
export function predictFromUserInput(input: PredictionInput): PredictionResult {
  const features = estimateUserFeatures(input);
  const soh = heuristicSoh(features);
  const months = remainingMonths(soh, features);

  return {
    soh: roundTo(soh, 4),
    soh_percent: Math.round(soh * 100),
    estimated_remaining_months: months,
    estimated_remaining_years: roundTo(months / 12, 1),
    risk_level: riskLevelFromSoh(soh),
    main_degradation_factors: features.riskFactors.slice(0, 4),
    suggestions: features.suggestions.slice(0, 4),
    mapped_features: {
      single_charge_dod: roundTo(features.singleChargeDod, 4),
      daily_dod: roundTo(features.singleChargeDod, 4),
      weekly_charge_times: roundTo(features.weeklyChargeTimes, 2),
      annual_equivalent_cycles: roundTo(features.annualEquivalentCycles, 2),
      temperature_factor: roundTo(features.temperatureFactor, 2),
      estimated_temperature_c: roundTo(features.estimatedTemperature, 1),
      estimated_c_rate: roundTo(features.estimatedCRate, 3),
      stress_factor: roundTo(features.stressFactor, 3),
      nominal_cycle_life: Math.round(features.nominalCycleLife),
    },
    model_used: false,
  };
}
