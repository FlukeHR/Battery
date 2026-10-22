import { describe, expect, it } from "vitest";

import { getRiskPresentation } from "../app/utils/presentation";

describe("risk presentation", () => {
  it.each([
    ["low", "低风险"],
    ["medium", "中风险"],
    ["high", "高风险"],
  ] as const)("maps %s to a user-facing label", (risk, label) => {
    expect(getRiskPresentation(risk).label).toBe(label);
  });

  it("uses cautious language for a high-risk result", () => {
    const message = getRiskPresentation("high").message;

    expect(message).toContain("建议");
    expect(message).not.toContain("立即报废");
  });
});
