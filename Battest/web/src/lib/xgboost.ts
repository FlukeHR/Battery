import ncm from "./models/ncm.json";
import lfp from "./models/lfp.json";

interface Tree {
  left_children: number[];
  right_children: number[];
  default_left: number[];
  split_indices: number[];
  split_conditions: number[];
}

export interface XGBoostModel {
  battery_chemistry: string;
  training_datasets: string[];
  feature_columns: string[];
  defaults: Record<string, number>;
  base_score: number;
  trees: Tree[];
}

export const chemistryModels: Record<string, XGBoostModel | undefined> = { ncm, lfp };

export function predictXGBoost(model: XGBoostModel, features: Record<string, number>): number {
  const values = model.feature_columns.map((key) => Math.fround(features[key]));
  let prediction = Math.fround(model.base_score);
  for (const tree of model.trees) {
    let node = 0;
    while (tree.left_children[node] !== -1) {
      const value = values[tree.split_indices[node]];
      const left = Number.isNaN(value)
        ? Boolean(tree.default_left[node])
        : value < Math.fround(tree.split_conditions[node]);
      node = left ? tree.left_children[node] : tree.right_children[node];
    }
    // 与原生 XGBoost 一致，以 float32 累加叶节点分数。
    prediction = Math.fround(prediction + Math.fround(tree.split_conditions[node]));
  }
  return prediction;
}
