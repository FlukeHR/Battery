import { BATTERY_TYPES, optionLabel, scenarioLabel } from "../../config/options";
import {
  findReport,
  loadPendingReport,
  saveDraft,
  saveReport,
} from "../../stores/storage";
import type { AssessmentDraft, StoredReport } from "../../types/prediction";
import {
  buildShareTitle,
  formatDateTime,
  getRiskPresentation,
} from "../../utils/presentation";

interface ReportView extends StoredReport {
  scenario_label: string;
  battery_label: string;
}

function toReportView(report: StoredReport): ReportView {
  return {
    ...report,
    scenario_label: scenarioLabel(report.scenario),
    battery_label: optionLabel(BATTERY_TYPES, report.input.battery_type),
  };
}

Page({
  data: {
    report: null as ReportView | null,
    createdAtLabel: "",
    riskMessage: "",
    isSaved: false,
    loadError: "",
  },

  onLoad(options: Record<string, string | undefined>) {
    const reportId = options.id ? decodeURIComponent(options.id) : "";
    const report = reportId ? findReport(reportId) : loadPendingReport();
    if (!report) {
      this.setData({ loadError: "未找到这份评估报告，可能已被清理。" });
      return;
    }
    const risk = getRiskPresentation(report.result.risk_level);
    this.setData({
      report: toReportView(report),
      createdAtLabel: formatDateTime(report.created_at),
      riskMessage: risk.message,
      isSaved: Boolean(reportId),
      loadError: "",
    });
  },

  onSaveReport() {
    if (!this.data.report || this.data.isSaved) return;
    const {
      scenario_label: scenarioLabelValue,
      battery_label: batteryLabelValue,
      ...report
    } = this.data.report;
    void scenarioLabelValue;
    void batteryLabelValue;
    saveReport(report);
    this.setData({ isSaved: true });
    wx.showToast({ title: "已保存到本机", icon: "success" });
  },

  onReassess() {
    const report = this.data.report;
    if (!report) return;
    const draft: AssessmentDraft = {
      ...report.input,
      scenario: report.scenario,
    };
    saveDraft(draft);
    wx.switchTab({ url: "/pages/assessment/index" });
  },

  onBackToAssessment() {
    wx.switchTab({ url: "/pages/assessment/index" });
  },

  onShareAppMessage() {
    const report = this.data.report;
    return {
      title: report ? buildShareTitle(report) : "电检通｜电池健康辅助评估",
      path: "/pages/assessment/index?from=share",
    };
  },
});
