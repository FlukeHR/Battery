# 电检通微信小程序

这是“电检通”面向个人两轮电动车车主的微信原生小程序。V0.1 已完成可导入微信开发者工具的 TypeScript 工程，复用网站预测服务，不在小程序内复制算法。

## 已实现功能

- 五步辅助评估：场景、电池、充电、环境与确认。
- 本地校验、提交锁、10 秒超时，以及网络、校验、服务和响应异常提示。
- SOH、风险、剩余月数、衰减因素、建议、评估摘要和算法标签。
- 最近 20 份本机报告，支持查看、删除、清空和再次评估。
- 分享摘要入口；分享路径不携带完整评估输入。
- 方法、数据、隐私、免责声明和反馈说明。

## 项目文档

- [PRD.md](./PRD.md)：目标用户、使用场景、功能范围和验收标准。
- [ARCHITECTURE.md](./ARCHITECTURE.md)：技术选型、请求链路、目录规划与演进路线。
- [AGENTS.md](./AGENTS.md)：后续开发人员与编码 Agent 必须遵循的项目规范。

## V0.1 产品假设

- 平台：仅微信小程序，采用原生 TypeScript。
- 用户：个人两轮电动车车主，兼顾二手交易前的快速评估。
- 数据：无需登录；最近 20 份报告仅保存在本机，可随时清除。
- 后端：复用 `https://battest.ccwu.cc/api/predict`。
- 边界：结果属于辅助评估，不代替检测设备、维修结论或厂商质保。

## 开发前置条件

导入微信开发者工具前，请复制或由工具生成 `project.private.config.json`，并在本机填写真实 AppID。公共 `project.config.json` 使用游客 AppID，不能用于发布。

正式预览或发布前还需要确认小程序名称/主体，并在微信后台把 `https://battest.ccwu.cc` 配置为 request 合法域名。不要把 AppSecret、上传私钥或个人配置提交到 Git。

## 本地验证

```bash
cd Battest/miniprogram
npm install
npm run typecheck
npm run lint
npm test
```

随后在微信开发者工具中导入 `Battest/miniprogram`。开发工具会按 `miniprogramRoot` 与 TypeScript 编译插件加载源码。若仅在模拟器调试尚未配置的域名，可临时关闭域名校验；真机与发布版本必须完成合法域名配置。

## 目录说明

- `miniprogram/pages/`：评估、结果、记录和关于页面。
- `miniprogram/components/`：步骤、风险标签和报告卡片。
- `miniprogram/services/`：预测 API、超时、提交锁和响应适配。
- `miniprogram/stores/`：草稿、临时结果与本地历史。
- `miniprogram/types/`：API 和页面共享类型。
- `miniprogram/utils/`：校验与展示纯函数。
- `tests/`：校验、API 契约、历史淘汰和风险文案测试。

## 发布前人工验收

- 在开发者工具中走通填写、失败重试、结果保存、分享、删除和清空。
- 使用固定样本对比网页与小程序结果。
- 在 iOS、Android 真机各完成一次全流程。
- 补齐隐私保护指引、服务器域名和提审资料。
