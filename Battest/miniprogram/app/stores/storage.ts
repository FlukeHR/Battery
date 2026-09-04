import { DEFAULT_DRAFT } from "../config/options";
import type {
  AssessmentDraft,
  PredictionInput,
  PredictionResult,
  RiskLevel,
  StoredReport,
} from "../types/prediction";
import { validateDraft } from "../utils/validation";

const DRAFT_KEY = "battest:draft:v1";
const HISTORY_KEY = "battest:history:v1";
const PENDING_REPORT_KEY = "battest:pending-report:v1";
export const MAX_HISTORY_REPORTS = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === "low" || value === "medium" || value === "high";
}

function isPredictionInput(value: unknown): value is PredictionInput {
  if (!isRecord(value)) return false;
  const stringFields = [
    "battery_type",
    "driving_style",
    "load_condition",
    "long_term_storage",
    "city",
    "parking_environment",
  ];
  const numberFields = [
    "voltage",
    "capacity_ah",
    "battery_age_months",
    "charge_start_soc",
    "charge_end_soc",
    "weekly_charge_times",
  ];
  if (!stringFields.every((key) => typeof value[key] === "string")) return false;
  if (!numberFields.every((key) => typeof value[key] === "number" && Number.isFinite(value[key]))) {
    return false;
  }
  return validateDraft({ ...value, scenario: "daily" } as AssessmentDraft).length === 0;
}

function isPredictionResult(value: unknown): value is PredictionResult {
  return (
    isRecord(value) &&
    typeof value.soh_percent === "number" &&
    Number.isFinite(value.soh_percent) &&
    value.soh_percent >= 0 &&
    value.soh_percent <= 100 &&
    typeof value.estimated_remaining_months === "number" &&
    Number.isFinite(value.estimated_remaining_months) &&
    value.estimated_remaining_months >= 0 &&
    isRiskLevel(value.risk_level) &&
    isStringArray(value.main_degradation_factors) &&
    isStringArray(value.suggestions) &&
    typeof value.model_used === "boolean"
  );
}

export function isStoredReport(value: unknown): value is StoredReport {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    ["daily", "range_issue", "resale"].includes(String(value.scenario)) &&
    isPredictionInput(value.input) &&
    isPredictionResult(value.result) &&
    typeof value.created_at === "string" &&
    !Number.isNaN(Date.parse(value.created_at)) &&
    typeof value.algorithm_version === "string"
  );
}

export function normalizeHistory(value: unknown): StoredReport[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isStoredReport)
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, MAX_HISTORY_REPORTS);
}

export function mergeHistory(history: StoredReport[], report: StoredReport): StoredReport[] {
  return [report, ...history.filter((item) => item.id !== report.id)]
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, MAX_HISTORY_REPORTS);
}

export function createReport(
  draft: AssessmentDraft,
  result: PredictionResult,
  now = new Date(),
): StoredReport {
  if (!draft.scenario) throw new Error("创建报告前必须选择评估场景。");
  const createdAt = result.generated_at && !Number.isNaN(Date.parse(result.generated_at))
    ? result.generated_at
    : now.toISOString();
  return {
    id: result.request_id ?? `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    scenario: draft.scenario,
    input: {
      battery_type: draft.battery_type,
      voltage: draft.voltage,
      capacity_ah: draft.capacity_ah,
      battery_age_months: draft.battery_age_months,
      charge_start_soc: draft.charge_start_soc,
      charge_end_soc: draft.charge_end_soc,
      weekly_charge_times: draft.weekly_charge_times,
      driving_style: draft.driving_style,
      load_condition: draft.load_condition,
      long_term_storage: draft.long_term_storage,
      city: draft.city,
      parking_environment: draft.parking_environment,
    },
    result,
    created_at: createdAt,
    algorithm_version:
      result.algorithm_version ?? (result.model_used ? "XGBoost 模型" : "规则估算 v1"),
  };
}

export function saveDraft(draft: AssessmentDraft): void {
  wx.setStorageSync(DRAFT_KEY, draft);
}

export function loadDraft(): AssessmentDraft {
  try {
    const value: unknown = wx.getStorageSync(DRAFT_KEY);
    if (!isRecord(value)) return { ...DEFAULT_DRAFT };
    const candidate = { ...DEFAULT_DRAFT, ...value } as AssessmentDraft;
    const scenarioIsValid = candidate.scenario === "" ||
      ["daily", "range_issue", "resale"].includes(candidate.scenario);
    return scenarioIsValid &&
      validateDraft(candidate).filter((issue) => issue.field !== "scenario").length === 0
      ? candidate
      : { ...DEFAULT_DRAFT };
  } catch {
    return { ...DEFAULT_DRAFT };
  }
}

export function clearDraft(): void {
  wx.removeStorageSync(DRAFT_KEY);
}

export function loadHistory(): StoredReport[] {
  try {
    return normalizeHistory(wx.getStorageSync(HISTORY_KEY));
  } catch {
    return [];
  }
}

export function saveReport(report: StoredReport): StoredReport[] {
  const nextHistory = mergeHistory(loadHistory(), report);
  wx.setStorageSync(HISTORY_KEY, nextHistory);
  return nextHistory;
}

export function removeReport(reportId: string): StoredReport[] {
  const nextHistory = loadHistory().filter((report) => report.id !== reportId);
  wx.setStorageSync(HISTORY_KEY, nextHistory);
  return nextHistory;
}

export function clearHistory(): void {
  wx.removeStorageSync(HISTORY_KEY);
}

export function findReport(reportId: string): StoredReport | null {
  return loadHistory().find((report) => report.id === reportId) ?? null;
}

export function savePendingReport(report: StoredReport): void {
  wx.setStorageSync(PENDING_REPORT_KEY, report);
}

export function loadPendingReport(): StoredReport | null {
  try {
    const value: unknown = wx.getStorageSync(PENDING_REPORT_KEY);
    return isStoredReport(value) ? value : null;
  } catch {
    return null;
  }
}
