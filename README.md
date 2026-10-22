# Battery：电检通电池健康评估

本仓库统一维护电检通官网、微信小程序，以及共用的电池建模与评估算法。

## 项目结构

```text
Battery/
├── Battest/
│   ├── web/                  # 官网、在线评估及共用 Next.js API
│   └── miniprogram/          # 微信原生 TypeScript 小程序
├── src/                      # Python 数据检查、特征提取、训练及模型导出
├── tests/                    # Python 模型管线测试
├── data/reports/             # 中文数据结构、特征与模型评估报告
├── dataset/                  # 本地 CALB、HUST、MATR 原始数据，不上传
├── models/                   # 本地 Python 训练模型，不上传
├── AGENTS.md                 # 仓库开发规范
└── STATUS.md                 # 当前状态与验证记录
```

`Battest/web` 是官网，`Battest/miniprogram` 是小程序。两端共用官网的 `/api/predict`，小程序不复制预测算法。原 FastAPI 与静态网页演示已由现有 Next.js 应用统一承接；旧实现仍保留在 Git 历史中。

## 数据集与模型

| 电池类型 | 训练来源 | 电芯数 | 有效循环样本数 | 在线方式 |
|---|---|---:|---:|---|
| 三元锂（NCM / NMC） | CALB | 27 | 2,791 | 对应 XGBoost 模型与习惯规则融合 |
| 磷酸铁锂（LFP） | HUST + MATR | 77 + 169 | 146,120 + 140,001 | 对应 XGBoost 模型与习惯规则融合 |
| 铅酸或不确定类型 | 暂无对应实验数据 | — | — | 明确标注为规则估算 |

两类模型使用相同的 21 个特征、XGBoost 参数和随机种子。按数据来源及完整电芯划分训练集与测试集，禁止同一电芯出现在两者中。SOH 为当前放电容量与首个有效循环容量之比；寿命终点为 SOH ≤ 0.80。

HUST 没有温度记录，保留这些样本，训练时只用训练集的中位数补齐。训练集整列缺失时才填零，磷酸铁锂环境温度特征属于这种情况。

在线预测保持 Python 现有算法：对应 XGBoost 预测占 75%，使用习惯规则占 25%；剩余寿命继续通过使用习惯与衰减规则估算。网站读取导出的同一组回归树，不依赖 Python 运行环境或原始数据。

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

两类在线模型的轻量文件保存在 `Battest/web/src/lib/models/`，合计约 433 KB，可随代码提交。克隆后即可启动官网，无需下载约 12.5 GB 的原始数据，也无需额外启动后端。

生产检查与运行：

```powershell
npm test
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
npm test
```

在微信开发者工具中导入 `Battest/miniprogram`，源码目录为 `app/`。正式预览或发布前，需在本机私有配置中填写自己的 AppID，并将 `https://battest.ccwu.cc` 配置为 request 合法域名。不得提交 AppSecret、Token、上传私钥或个人私有配置。

小程序继续调用同一官网接口，支持读取化学类型、模型来源及算法版本。旧接口或历史记录没有新增字段时仍可展示。开发者工具及 iOS、Android 真机验收需由具备对应设备的人员完成。

## Python 研究管线

原始数据只保存在本地，按以下位置放置：

```text
dataset/CALB/*.pkl
dataset/HUST/*.pkl
dataset/MATR/*.pkl
```

使用现有 `dachuang` 环境，或安装 `requirements.txt` 后依次运行：

```powershell
conda run -n dachuang python -m src.inspect_pkl
conda run -n dachuang python -m src.run_feature_pipeline
conda run -n dachuang python -m src.train_xgboost
conda run -n dachuang python -m src.export_web_models
conda run -n dachuang python -m pytest -q
```

若本机 conda 启动器不可用，可直接使用 `D:\Anaconda\envs\dachuang\python.exe` 执行相同的模块命令。

Python 模型分别保存在 `models/`（三元锂）和 `models/lfp/`（磷酸铁锂）。导出命令读取已训练模型，生成网站所需回归树和 Python 对照样例，不重新训练、不修改原始数据。重新训练后必须重新导出，并执行官网的 `npm test`。

## 模型评估结果

| 模型 | 训练样本数 | 测试样本数 | 平均绝对误差 | 均方根误差 | 决定系数 R² |
|---|---:|---:|---:|---:|---:|
| CALB / 三元锂 | 2,196 | 595 | 0.005945 | 0.009101 | 0.865801 |
| HUST + MATR / 磷酸铁锂 | 228,241 | 57,880 | 0.009408 | 0.016031 | 0.947980 |

这些指标来自未参与训练的实验电芯，不代表日常用车或剩余寿命预测的实测准确性。详细结果见 `data/reports/model_report.md` 和 `data/reports/lfp/model_report.md`。

## 接口契约

`GET /api/health` 返回两类模型的加载状态和训练来源。

`POST /api/predict` 接收电池类型、电压、容量、使用月数、充电起止电量、每周充电次数、驾驶习惯、负载、存放习惯、城市和停放环境。参数字段保持现有 `snake_case`；无效 JSON 返回 400，无效参数返回 422。

响应保留 `soh`、`soh_percent`、`estimated_remaining_months`、`estimated_remaining_years`、`risk_level`、`main_degradation_factors`、`suggestions`、`mapped_features` 和 `model_used`，并补充：

- `battery_chemistry`：规范化后的电池化学类型。
- `training_datasets`：实际模型训练来源；规则估算时为空。
- `prediction_note`：模型或规则估算的说明。
- `algorithm_version`：`xgboost-v1` 或 `rules-v1`。

## 部署与版本管理

官网保留原有 Vercel 配置，项目根目录仍为 `Battest/web`。网站和小程序继续共用域名及 API，不需要增加环境变量。本次整合通过功能分支审查，不直接触发正式站点发布。

`dataset/`、`output/`、`tmp/`、依赖目录、构建缓存和 Python 模型产物不上传 Git。保留中文文档、报告、测试以及轻量在线模型。此前历史提交中的 CALB 文件不在本次整合中重写或清除。

## 使用边界

评估基于用户输入、实验模型及习惯规则，仅用于日常管理、初步筛查和研究展示，不能替代专业检测、维修判断或厂商质保。实验电芯与电动车电池组存在差异，当前输入映射和剩余寿命规则仍需真实用车数据校准。
