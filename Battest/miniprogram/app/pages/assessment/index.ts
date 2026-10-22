import {
  BATTERY_TYPES,
  CAPACITIES,
  CHARGE_END_LEVELS,
  CHARGE_START_LEVELS,
  CITIES,
  DEFAULT_DRAFT,
  DRIVING_STYLES,
  LOAD_CONDITIONS,
  PARKING_ENVIRONMENTS,
  SCENARIOS,
  STORAGE_FREQUENCIES,
  VOLTAGES,
  WEEKLY_CHARGE_TIMES,
  buildDraftSummary,
} from "../../config/options";
import { predictBattery, predictionErrorMessage } from "../../services/prediction";
import {
  clearDraft,
  createReport,
  loadDraft,
  saveDraft,
  savePendingReport,
} from "../../stores/storage";
import type {
  AssessmentDraft,
  AssessmentScenario,
  SelectOption,
} from "../../types/prediction";
import { toPredictionInput, validateDraft, validateStep } from "../../utils/validation";

type ChoiceField =
  | "battery_type"
  | "voltage"
  | "capacity_ah"
  | "charge_start_soc"
  | "charge_end_soc"
  | "weekly_charge_times"
  | "driving_style"
  | "load_condition"
  | "long_term_storage"
  | "city"
  | "parking_environment";

type PickerIndexes = Record<ChoiceField, number>;

const CHOICES: Record<ChoiceField, ReadonlyArray<SelectOption<string | number>>> = {
  battery_type: BATTERY_TYPES,
  voltage: VOLTAGES,
  capacity_ah: CAPACITIES,
  charge_start_soc: CHARGE_START_LEVELS,
  charge_end_soc: CHARGE_END_LEVELS,
  weekly_charge_times: WEEKLY_CHARGE_TIMES,
  driving_style: DRIVING_STYLES,
  load_condition: LOAD_CONDITIONS,
  long_term_storage: STORAGE_FREQUENCIES,
  city: CITIES,
  parking_environment: PARKING_ENVIRONMENTS,
};

function pickerIndexesFor(draft: AssessmentDraft): PickerIndexes {
  const indexes = {} as PickerIndexes;
  (Object.keys(CHOICES) as ChoiceField[]).forEach((field) => {
    const index = CHOICES[field].findIndex((option) => option.value === draft[field]);
    indexes[field] = Math.max(index, 0);
  });
  return indexes;
}

function updateDraft(
  draft: AssessmentDraft,
  field: ChoiceField,
  value: string | number,
): AssessmentDraft {
  return { ...draft, [field]: value } as AssessmentDraft;
}

Page({
  data: {
    step: 0,
    stepMarkers: [0, 1, 2, 3, 4],
    draft: { ...DEFAULT_DRAFT } as AssessmentDraft,
    pickerIndexes: pickerIndexesFor(DEFAULT_DRAFT),
    summaryItems: buildDraftSummary(DEFAULT_DRAFT),
    scenarios: SCENARIOS,
    batteryTypes: BATTERY_TYPES,
    voltages: VOLTAGES,
    capacities: CAPACITIES,
    chargeStartLevels: CHARGE_START_LEVELS,
    chargeEndLevels: CHARGE_END_LEVELS,
    weeklyChargeTimes: WEEKLY_CHARGE_TIMES,
    drivingStyles: DRIVING_STYLES,
    loadConditions: LOAD_CONDITIONS,
    storageFrequencies: STORAGE_FREQUENCIES,
    cities: CITIES,
    parkingEnvironments: PARKING_ENVIRONMENTS,
    fieldError: "",
    isSubmitting: false,
  },

  onShow() {
    if (this.data.isSubmitting) return;
    const draft = loadDraft();
    this.setData({
      draft,
      pickerIndexes: pickerIndexesFor(draft),
      summaryItems: buildDraftSummary(draft),
      fieldError: "",
    });
  },

  onHide() {
    if (!this.data.isSubmitting) saveDraft(this.data.draft);
  },

  onUnload() {
    if (!this.data.isSubmitting) saveDraft(this.data.draft);
  },

  onScenarioSelect(event: WechatMiniprogram.TouchEvent) {
    const scenario = String(event.currentTarget.dataset.value) as AssessmentScenario;
    const draft = { ...this.data.draft, scenario };
    this.setData({ draft, fieldError: "" });
  },

  onChoiceChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const field = String(event.currentTarget.dataset.field) as ChoiceField;
    const index = Number(event.detail.value);
    const option = CHOICES[field]?.[index];
    if (!option) return;
    const draft = updateDraft(this.data.draft, field, option.value);
    this.setData({
      draft,
      pickerIndexes: { ...this.data.pickerIndexes, [field]: index },
      summaryItems: buildDraftSummary(draft),
      fieldError: "",
    });
  },

  onAgeInput(event: WechatMiniprogram.Input) {
    const batteryAgeMonths = Number(event.detail.value);
    const draft = { ...this.data.draft, battery_age_months: batteryAgeMonths };
    this.setData({
      draft,
      summaryItems: buildDraftSummary(draft),
      fieldError: "",
    });
  },

  onPrevious() {
    if (this.data.isSubmitting || this.data.step === 0) return;
    this.setData({ step: this.data.step - 1, fieldError: "" });
  },

  onNext() {
    if (this.data.isSubmitting || this.data.step >= 4) return;
    const issues = validateStep(this.data.draft, this.data.step);
    const firstIssue = issues[0];
    if (firstIssue) {
      this.setData({ fieldError: firstIssue.message });
      return;
    }
    const nextStep = this.data.step + 1;
    saveDraft(this.data.draft);
    this.setData({
      step: nextStep,
      summaryItems: nextStep === 4
        ? buildDraftSummary(this.data.draft)
        : this.data.summaryItems,
      fieldError: "",
    });
  },

  async onSubmit() {
    if (this.data.isSubmitting) return;
    const issues = validateDraft(this.data.draft);
    const firstIssue = issues[0];
    if (firstIssue) {
      this.setData({ step: firstIssue.step, fieldError: firstIssue.message });
      return;
    }

    this.setData({ isSubmitting: true, fieldError: "" });
    wx.showNavigationBarLoading();
    try {
      const result = await predictBattery(toPredictionInput(this.data.draft));
      const report = createReport(this.data.draft, result);
      savePendingReport(report);
      clearDraft();
      await new Promise<void>((resolve, reject) => {
        wx.navigateTo({
          url: "/pages/result/index",
          success: () => resolve(),
          fail: reject,
        });
      });
    } catch (error) {
      this.setData({ fieldError: predictionErrorMessage(error) });
    } finally {
      wx.hideNavigationBarLoading();
      this.setData({ isSubmitting: false });
    }
  },
});
