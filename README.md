# 电动车电池寿命预测

本项目结合 XGBoost 模型与充电、驾驶等使用习惯，估算电动车电池的健康状态（SOH）及剩余使用寿命。

## 数据集与模型匹配

| 电池类型 | 原始数据 | 电芯数量 | 有效循环样本数 | 模型目录 |
|---|---|---:|---:|---|
| 三元锂（NCM / NMC） | `dataset/CALB/*.pkl` | 27 | 2,791 | `models/` |
| 磷酸铁锂（LFP） | `dataset/HUST/*.pkl` + `dataset/MATR/*.pkl` | 77 + 169 | 146,120 + 140,001 | `models/lfp/` |
| 铅酸或不确定类型 | 暂无匹配的实验数据 | — | — | 仅使用习惯规则估算 |

网页会根据电池类型自动选择对应模型，并显示实际使用的数据来源。切换电池类型后会重新预测。若对应模型缺失，则明确提示使用规则估算，禁止调用其他化学类型的模型替代。

## 算法说明

两类模型沿用相同的特征提取流程、21 个特征列、XGBoost 参数和随机种子。HUST 与 MATR 合并训练磷酸铁锂模型，CALB 单独训练三元锂模型。

- SOH = 当前循环放电容量 / 首个有效循环放电容量。
- 寿命终点：SOH ≤ 0.80。
- 在每个来源数据集内部按完整电芯划分训练集和测试集，确保各来源在两者中均有样本。同一电芯不能同时出现在训练集和测试集。
- HUST 没有温度记录，保留这些样本及处理后 CSV 中的缺失值；训练时只用训练集的中位数补齐模型特征，训练集整列缺失时才填零。
- 用户预测继续使用现有融合方式：对应 XGBoost 估计值占 75%，使用习惯规则估计值占 25%；没有匹配模型时仅使用规则。
- 剩余使用寿命沿用现有循环老化与日历老化规则估算，未单独训练剩余寿命模型。

等效循环的换算如下，代码标识与程序保持一致：

```text
single_charge_dod = (charge_end_soc - charge_start_soc) / 100
annual_equivalent_cycles = single_charge_dod * weekly_charge_times * 52
estimated_cycles_elapsed = annual_equivalent_cycles * battery_age_months / 12
```

其中，单次充放电深度由起充与结束电量之差得到；年等效循环数由充放电深度、每周充电次数和一年 52 周换算；累计等效循环数再根据使用月数计算。

## 环境与复现

使用名为 `dachuang` 的 conda 环境，在项目根目录运行：

```powershell
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
conda run -n dachuang python -m pytest -q
conda run -n dachuang uvicorn api.main:app --host 127.0.0.1 --port 8000
```

启动后访问 [本地预测页面](http://127.0.0.1:8000/)。如果本机 conda 启动器不可用，可直接调用同一环境的 Python：

```powershell
& 'D:\Anaconda\envs\dachuang\python.exe' -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

训练命令默认生成两类模型。重新生成处理后数据后，可通过 `python -m src.train_xgboost --chemistry ncm` 或 `--chemistry lfp` 只训练其中一类。

## 已验证结果（2026-10-23）

| 模型及测试数据来源 | 训练样本数 | 测试样本数 | 平均绝对误差（SOH） | 均方根误差（SOH） | 决定系数 R² |
|---|---:|---:|---:|---:|---:|
| 三元锂 / CALB | 2,196 | 595 | 0.005945 | 0.009101 | 0.865801 |
| 磷酸铁锂 / HUST + MATR | 228,241 | 57,880 | 0.009408 | 0.016031 | 0.947980 |
| 磷酸铁锂 / 仅 HUST 测试样本 | — | — | 0.011700 | 0.016361 | 0.947693 |
| 磷酸铁锂 / 仅 MATR 测试样本 | — | — | 0.007189 | 0.015705 | 0.934223 |

上述指标来自未参与训练的实验电芯循环，不能直接代表使用习惯预测或剩余寿命估算的准确性。训练集与测试集之间没有重复电芯。

23 项测试已通过。浏览器已验证电池类型切换、模型来源显示和规则估算提示，未发现控制台脚本错误。

## 项目结构与生成文件

- `src/data_loader.py`、`src/inspect_pkl.py`：查找并检查支持的 Pickle 数据文件。
- `src/feature_engineering.py`：共用特征提取、清洗、分组划分及绘图流程。
- `src/train_xgboost.py`：按电池化学类型训练相同的 XGBoost 算法，保存元数据、评估指标和特征重要性。
- `src/user_mapping.py`、`src/predictor.py`：映射使用习惯，选择对应模型，估算 SOH、剩余寿命并生成解释。
- `api/main.py`、`web/static/`：FastAPI 服务及网页表单。
- `tests/`：覆盖特征提取、温度缺失、分组划分、训练默认值、模型匹配、规则兜底及接口约定。
- `AGENTS.md`：面向后续开发代理的项目规范。
- `STATUS.md`：当前进度、验证结果和已知限制。
- `data/reports/data_structure_report.md`：273 个原始文件的结构检查结果。
- `data/reports/feature_engineering_report.md`：各来源的样本数量及缺失特征数量。
- `data/processed/{cycle_features,train,test}.csv`：带数据来源与化学类型标记的合并样本。
- `data/plots/{ncm,lfp}/`：按化学类型分别生成的 SOH、容量、温度和电压图。
- `models/{xgboost_model.pkl,model_metadata.json}`：CALB 三元锂模型及其元数据。
- `models/lfp/{xgboost_model.pkl,model_metadata.json}`：HUST + MATR 磷酸铁锂模型及其元数据。
- `data/reports/model_report.md`、`feature_importance.csv`：三元锂模型评估结果。
- `data/reports/lfp/model_report.md`、`feature_importance.csv`：磷酸铁锂模型评估结果及按来源统计的测试指标。

## Git 提交范围

`dataset/`、`output/` 和 `tmp/` 仅保留在本地，不纳入 Git 提交。生成的特征 CSV、图像、模型二进制文件和模型元数据也由忽略规则排除。代码、中文文档、测试和文字评估报告纳入版本管理。

克隆仓库后，需要自行将 CALB、HUST、MATR 数据放入对应目录，再按复现命令生成特征和模型。数据处理流程不会修改原始数据。

## 接口说明

`GET /` 返回网页表单。`GET /health` 返回 `models.ncm` 和 `models.lfp`，分别包含模型是否加载（`model_loaded`）及训练来源（`training_datasets`）；顶层 `model_loaded` 表示两类模型是否均可用。

`POST /predict` 接收以下输入示例。字段名及枚举值保留接口原始标识：

```json
{
  "battery_type": "LFP",
  "voltage": 48,
  "capacity_ah": 20,
  "battery_age_months": 18,
  "charge_start_soc": 20,
  "charge_end_soc": 90,
  "weekly_charge_times": 4,
  "driving_style": "normal",
  "city": "Chengdu",
  "parking_environment": "outdoor_sunlight",
  "load_condition": "single",
  "long_term_storage": "often"
}
```

响应包含 SOH、剩余月数和年数、风险等级、衰减因素、建议、映射后的物理特征以及 `model_used`。`battery_chemistry`、`training_datasets` 和 `prediction_note` 用于说明实际使用的模型。NMC、LiFePO4 及中文电池类型名称会统一规范化。

## 已知限制

实验电芯测量与电动车电池组、日常使用习惯存在差异。无法从用户输入推断的序列特征使用对应模型的默认值；当前输入映射和规则先验尚未经过真实使用记录校准。HUST 无温度记录，磷酸铁锂环境温度特征整列缺失，训练时默认填零。用户层面的准确性仍需更多实测数据验证。第一版不训练 Transformer 模型。
