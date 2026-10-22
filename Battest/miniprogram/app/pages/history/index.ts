import { optionLabel, BATTERY_TYPES, scenarioLabel } from "../../config/options";
import {
  clearHistory,
  loadHistory,
  removeReport,
} from "../../stores/storage";
import type { StoredReport } from "../../types/prediction";
import { formatDateTime } from "../../utils/presentation";

interface HistoryItem extends StoredReport {
  created_at_label: string;
  scenario_label: string;
  battery_label: string;
}

function toHistoryItem(report: StoredReport): HistoryItem {
  return {
    ...report,
    created_at_label: formatDateTime(report.created_at),
    scenario_label: scenarioLabel(report.scenario),
    battery_label: optionLabel(BATTERY_TYPES, report.input.battery_type),
  };
}

Page({
  data: {
    reports: [] as HistoryItem[],
  },

  onShow() {
    this.refreshHistory();
  },

  refreshHistory() {
    this.setData({ reports: loadHistory().map(toHistoryItem) });
  },

  onOpenReport(event: WechatMiniprogram.TouchEvent) {
    const reportId = String(event.currentTarget.dataset.id);
    wx.navigateTo({ url: `/pages/result/index?id=${encodeURIComponent(reportId)}` });
  },

  onDeleteReport(event: WechatMiniprogram.TouchEvent) {
    const reportId = String(event.currentTarget.dataset.id);
    wx.showModal({
      title: "删除这份报告？",
      content: "删除后无法恢复。",
      confirmText: "删除",
      confirmColor: "#b33c34",
      success: (result) => {
        if (!result.confirm) return;
        this.setData({ reports: removeReport(reportId).map(toHistoryItem) });
        wx.showToast({ title: "已删除", icon: "success" });
      },
    });
  },

  onClearHistory() {
    if (this.data.reports.length === 0) return;
    wx.showModal({
      title: "清空全部记录？",
      content: "本机保存的评估报告将全部删除，且无法恢复。",
      confirmText: "清空",
      confirmColor: "#b33c34",
      success: (result) => {
        if (!result.confirm) return;
        clearHistory();
        this.setData({ reports: [] });
        wx.showToast({ title: "已清空", icon: "success" });
      },
    });
  },

  onStartAssessment() {
    wx.switchTab({ url: "/pages/assessment/index" });
  },
});
