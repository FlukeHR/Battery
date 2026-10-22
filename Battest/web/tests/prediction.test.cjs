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
