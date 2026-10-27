import model from "./models/residual-ridge.json";
import type { PredictionInput } from "./battery-prediction";

export interface ResidualValueResult {
  available: boolean;
  estimated_price_yuan: number | null;
  residual_rate_percent: number | null;
  brand: string | null;
  battery_type: string;
  model: string;
  note: string;
  warnings: string[];
  validation_mae_yuan: number;
}

/** 单独预测挂牌价，不将实验电芯 SOH 当作价格标签。 */
export function predictResidualValue(input: PredictionInput, chemistry: string): ResidualValueResult {
  const result: ResidualValueResult = {
    available: false, estimated_price_yuan: null, residual_rate_percent: null,
    brand: input.brand ?? null, battery_type: chemistry === "ncm" ? "三元" : chemistry === "lfp" ? "磷酸铁锂" : input.battery_type,
    model: "residual-ridge-v1", note: "", warnings: [], validation_mae_yuan: Math.round(model.mae),
  };
  if (!["ncm", "lfp"].includes(chemistry)) {
    result.note = "残值模型仅支持三元和磷酸铁锂。"; return result;
  }
  if (!input.brand) {
    result.note = "选择品牌并补充组装来源后可估算残值。"; return result;
  }
  if (!model.brands.includes(input.brand) || !input.assembly_source || !model.sources.includes(input.assembly_source)) {
    result.note = "请选择数据表中的品牌和组装来源。"; return result;
  }
  const numbers = [input.voltage, input.capacity_ah, input.new_battery_price ?? null,
    input.full_charge_range_km ?? null, input.battery_age_months, input.charge_cycles ?? null];
  if (numbers.some(v => v !== null && (!Number.isFinite(v) || v < 0)) ||
    input.voltage <= 0 || input.capacity_ah <= 0 || (input.new_battery_price != null && input.new_battery_price <= 0)) {
    result.note = "残值输入数值无效。"; return result;
  }
  const categories = [input.brand, chemistry === "ncm" ? "三元锂" : "磷酸铁锂", input.assembly_source, input.original_charger ?? "未知"];
  if (!model.categories[3].includes(categories[3])) {
    result.note = "原装充电器选项无效。"; return result;
  }
  const features = [1,
    ...numbers.map((v,i) => (Math.log1p(v ?? model.medians[i]) - model.means[i]) / model.stds[i]),
    ...numbers.map(v => v === null ? 1 : 0),
    ...model.categories.flatMap((values,i) => values.map(v => v === categories[i] ? 1 : 0)),
  ];
  const price = Math.exp(features.reduce((sum,v,i) => sum + v * model.coefficients[i], 0));
  if (!Number.isFinite(price)) { result.note = "输入超出可计算范围。"; return result; }
  const labels = ["电压", "容量", "新电参考价", "续航", "服役月数", "循环次数"];
  numbers.forEach((v,i) => { if (v !== null && (v < model.ranges[i][0] || v > model.ranges[i][1]))
    result.warnings.push(`${labels[i]}超出训练范围（${model.ranges[i][0]}–${model.ranges[i][1]}），估价可能不可靠。`);
  });
  if (input.new_battery_price && price > input.new_battery_price) result.warnings.push("估价高于新电参考价，请核对输入及挂牌价口径。");
  return { ...result, available: true, estimated_price_yuan: Math.round(price),
    residual_rate_percent: input.new_battery_price ? Math.round(price / input.new_battery_price * 1000) / 10 : null,
    note: "基于145条三元锂和磷酸铁锂挂牌数据训练，采用岭回归估价。价格为挂牌价口径，并非成交或回收报价；部分品牌样本较少。未填写的可选数值按训练集中位数处理。",
  };
}
