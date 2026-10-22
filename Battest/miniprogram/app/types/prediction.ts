export type RiskLevel = "low" | "medium" | "high";

export type AssessmentScenario = "daily" | "range_issue" | "resale";

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

export interface AssessmentDraft extends PredictionInput {
  scenario: AssessmentScenario | "";
}

export interface PredictionResult {
  soh_percent: number;
  estimated_remaining_months: number;
  risk_level: RiskLevel;
  main_degradation_factors: string[];
  suggestions: string[];
  model_used: boolean;
  soh?: number;
  estimated_remaining_years?: number;
  request_id?: string;
  algorithm_version?: string;
  generated_at?: string;
  battery_chemistry?: string;
  training_datasets?: string[];
  prediction_note?: string;
}

export interface StoredReport {
  id: string;
  scenario: AssessmentScenario;
  input: PredictionInput;
  result: PredictionResult;
  created_at: string;
  algorithm_version: string;
}

export interface SelectOption<T extends string | number = string> {
  label: string;
  value: T;
}

export interface SummaryItem {
  label: string;
  value: string;
}
