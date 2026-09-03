# 仓库贡献指南

## 项目结构与模块组织

本仓库由离线电池建模管线和一个可部署的 Web 应用组成。

- `src/`：Python 数据加载、特征工程、模型训练和离线预测模块。
- `tests/`：使用 pytest 测试特征提取、用户输入映射和预测行为。
- `dataset/CALB/`：原始电池循环数据，只能作为只读输入使用。
- `data/reports/`：数据分析与模型报告；生成的处理数据放在 `data/processed/`。
- `Battest/web/`：唯一的 Next.js 应用。页面位于 `src/app`，组件位于 `src/components`，共享逻辑位于 `src/lib`。
- `Battest/web/src/app/api/`：唯一的线上 API，目前包含 `/api/health` 和 `/api/predict`。

## 构建、测试与开发命令

使用 `python -m pip install -r requirements.txt` 安装 Python 依赖。

```bash
python -m pytest -q                 # 运行离线模型测试
cd Battest/web
npm install                         # 安装前端依赖
npm run dev                         # 在 localhost:3000 启动开发服务
npm run lint                        # 执行 Next.js ESLint 检查
npm run build                       # 类型检查并生成生产构建
npm start                           # 启动生产构建
```

只有在确实需要重新生成模型产物时，才运行 `python -m src.run_feature_pipeline` 或 `python -m src.train_xgboost`。

## 编码风格与命名规范

Python 使用四空格缩进、类型注解和 `snake_case` 命名，并保持模块职责单一。TypeScript 使用严格模式、两空格缩进；React 组件使用 `PascalCase`，函数使用 `camelCase`，文件使用 `battery-assessment.tsx` 这样的 kebab-case。Next.js 应用内优先使用 `@/` 路径别名和 Tailwind 工具类。API JSON 字段继续使用 `snake_case`，避免破坏现有预测契约。

## 测试规范

Python 测试文件命名为 `test_*.py`，测试函数命名为 `test_<行为>`。修改特征计算、SOH 阈值或映射规则时必须补充测试。Web 应用暂未配置独立单元测试框架，因此修改页面或 API 后至少运行 `npm run lint`、`npm run build`，并向 `/api/predict` 发送一次烟雾测试请求。

## 提交与拉取请求规范

当前 Git 历史只有初始化提交，尚无固定规范。请使用简短的命令式提交信息，建议包含范围，例如 `feat(web): add battery assessment validation`。每个提交只处理一个明确主题。拉取请求应说明用户可见变化、模型或 API 契约变更、已执行的验证命令，并关联相关 Issue；涉及界面修改时应附截图。

## 架构与数据安全

线上预测位于 `Battest/web/src/lib/battery-prediction.ts`，Python XGBoost 代码是离线研究基线。修改映射规则时应保持两套实现的行为一致。禁止提交凭据、生成缓存或模型临时文件，也不要修改或删除 `dataset/CALB/` 中的原始数据。
