import { APP_CONFIG, PREDICTION_ENDPOINT } from "../config/environment";
import type { PredictionInput, PredictionResult, RiskLevel } from "../types/prediction";

export type PredictionErrorCode =
  | "duplicate"
  | "timeout"
  | "network"
  | "validation"
  | "service"
  | "invalid_response";

export class PredictionServiceError extends Error {
  constructor(
    public readonly code: PredictionErrorCode,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "PredictionServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PredictionServiceError("invalid_response", `响应缺少有效字段：${key}`);
  }
  return value;
}

function stringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new PredictionServiceError("invalid_response", `响应缺少有效字段：${key}`);
  }
  return value;
}

function booleanField(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new PredictionServiceError("invalid_response", `响应缺少有效字段：${key}`);
  }
  return value;
}

function riskField(value: unknown): RiskLevel {
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new PredictionServiceError("invalid_response", "响应包含未知风险等级。");
}

export function adaptPredictionResult(value: unknown): PredictionResult {
  if (!isRecord(value)) {
    throw new PredictionServiceError("invalid_response", "预测服务返回了无效数据。");
  }

  const result: PredictionResult = {
    soh_percent: Math.round(numberField(value, "soh_percent")),
    estimated_remaining_months: Math.max(
      0,
      Math.round(numberField(value, "estimated_remaining_months")),
    ),
    risk_level: riskField(value.risk_level),
    main_degradation_factors: stringArrayField(value, "main_degradation_factors"),
    suggestions: stringArrayField(value, "suggestions"),
    model_used: booleanField(value, "model_used"),
  };

  if (typeof value.soh === "number") result.soh = value.soh;
  if (typeof value.estimated_remaining_years === "number") {
    result.estimated_remaining_years = value.estimated_remaining_years;
  }
  if (typeof value.request_id === "string") result.request_id = value.request_id;
  if (typeof value.algorithm_version === "string") {
    result.algorithm_version = value.algorithm_version;
  }
  if (typeof value.generated_at === "string") result.generated_at = value.generated_at;

  if (result.soh_percent < 0 || result.soh_percent > 100) {
    throw new PredictionServiceError("invalid_response", "健康度超出有效范围。");
  }
  return result;
}

function responseMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.detail === "string" ? value.detail : fallback;
}

let requestInFlight = false;

export function predictBattery(input: PredictionInput): Promise<PredictionResult> {
  if (requestInFlight) {
    return Promise.reject(
      new PredictionServiceError("duplicate", "评估正在生成，请勿重复提交。"),
    );
  }
  requestInFlight = true;

  return new Promise((resolve, reject) => {
    const finish = <T>(callback: (value: T) => void, value: T): void => {
      requestInFlight = false;
      callback(value);
    };

    try {
      wx.request({
        url: PREDICTION_ENDPOINT,
        method: "POST",
        timeout: APP_CONFIG.requestTimeoutMs,
        header: { "content-type": "application/json" },
        data: input,
        success(response) {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              finish(resolve, adaptPredictionResult(response.data));
            } catch (error) {
              finish(
                reject,
                error instanceof PredictionServiceError
                  ? error
                  : new PredictionServiceError("invalid_response", "无法读取评估结果。"),
              );
            }
            return;
          }

          const code = response.statusCode === 400 || response.statusCode === 422
            ? "validation"
            : "service";
          finish(
            reject,
            new PredictionServiceError(
              code,
              responseMessage(response.data, "预测服务暂时不可用，请稍后重试。"),
              response.statusCode,
            ),
          );
        },
        fail(error) {
          const isTimeout = error.errMsg.toLowerCase().includes("timeout");
          finish(
            reject,
            new PredictionServiceError(
              isTimeout ? "timeout" : "network",
              isTimeout ? "请求超过 10 秒，请检查网络后重试。" : "网络连接失败，请联网后重试。",
            ),
          );
        },
      });
    } catch {
      finish(
        reject,
        new PredictionServiceError("network", "请求未能发出，请检查网络后重试。"),
      );
    }
  });
}

export function predictionErrorMessage(error: unknown): string {
  if (!(error instanceof PredictionServiceError)) {
    return "评估失败，请稍后重试。（错误编号：BT-000）";
  }
  const numbers: Record<PredictionErrorCode, string> = {
    duplicate: "BT-001",
    timeout: "BT-002",
    network: "BT-003",
    validation: "BT-004",
    service: "BT-005",
    invalid_response: "BT-006",
  };
  return `${error.message}（错误编号：${numbers[error.code]}）`;
}
