const assert = require("node:assert/strict");
const { test } = require("node:test");
const fixtures = require("./fixtures/prediction-parity.json");
const { predictFromUserInput } = require("../.test-build/battery-prediction.js");
const { chemistryModels, predictXGBoost } = require("../.test-build/xgboost.js");

for (const fixture of fixtures) {
  const { input, expected, model_features, raw_prediction } = fixture;
  test(`${input.battery_type} / ${input.battery_age_months} 个月：与 Python 原生模型一致`, () => {
    const model = chemistryModels[expected.battery_chemistry];
    assert.ok(Math.abs(predictXGBoost(model, model_features) - raw_prediction) < 1e-6);
    const actual = predictFromUserInput(input);
    assert.ok(Math.abs(actual.soh - expected.soh) < 1e-6);
    for (const key of ["soh_percent", "estimated_remaining_months", "estimated_remaining_years",
      "risk_level", "model_used", "battery_chemistry", "training_datasets"]) {
      assert.deepEqual(actual[key], expected[key]);
    }
  });
}

test("铅酸、不确定类型不调用锂电池模型", () => {
  for (const battery_type of ["Lead-acid", "Unknown"]) {
    const result = predictFromUserInput({ ...fixtures[0].input, battery_type });
    assert.equal(result.model_used, false);
    assert.deepEqual(result.training_datasets, []);
    assert.equal(result.algorithm_version, "rules-v1");
  }
});

test("化学类型别名与标准名称选择相同模型", () => {
  for (const [alias, standard] of [["LiFePO4", "LFP"], ["磷酸铁锂", "LFP"], ["NMC", "NCM"], ["三元锂电池", "NCM"]]) {
    assert.deepEqual(predictFromUserInput({ ...fixtures[0].input, battery_type: alias }),
      predictFromUserInput({ ...fixtures[0].input, battery_type: standard }));
  }
});

test("回归树在阈值两侧及缺失值时选择正确分支", () => {
  const model = { feature_columns: ["x"], base_score: 0.5, trees: [{
    left_children: [1, -1, -1], right_children: [2, -1, -1],
    default_left: [1, 0, 0], split_indices: [0, 0, 0], split_conditions: [2, 0.25, -0.25],
  }] };
  assert.equal(predictXGBoost(model, { x: 1 }), 0.75);
  assert.equal(predictXGBoost(model, { x: 2 }), 0.25);
  assert.equal(predictXGBoost(model, { x: NaN }), 0.75);
  model.trees[0].split_conditions[0] = 3.1;
  assert.equal(predictXGBoost(model, { x: 3.1 }), 0.25);
});

const residualFixtures = require("./fixtures/residual-parity.json");
for (const fixture of residualFixtures) {
  test(`残值与Python一致：${fixture.input.battery_type}/${fixture.input.new_battery_price}`, () => {
    const original = predictFromUserInput(fixtures[0].input);
    const result = predictFromUserInput({ ...fixtures[0].input, ...fixture.input });
    assert.equal(result.residual_value.available, true);
    assert.equal(result.residual_value.estimated_price_yuan, fixture.price);
    assert.equal(result.residual_value.residual_rate_percent === null, fixture.input.new_battery_price === null);
    const noResidual = predictFromUserInput({ ...fixtures[0].input, ...fixture.input, brand: undefined });
    assert.equal(result.soh, noResidual.soh);
    assert.equal(result.estimated_remaining_months, noResidual.estimated_remaining_months);
    assert.equal(original.residual_value.available, false);
  });
}
test("不支持的化学类型、品牌、缺失来源不返回虚假价格", () => {
  const base = { ...fixtures[0].input, ...residualFixtures[0].input };
  for (const change of [{ battery_type: "Lead-acid" }, { battery_type: "Unknown" },
    { brand: "随意品牌" }, { assembly_source: undefined }, { charge_cycles: -1 }]) {
    const result = predictFromUserInput({ ...base, ...change });
    assert.equal(result.residual_value.available, false);
    assert.equal(result.residual_value.estimated_price_yuan, null);
  }
});
test("品牌和电池类型参与残值模型，超范围有明确说明", () => {
  const base = { ...fixtures[0].input, ...residualFixtures[0].input };
  const a = predictFromUserInput(base).residual_value;
  const b = predictFromUserInput({ ...base, brand: "九号" }).residual_value;
  const c = predictFromUserInput({ ...base, battery_type: "LFP" }).residual_value;
  assert.notEqual(a.estimated_price_yuan, b.estimated_price_yuan);
  assert.notEqual(a.estimated_price_yuan, c.estimated_price_yuan);
  assert.ok(predictFromUserInput({ ...base, voltage: 110 }).residual_value.warnings.length > 0);
});
