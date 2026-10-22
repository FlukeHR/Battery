# 开发代理指南

本文件保存项目长期适用的开发规范。阶段性进度、下一步工作和已知问题统一记录在 `STATUS.md`。

## 项目目标

构建电动车电池寿命预测系统，结合以下内容：

- CALB 三元锂（NCM）及 HUST、MATR 磷酸铁锂（LFP）的实验老化数据。
- 可复现的特征工程。
- 可解释的 XGBoost 电池健康状态（SOH）基线模型。
- 使用习惯到模型特征的映射层。
- FastAPI 服务及静态网页原型。

系统需要返回 SOH、预计剩余使用寿命、主要衰减因素及普通用户能理解的建议。

## 当前架构

```text
dataset/{CALB,HUST,MATR}/*.pkl
  -> src.inspect_pkl
  -> data/reports/data_structure_report.md
  -> src.feature_engineering
  -> data/processed/cycle_features.csv, train.csv, test.csv
  -> src.train_xgboost
  -> models/（CALB 三元锂）、models/lfp/（HUST + MATR 磷酸铁锂）
  -> src.user_mapping + src.predictor
  -> api.main / web/static
```

主要模块：

- `src/data_loader.py`：查找和读取 CALB、HUST、MATR 的 Pickle 文件。
- `src/inspect_pkl.py`：检查实际数据结构并生成结构报告。
- `src/feature_engineering.py`：提取循环级特征并计算 SOH 标签。
- `src/train_xgboost.py`：训练并保存 XGBoost 基线模型。
- `src/user_mapping.py`：将普通用户输入映射到物理特征与模型特征。
- `src/predictor.py`：加载模型、预测 SOH 与剩余使用寿命并生成解释。
- `api/main.py`：提供 `/`、`/health` 和 `/predict` 的 FastAPI 应用。
- `web/static/`：静态网页原型。

## 运行环境

使用名为 `dachuang` 的 conda 环境。除有明确原因外，通过 `conda run` 执行命令：

```powershell
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
conda run -n dachuang python -m pytest -q
conda run -n dachuang uvicorn api.main:app --host 127.0.0.1 --port 8000
```

## 数据约定

原始数据存放位置如下，仅保留在本地：

```text
dataset/CALB/*.pkl  # 三元锂，NCM / NMC
dataset/HUST/*.pkl  # 磷酸铁锂，LFP
dataset/MATR/*.pkl  # 磷酸铁锂，LFP / LiFePO4
```

支持的数据文件为字典，包含：

- 顶层元数据，例如 `cell_id`、`nominal_capacity_in_Ah`、`depth_of_charge`、`depth_of_discharge`。
- `cycle_data`：由各循环数据字典组成的列表。
- 循环内数组：`current_in_A`、`voltage_in_V`、`charge_capacity_in_Ah`、`discharge_capacity_in_Ah`、`time_in_s`、`temperature_in_C`、`internal_resistance_in_ohm`。

HUST 没有实测温度，应保留这些样本。在划分训练集与测试集之后，只用训练集中位数补齐缺失模型特征；仅在训练集整列缺失时填零。`dataset` 和 `battery_chemistry` 用于记录来源，不作为模型特征。校验正极材料元数据与数据集化学类型是否一致。

SOH 定义：

```text
SOH = 当前循环容量 / 首个有效循环容量
```

寿命终点：

```text
SOH <= 0.80
```

## 建模规范

- 修改特征工程前，必须先检查 Pickle 文件的实际结构。
- 保留 XGBoost 作为首个可工作的基线模型与比较对象。
- XGBoost 流程可复现之前，不训练或推广 Transformer 模型。
- 在每个来源数据集内部按 `cell_id` 分组划分训练集和测试集，保证每个来源在两者中均有样本。同一电芯不能同时进入两者。
- 使用相同 XGBoost 算法分别训练三元锂模型（CALB）和磷酸铁锂模型（HUST + MATR）。三元锂保留原模型路径；磷酸铁锂模型保存在 `models/lfp/`，报告保存在 `data/reports/lfp/`。
- 根据规范化后的电池化学类型选择模型。模型缺失或类型不支持时，使用规则兜底，禁止调用其他类型的模型替代。
- 保存处理后数据、报告、图像、模型和元数据。
- 通过映射特征、风险因素、建议和特征重要性保持预测的可解释性。

## 用户输入映射规范

不要要求普通用户填写 SOH、DOD、C 倍率或内阻等实验术语。

在 `src/user_mapping.py` 和 `src/predictor.py` 中执行以下映射：

- 电池类型 → 标称循环寿命先验和化学类型老化系数。
- 电池电压及容量 → 电池能量和模型标称容量。
- 起充与结束电量 → 单次充放电深度（DOD）。
- 单次充放电深度、每周充电次数及使用时间 → 累计等效循环估计值。
- 驾驶习惯及负载 → 电流与应力估计值。
- 城市及停放环境 → 温度暴露估计值。
- 长期存放 → 日历老化风险、风险因素及建议。
- 电量使用习惯 → DOC、DOD、风险因素及建议。

无法由用户输入推断的模型特征，应使用对应模型 `model_metadata.json` 中保存的训练集中位数默认值。

## 接口约定

主要接口：

```text
POST /predict
```

响应必须包含以下字段，字段名保持接口原始标识：

- `soh`：健康状态。
- `soh_percent`：健康状态百分比。
- `estimated_remaining_months`：预计剩余月数。
- `estimated_remaining_years`：预计剩余年数。
- `risk_level`：风险等级。
- `main_degradation_factors`：主要衰减因素。
- `suggestions`：使用建议。
- `mapped_features`：映射后的特征。
- `model_used`：是否使用训练模型。
- `battery_chemistry`：电池化学类型。
- `training_datasets`：实际使用模型的训练数据来源。
- `prediction_note`：预测方式说明。

`GET /health` 返回 `models.ncm` 与 `models.lfp`，分别含 `model_loaded` 和 `training_datasets`。顶层 `model_loaded` 表示两类支持模型是否均已加载。网页按电池类型自动选择模型并显示实际训练来源；铅酸和不确定类型必须明确显示规则估算。

## 质量检查

宣布完成前，运行以下检查：

```powershell
conda run -n dachuang python -m pytest -q
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
```

修改接口时，还需执行基本可用性检查：

```powershell
conda run -n dachuang python -c "from fastapi.testclient import TestClient; from api.main import app; c=TestClient(app); print(c.get('/health').json())"
```

## 文档与版本管理

- 文档正文和生成报告的说明文字统一使用中文。代码标识、文件路径、命令、接口字段和机器可读数据保留原始名称。
- 代理规范统一使用 `AGENTS.md` 文件名。
- `dataset/`、`output/` 和 `tmp/` 只保留在本地，不纳入 Git 提交。
- 对已有数据取消 Git 跟踪时，保留本地文件，不重写历史提交。
- 自动生成的特征 CSV、图像、模型二进制文件和元数据按 `.gitignore` 排除；文字报告可提交。

## 开发边界

- 不要对未来的 Pickle 结构写死未经检查的假设。
- 不要把动态项目进度写入本文件，应更新 `STATUS.md`。
- 不删除原始数据。
- 没有重新运行完整处理流程并更新报告时，不覆盖训练模型文件。
- 没有实际进行浏览器或 HTTP 可用性检查时，不宣称完成网页验证。
