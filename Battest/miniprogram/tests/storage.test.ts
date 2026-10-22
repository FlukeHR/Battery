import { describe, expect, it, vi } from "vitest";

import { DEFAULT_DRAFT } from "../app/config/options";
import {
  MAX_HISTORY_REPORTS,
  createReport,
  mergeHistory,
  normalizeHistory,
} from "../app/stores/storage";
import type { AssessmentDraft, StoredReport } from "../app/types/prediction";

function makeReport(index: number): StoredReport {
  const draft: AssessmentDraft = { ...DEFAULT_DRAFT, scenario: "daily" };
  vi.spyOn(Math, "random").mockReturnValue(0.12345);
  const report = createReport(
    draft,
    {
      soh_percent: 90,
      estimated_remaining_months: 24,
      risk_level: "low",
      main_degradation_factors: ["正常衰减"],
      suggestions: ["规律充电"],
      model_used: false,
    },
    new Date(Date.UTC(2026, 0, index + 1)),
  );
  vi.restoreAllMocks();
  return { ...report, id: `report-${index}` };
}

describe("local report history", () => {
  it("keeps newest reports first and limits history to 20", () => {
    const reports = Array.from({ length: 25 }, (_, index) => makeReport(index));
    const normalized = normalizeHistory(reports);

    expect(normalized).toHaveLength(MAX_HISTORY_REPORTS);
    expect(normalized[0]?.id).toBe("report-24");
    expect(normalized[normalized.length - 1]?.id).toBe("report-5");
  });

  it("isolates corrupted storage entries", () => {
    const valid = makeReport(1);
    const corrupted = {
      ...valid,
      id: "broken",
      input: { ...valid.input, city: null },
    };
    const normalized = normalizeHistory([null, corrupted, valid]);

    expect(normalized).toEqual([valid]);
  });

  it("replaces a report with the same id without duplication", () => {
    const original = makeReport(1);
    const updated = {
      ...original,
      result: { ...original.result, soh_percent: 88 },
    };
    const history = mergeHistory([original], updated);

    expect(history).toHaveLength(1);
    expect(history[0]?.result.soh_percent).toBe(88);
  });
});
