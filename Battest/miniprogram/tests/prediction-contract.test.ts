import { describe, expect, it } from "vitest";

import {
  PredictionServiceError,
  adaptPredictionResult,
} from "../app/services/prediction";

describe("prediction response contract", () => {
  it("keeps the trained model source and algorithm version from the shared API", () => {
    const result = adaptPredictionResult({
      soh_percent: 97, estimated_remaining_months: 60, risk_level: "low",
      main_degradation_factors: [], suggestions: [], model_used: true,
      battery_chemistry: "lfp", training_datasets: ["HUST", "MATR"],
      prediction_note: "使用同类型模型估算。", algorithm_version: "xgboost-v1",
    });
    expect(result.training_datasets).toEqual(["HUST", "MATR"]);
    expect(result.algorithm_version).toBe("xgboost-v1");
    expect(result.battery_chemistry).toBe("lfp");
  });
  it("adapts the public fields returned by the website API", () => {
    const result = adaptPredictionResult({
      soh: 0.923,
      soh_percent: 92,
      estimated_remaining_months: 41,
      estimated_remaining_years: 3.4,
      risk_level: "low",
      main_degradation_factors: ["正常的日历老化与循环衰减"],
      suggestions: ["保持规律充电。"],
      mapped_features: { single_charge_dod: 0.7 },
      model_used: false,
    });

    expect(result).toEqual({
      soh: 0.923,
      soh_percent: 92,
      estimated_remaining_months: 41,
      estimated_remaining_years: 3.4,
      risk_level: "low",
      main_degradation_factors: ["正常的日历老化与循环衰减"],
      suggestions: ["保持规律充电。"],
      model_used: false,
    });
  });

  it("rejects missing required response fields", () => {
    expect(() => adaptPredictionResult({ soh_percent: 90 })).toThrowError(
      PredictionServiceError,
    );
  });

  it("rejects unknown risk levels", () => {
    expect(() =>
      adaptPredictionResult({
        soh_percent: 90,
        estimated_remaining_months: 20,
        risk_level: "critical",
        main_degradation_factors: [],
        suggestions: [],
        model_used: false,
      }),
    ).toThrowError("响应包含未知风险等级");
  });

  it("requires the API model indicator", () => {
    expect(() =>
      adaptPredictionResult({
        soh_percent: 90,
        estimated_remaining_months: 20,
        risk_level: "low",
        main_degradation_factors: [],
        suggestions: [],
      }),
    ).toThrowError("model_used");
  });
});
