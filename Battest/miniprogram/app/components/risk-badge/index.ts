import { getRiskPresentation } from "../../utils/presentation";
import type { RiskLevel } from "../../types/prediction";

Component({
  properties: {
    riskLevel: { type: String, value: "low" },
  },
  data: {
    label: "低风险",
    className: "risk-low",
  },
  observers: {
    riskLevel(value: string) {
      const riskLevel: RiskLevel = value === "medium" || value === "high" ? value : "low";
      const presentation = getRiskPresentation(riskLevel);
      this.setData({
        label: presentation.label,
        className: presentation.className,
      });
    },
  },
});
