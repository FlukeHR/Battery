import { describe, expect, it } from "vitest";

import { DEFAULT_DRAFT } from "../app/config/options";
import type { AssessmentDraft } from "../app/types/prediction";
import { toPredictionInput, validateDraft, validateStep } from "../app/utils/validation";

function validDraft(): AssessmentDraft {
  return { ...DEFAULT_DRAFT, scenario: "daily" };
}

describe("assessment validation", () => {
  it("accepts the default API payload after a scenario is selected", () => {
    expect(validateDraft(validDraft())).toEqual([]);
  });

  it("rejects an invalid charging window on the charging step", () => {
    const draft = { ...validDraft(), charge_start_soc: 90, charge_end_soc: 80 };
    const issues = validateStep(draft, 2);

    expect(issues).toContainEqual({
      field: "charge_end_soc",
      message: "充电结束电量必须高于开始电量。",
      step: 2,
    });
  });

  it("removes the UI-only scenario before calling the API", () => {
    const input = toPredictionInput(validDraft());

    expect(input).not.toHaveProperty("scenario");
    expect(Object.keys(input)).toHaveLength(12);
  });
});
