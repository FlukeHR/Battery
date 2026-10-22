import type { RiskLevel, StoredReport } from "../types/prediction";

export interface RiskPresentation {
  label: string;
  className: string;
  message: string;
}

const RISK_PRESENTATION: Record<RiskLevel, RiskPresentation> = {
  low: {
    label: "低风险",
    className: "risk-low",
    message: "当前处于正常衰减区间，继续保持良好使用习惯。",
  },
  medium: {
    label: "中风险",
    className: "risk-medium",
    message: "建议关注续航变化，并适当缩短复检周期。",
  },
  high: {
    label: "高风险",
    className: "risk-high",
    message: "建议尽快前往专业机构做进一步检测。",
  },
};

export function getRiskPresentation(riskLevel: RiskLevel): RiskPresentation {
  return RISK_PRESENTATION[riskLevel];
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "时间未知";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildShareTitle(report: StoredReport): string {
  const risk = getRiskPresentation(report.result.risk_level).label;
  const suggestion = report.result.suggestions[0] ?? "建议定期复检";
  return `电池健康 ${report.result.soh_percent}% · ${risk}｜${suggestion}`.slice(0, 60);
}
