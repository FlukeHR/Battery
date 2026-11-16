# Battery：电检通电池健康评估

本仓库统一维护电检通官网、微信小程序，以及共用的电池建模与评估算法。

## 项目结构

```text
Battery/
├── Battest/
│   ├── web/                  # 官网、在线评估及共用 Next.js API
│   └── miniprogram/          # 微信原生 TypeScript 小程序
├── src/                      # Python 数据检查、特征提取、训练及模型导出
├── data/reports/             # 中文数据结构、特征与模型评估报告
├── dataset/                  # 本地五来源原始数据，不上传
├── docs/                     # 多数据集案例报告与逐题明细
├── models/                   # 本地 Python 训练模型，不上传
├── AGENTS.md                 # 仓库开发规范
└── STATUS.md                 # 当前状态与验证记录
```

`Battest/web` 是官网，`Battest/miniprogram` 是小程序。两端共用官网的 `/api/predict`，小程序不复制预测算法。原 FastAPI 与静态网页演示已由现有 Next.js 应用统一承接；旧实现仍保留在 Git 历史中。

## 数据集与模型

| 电池类型 | 训练来源 | 电芯数 | 有效循环样本数 | 在线方式 |
|---|---|---:|---:|---|
| 三元锂（NCM / NMC） | CALB + XJTU | 50 | 9,729 | SOH 模型融合；寿命终点不足，寿命仍为规则估算 |
| 磷酸铁锂（LFP） | HUST + MATR + SNL | 255 | 320,305 | SOH 模型融合，并使用独立剩余循环模型 |
| 铅酸或不确定类型 | 暂无对应实验数据 | — | — | 明确标注为规则估算 |

V2 两类 SOH 模型使用相同的 9 个特征和 XGBoost 参数。按来源及完整电芯分训练、验证、测试集，分别183、61、61电芯；同一电芯不得交叉。SOH 为当前放电容量与首个有效循环容量之比，寿命终点为 SOH ≤0.80。新来源已参与开发和重训，不再作为独立外部集。

HUST 与 XJTU 没有温度记录，保留样本，不以实验循环发热温度冒充环境温度。低温/高温暴露与协议特征仅使用训练集中位数补齐，整列缺失填零；训练包含铭牌信息完整、部分缺失和全部缺失四种情况。

在线 SOH 保留75%模型与25%使用习惯规则的融合。磷酸铁锂剩余循环由独立模型学习，使用验证集校准偏差；剩余月数按当前使用频率换算并受日历老化假设限制。三元锂只有1个实测终点电芯，明确保留寿命规则估算。网站读取导出的相同回归树，不依赖额外 Python 后端。

## 官网开发

安装 Node.js 18+ 后，在项目根目录运行：

```powershell
cd Battest/web
npm ci
npm run dev
```

- 官网：[http://localhost:3000](http://localhost:3000)
- 电池评估：[http://localhost:3000/assessment](http://localhost:3000/assessment)
- 服务状态：[http://localhost:3000/api/health](http://localhost:3000/api/health)

两类在线模型及寿命头保存在 `Battest/web/src/lib/models/`，合计约2 MB，可随代码提交。克隆后即可启动官网，无需下载本地原始数据或另启后端。

生产检查与运行：

```powershell
npm run lint
npm run build
npm start
```

模型推理运行在 Next.js 服务端，官网表单仅导入响应类型，不会将模型打包进小程序。

## 小程序开发

```powershell
cd Battest/miniprogram
npm ci
npm run typecheck
npm run lint
```

在微信开发者工具中导入 `Battest/miniprogram`，源码目录为 `app/`。正式预览或发布前，需在本机私有配置中填写自己的 AppID，并将 `https://battest.ccwu.cc` 配置为 request 合法域名。不得提交 AppSecret、Token、上传私钥或个人私有配置。

小程序继续调用同一官网接口，支持读取化学类型、模型来源及算法版本。旧接口或历史记录没有新增字段时仍可展示。开发者工具及 iOS、Android 真机验收需由具备对应设备的人员完成。

## Python 研究管线

原始数据只保存在本地，按以下位置放置：

```text
dataset/CALB/*.pkl
dataset/HUST/*.pkl
dataset/MATR/*.pkl
dataset/battery_life_test_SNL_LFP_XJTU/dataset/SNL/*.pkl
dataset/battery_life_test_SNL_LFP_XJTU/dataset/XJTU/*.pkl
```

使用现有 `dachuang` 环境，或安装 `requirements.txt` 后依次运行：

```powershell
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_usage_models --features-csv data/processed/cycle_features.csv --output-dir output/v2-training --model-dir models
conda run -n dachuang python -m src.export_web_models
```

若本机 conda 启动器不可用，可直接使用 `D:\Anaconda\envs\dachuang\python.exe` 执行相同的模块命令。

Python 模型分别保存在 `models/`（三元锂）和 `models/lfp/`（磷酸铁锂）。导出命令读取已训练模型并生成网站所需回归树。重新训练后需重新导出，并用固定输入核对 Python 预测与官网接口响应。

自动测试代码已按用户要求移除。日常检查使用官网代码检查和生产构建、小程序类型检查和代码检查，以及固定输入的接口验证。案例出题命令 `python -m src.select_presentation_cases` 会自动编译官网预测模块，编译输出位于本地 `Battest/web/.prediction-build/`。

V2 训练器在完整训练、按电芯测试和报告生成后才安装到指定 `--model-dir`；不提供该参数时仅生成隔离产物。训练入口统一使用 `src.train_usage_models`，默认读取 `data/processed/cycle_features.csv`，结果写入本地 `output/v2-training/`。

案例 PDF 使用 `requirements.txt` 中的 ReportLab 和 PyMuPDF 生成。`tmp/` 仅保存可重新生成的中间文件，可按需清理，运行案例及报告命令时会自动创建所需临时目录。

## 模型评估结果

| 模型 | 训练样本数 | 测试样本数 | 平均绝对误差 | 均方根误差 | 决定系数 R² |
|---|---:|---:|---:|---:|---:|
| CALB + XJTU / 三元锂 | 5,753 | 2,073 | 0.009689 | 0.013785 | 0.915523 |
| HUST + MATR + SNL / 磷酸铁锂 | 192,579 | 62,876 | 0.022956 | 0.039573 | 0.734466 |

这是V2原生模型的内部按电芯保留测试，使用已知实验条件，不代表实际车辆准确率。展示材料见 [多数据集案例报告](docs/多数据集案例报告.md)，包含每个来源10个案例；其中统计量仅对应报告内案例。这些来源在开发中已被查看，不能称为新的独立外部验证。

## 接口契约

`GET /api/health` 返回两类模型的加载状态和训练来源。

健康接口另以 `residual_model` 返回残值模型状态。官网已恢复历史的13个品牌标签、5类组装来源及挂牌价残值模型，模型说明见 [残值预测模型说明](data/reports/residual-model.md)。

`POST /api/predict` 接收电池类型、电压、容量、使用月数、充电起止电量、每周充电次数、驾驶习惯、负载、存放习惯、城市和停放环境。参数字段保持现有 `snake_case`；无效 JSON 返回 400，无效参数返回 422。

兼容增加可选 `charger_current_a`（充电器输出电流，A）与 `motor_power_w`（额定功率，W）。不填写仍可评估，但会说明默认条件与输入信息不足。

残值输入均为可选：`brand`、`assembly_source`、`original_charger`、`new_battery_price`（元）、`full_charge_range_km`（km）和 `charge_cycles`。选择品牌时需提供组装来源；后三个数值可留空或为 `null`。只对三元锂、磷酸铁锂估价，响应中的 `residual_value` 包含可用状态、挂牌价估算、残值率、模型与误差说明；残值率仅在提供新电参考价时返回。不传残值信息的旧客户端仍正常返回健康与寿命评估。残值独立计算，不改变 SOH 和剩余寿命。

响应保留 `soh`、`soh_percent`、`estimated_remaining_months`、`estimated_remaining_years`、`risk_level`、`main_degradation_factors`、`suggestions`、`mapped_features` 和 `model_used`，并补充：

- `battery_chemistry`：规范化后的电池化学类型。
- `training_datasets`：实际模型训练来源；规则估算时为空。
- `prediction_note`：模型或规则估算的说明。
- `algorithm_version`：当前为 `xgboost-v2`，无对应模型时为 `rules-v1`。
- `estimated_remaining_cycles`：按当前条件估算的剩余循环。
- `remaining_life_method`、`remaining_life_note`：分别标明 `trained_cycles` 或 `rules` 以及月份换算边界。

## 部署与版本管理

官网保留原有 Vercel 配置，项目根目录仍为 `Battest/web`。网站和小程序继续共用域名及 API，不需要增加环境变量。本次整合通过功能分支审查，不直接触发正式站点发布。

`dataset/`、`output/`、`tmp/`、依赖目录、构建缓存和 Python 模型产物不上传 Git。保留中文文档、报告以及轻量在线模型。此前历史提交中的 CALB 文件不在本次整合中重写或清除。

## 使用边界

评估基于用户输入、实验模型及习惯规则，仅用于日常管理、初步筛查和研究展示，不能替代专业检测、维修判断或厂商质保。慢充、小充电区间、车辆电池组及真实日历寿命仍需用车数据验证。寿命模型仅在观测终点电芯上训练，存在事件条件选择偏差；三元锂寿命未经模型验证。
