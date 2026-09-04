import type { AssessmentDraft, PredictionInput } from "../types/prediction";

export type ValidationField = keyof AssessmentDraft;

export interface ValidationIssue {
  field: ValidationField;
  message: string;
  step: number;
}

const BATTERY_TYPES = new Set(["LFP", "NCM", "Lead-acid", "Unknown"]);
const DRIVING_STYLES = new Set(["gentle", "normal", "aggressive"]);
const LOAD_CONDITIONS = new Set(["single", "two_people", "frequent_heavy_load"]);
const STORAGE_FREQUENCIES = new Set(["rarely", "occasionally", "often"]);
const PARKING_ENVIRONMENTS = new Set([
  "indoor",
  "underground",
  "outdoor_shade",
  "outdoor_sunlight",
]);

function inRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

export function validateDraft(draft: AssessmentDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!["daily", "range_issue", "resale"].includes(draft.scenario)) {
    issues.push({ field: "scenario", message: "请选择本次评估场景。", step: 0 });
  }
  if (!BATTERY_TYPES.has(draft.battery_type)) {
    issues.push({ field: "battery_type", message: "请选择有效的电池类型。", step: 1 });
  }
  if (!inRange(draft.voltage, 1, 120)) {
    issues.push({ field: "voltage", message: "额定电压应在 1–120V 之间。", step: 1 });
  }
  if (!inRange(draft.capacity_ah, 1, 120)) {
    issues.push({ field: "capacity_ah", message: "标称容量应在 1–120Ah 之间。", step: 1 });
  }
  if (!Number.isInteger(draft.battery_age_months) || !inRange(draft.battery_age_months, 0, 240)) {
    issues.push({ field: "battery_age_months", message: "已使用月份应为 0–240 的整数。", step: 1 });
  }
  if (!inRange(draft.charge_start_soc, 0, 100)) {
    issues.push({ field: "charge_start_soc", message: "开始充电电量应在 0%–100% 之间。", step: 2 });
  }
  if (!inRange(draft.charge_end_soc, 0, 100)) {
    issues.push({ field: "charge_end_soc", message: "结束充电电量应在 0%–100% 之间。", step: 2 });
  }
  if (draft.charge_end_soc <= draft.charge_start_soc) {
    issues.push({ field: "charge_end_soc", message: "充电结束电量必须高于开始电量。", step: 2 });
  }
  if (!Number.isInteger(draft.weekly_charge_times) || !inRange(draft.weekly_charge_times, 0, 14)) {
    issues.push({ field: "weekly_charge_times", message: "每周充电次数应为 0–14 的整数。", step: 2 });
  }
  if (!DRIVING_STYLES.has(draft.driving_style)) {
    issues.push({ field: "driving_style", message: "请选择有效的驾驶习惯。", step: 3 });
  }
  if (!LOAD_CONDITIONS.has(draft.load_condition)) {
    issues.push({ field: "load_condition", message: "请选择有效的负载情况。", step: 3 });
  }
  if (!STORAGE_FREQUENCIES.has(draft.long_term_storage)) {
    issues.push({ field: "long_term_storage", message: "请选择有效的长期存放频率。", step: 3 });
  }
  if (!draft.city.trim()) {
    issues.push({ field: "city", message: "请选择所在城市。", step: 3 });
  }
  if (!PARKING_ENVIRONMENTS.has(draft.parking_environment)) {
    issues.push({ field: "parking_environment", message: "请选择有效的停放环境。", step: 3 });
  }

  return issues;
}

export function validateStep(draft: AssessmentDraft, step: number): ValidationIssue[] {
  return validateDraft(draft).filter((issue) => issue.step === step);
}

export function toPredictionInput(draft: AssessmentDraft): PredictionInput {
  const { scenario, ...input } = draft;
  void scenario;
  return input;
}
