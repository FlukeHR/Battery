# 电检通：电动车电池健康评估

电检通是一个面向电动车车主和二手车商家的电池健康评估项目。用户填写电池类型、使用时间、充电习惯、驾驶方式和停放环境后，系统会生成健康度（SOH）、预计剩余寿命、风险等级、主要衰减因素和保养建议。

项目同时包含一套 CALB 电芯循环数据研究管线，用于特征工程、XGBoost 基线训练和后续模型迭代。当前在线版本采用可解释的 TypeScript 规则估算，Python 模型代码作为离线研究基线。

## 核心功能

- 在线电池健康评估与中文结果报告
- 微信小程序五步评估、本机历史与安全分享摘要
- 磷酸铁锂、三元锂、铅酸等电池类型支持
- 充电深度、等效循环、温度、负载和驾驶压力映射
- 同一 Next.js 应用内提供页面和 API，无需单独启动后端
- CALB 数据检查、特征工程、模型训练与评估脚本

## 项目结构

```text
Battery/
├── Battest/web/           # 线上 Web 应用与预测 API（Next.js）
│   └── src/
│       ├── app/           # 页面与 Route Handlers
│       ├── components/    # 表单、布局和 UI 组件
│       └── lib/           # 在线预测与共享逻辑
├── Battest/miniprogram/   # 微信原生 TypeScript 客户端
│   ├── miniprogram/       # 页面、组件、服务与本地存储
│   └── tests/             # 小程序纯函数与 API 契约测试
├── src/                   # Python 离线数据与模型管线
├── tests/                 # pytest 测试
├── dataset/CALB/          # 原始循环数据
└── data/reports/          # 数据和模型报告
```

在线请求链路：

```text
/assessment → /api/predict → battery-prediction.ts → JSON 评估结果
微信小程序 → https://battest.ccwu.cc/api/predict → 同一预测实现
```

## 快速开始

需要 Node.js 18+ 和 npm。

```bash
cd Battest/web
npm ci
npm run dev
```

打开：

- 官网：[http://localhost:3000](http://localhost:3000)
- 在线评估：[http://localhost:3000/assessment](http://localhost:3000/assessment)
- 健康检查：[http://localhost:3000/api/health](http://localhost:3000/api/health)

当前在线应用不需要环境变量，也不需要额外启动 FastAPI 服务。

微信小程序开发：

```bash
cd Battest/miniprogram
npm ci
npm run typecheck
npm run lint
npm test
```

再使用微信开发者工具导入 `Battest/miniprogram`。真机请求前需将 `https://battest.ccwu.cc` 配置为小程序 request 合法域名，并仅在本机私有配置中填写真实 AppID。

## 生产构建

```bash
cd Battest/web
npm ci
npm run build
npm start
```

`npm run build` 会同时执行 Next.js 编译、TypeScript 检查和页面生成。默认服务端口为 `3000`，可通过运行环境的 `PORT` 变量调整。

## 部署到 Vercel

通过 Vercel 导入 Git 仓库时，请将项目的 **Root Directory** 设置为 `Battest/web`，Framework Preset 选择 **Next.js**，其余构建设置保持默认。连接 Git 后，功能分支会生成预览部署，生产分支用于正式环境。

也可以从应用目录使用 CLI：

```bash
cd Battest/web
npx vercel          # 创建预览部署
npx vercel --prod   # 部署到生产环境
```

部署前应先在本地运行 `npm run lint && npm run build`。不要把 Vercel Token 或其他凭据提交到仓库。更多信息参见 [Vercel 部署文档](https://vercel.com/docs/deployments/overview)。

## API 使用

### `GET /api/health`

返回在线估算引擎状态。

### `POST /api/predict`

```bash
curl -X POST http://localhost:3000/api/predict \
  -H 'Content-Type: application/json' \
  -d '{
    "battery_type": "LFP",
    "voltage": 48,
    "capacity_ah": 20,
    "battery_age_months": 18,
    "charge_start_soc": 20,
    "charge_end_soc": 90,
    "weekly_charge_times": 4,
    "driving_style": "normal",
    "load_condition": "single",
    "long_term_storage": "occasionally",
    "city": "Chengdu",
    "parking_environment": "indoor"
  }'
```

响应包含 `soh_percent`、`estimated_remaining_months`、`risk_level`、`main_degradation_factors`、`suggestions` 和映射后的物理特征。无效输入返回 `400` 或 `422`。

## 离线数据与模型研究

Python 管线不参与网站运行。如需复现实验，建议使用独立虚拟环境：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m src.inspect_pkl
python -m src.run_feature_pipeline
python -m src.train_xgboost
python -m pytest -q
```

当前报告记录了 27 个 CALB 数据文件、2,791 条有效循环记录，以及按 `cell_id` 分组测试的 XGBoost 基线。生成的 CSV、图表和模型文件默认不提交到 Git。不要修改或删除 `dataset/CALB/` 中的原始数据。

## 质量检查

提交代码前运行：

```bash
python -m pytest -q
cd Battest/web
npm run lint
npm run build
cd ../miniprogram
npm run typecheck
npm run lint
npm test
```

贡献约定见 [AGENTS.md](./AGENTS.md)。

## 使用边界

评估结果依赖用户输入和实验数据映射，仅适合日常管理、初步筛查与研究展示，不能替代专业检测设备、维修结论或厂商质保流程。
