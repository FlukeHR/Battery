# 仓库开发指南

## 结构与边界

本仓库同时维护电池建模管线、官网和微信小程序。官网为 `Battest/web/`，小程序为 `Battest/miniprogram/`。用户要求保留这一结构，两端必须共用官网的 `/api/predict`，不得在小程序中复制 SOH 算法。

- `src/`：Python 数据读取、特征工程、训练、预测和网站模型导出。
- `tests/`：Python 模型管线测试。
- `Battest/web/src/app/`：官网页面及唯一线上 API。
- `Battest/web/src/lib/battery-prediction.ts`：在线输入映射与融合预测。
- `Battest/web/src/lib/xgboost.ts`、`models/`：已训练回归树的服务端推理及轻量模型。
- `Battest/miniprogram/app/`：微信页面、组件、服务、类型和本地存储。
- `data/reports/`：中文数据、特征和模型报告。
- `dataset/`、`output/`、`tmp/`：只保留本地，禁止加入 Git。

## 数据与建模

- CALB 为三元锂（NCM / NMC），HUST 和 MATR 为磷酸铁锂（LFP / LiFePO4）。
- 修改特征提取前先检查实际 Pickle 结构，并校验正极材料与来源化学类型。
- SOH = 当前循环放电容量 / 首个有效循环放电容量；寿命终点为 SOH ≤ 0.80。
- 在每个来源内部按完整 `cell_id` 分组划分，确保各来源进入训练集和测试集，同一电芯不得交叉。
- HUST 无温度记录，应保留样本；只使用训练集中位数补齐，训练集整列缺失时填零。
- `dataset`、`battery_chemistry` 为来源信息，不作为模型特征。
- 两类模型使用相同 XGBoost 参数。CALB 模型保存在本地 `models/`，HUST + MATR 保存在本地 `models/lfp/`。
- 保留 75% 对应模型与 25% 使用习惯规则的融合；没有对应模型的类型只使用规则。
- 不训练 Transformer，不引入本任务不需要的新依赖或额外线上后端。
- 不修改或删除原始数据，不在未重新运行完整管线并更新报告时覆盖训练产物。

## 导出与两端一致性

使用 `python -m src.export_web_models` 将本地训练模型导出到 `Battest/web/src/lib/models/`。这些轻量文件可提交，原始数据和 Python 模型二进制文件不得提交。

导出支持当前单输出、数值特征的 `gbtree` + `reg:squarederror` 模型，不支持的模型必须明确报错。网站输入映射、缺失值、float32 回归树计算及融合方式应与 Python 保持一致。

修改模型、特征映射、SOH 阈值或规则时，必须增加有意义的测试。重新训练后需重新导出，并通过 Python 原生模型与网站结果的对照测试。健康状态与预测响应必须真实标注实际模型及来源。

## 开发与验证

Python 使用 `dachuang` 环境，优先通过 `conda run -n dachuang python` 执行；启动器不可用时允许直接调用该环境的 Python。

```powershell
python -m pytest -q
cd Battest/web
npm ci
npm test
npm run lint
npm run build
cd ../miniprogram
npm ci
npm run typecheck
npm run lint
npm test
```

只有需要重新生成训练产物时，才运行完整检查、特征处理和训练流程。官网接口变更还需检查 `/api/health`，并使用固定输入请求 `/api/predict`。未经浏览器或 HTTP 检查不得声称网页已验证；未使用微信开发者工具或真机不得声称已完成对应验收。

小程序目录下的 `AGENTS.md` 继续有效，涉及小程序前先阅读其 `PRD.md` 和 `ARCHITECTURE.md`。

## 编码与文档

Python 使用四空格缩进、类型注解和 `snake_case`。TypeScript 使用严格模式、两空格缩进；React 组件采用 `PascalCase`，共享函数和变量采用 `camelCase`。官网优先使用现有组件、`@/` 别名和 Tailwind。

接口字段保持 `snake_case`，新增字段应兼容已有客户端和本地历史。普通用户不需要直接填写 SOH、DOD、C 倍率、内阻等实验术语。

文档和报告说明统一使用中文，路径、命令、接口字段及机器可读数据保留原始标识。长期规范写入 `AGENTS.md`，阶段进度与已知问题写入 `STATUS.md`。

## 提交与安全

提交前检查暂存文件，确保没有原始数据、输出、依赖、缓存、凭据、私钥或私有配置。保留已有官网与小程序，整合提交使用 `codex/` 功能分支；拉取请求说明变化、兼容性和实际验证结果。

不重写远程历史，不强制推送，不擅自发布生产环境或启用付费存储。对旧原始数据取消跟踪时保留本地文件。
