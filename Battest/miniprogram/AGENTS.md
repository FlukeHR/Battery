# 小程序项目协作指南

## 适用范围

本文件适用于 `Battest/miniprogram/`。上层仓库规范继续有效；冲突时以本文件对小程序的具体约定为准。开始实现前先阅读 `PRD.md` 和 `ARCHITECTURE.md`，不要自行扩大产品范围。

## 项目边界

小程序是独立客户端，但必须复用 `Battest/web` 提供的预测 API。禁止在小程序中复制或改写 SOH 算法。首版默认免登录、本地历史，不得擅自增加手机号、精确位置、相册或微信用户信息采集。

## 目录与职责

- `miniprogram/pages/`：页面与页面级交互。
- `miniprogram/components/`：可复用展示组件。
- `miniprogram/services/`：API 请求、超时和响应适配。
- `miniprogram/stores/`：表单草稿与本地历史。
- `miniprogram/types/`：共享 TypeScript 类型。
- `miniprogram/utils/`：无副作用、可测试的工具函数。
- `tests/`：单元、契约和组件测试。

## 编码约定

使用 TypeScript、两空格缩进和严格类型检查。文件与目录使用 kebab-case，类型与组件使用 PascalCase，变量和函数使用 camelCase。API JSON 字段保持现有 `snake_case`。页面不得直接硬编码域名或调用 `wx.request`；统一通过 `services/prediction.ts`。

避免 `any`、非必要全局状态和静默捕获异常。所有网络状态必须覆盖加载、成功、校验失败、超时和服务异常。用户可见文本使用简体中文，并避免绝对化医疗或安全结论。

## API 与数据规则

修改请求或响应结构时，应先更新 `PRD.md`、类型定义和契约测试，再修改网页 API。AppSecret、CI 私钥、Token、真实 AppID 私有配置和用户数据不得提交。日志不得记录完整评估输入。

## 验证要求

代码脚手架建立后，提交前至少运行：

```bash
npm run typecheck
npm run lint
npm test
```

涉及核心流程时，还需在微信开发者工具中完成一次从填写到结果的预览；发布候选版本必须在 iOS 和 Android 真机各验证一次。API 或算法调整后，使用固定样本比较网页与小程序结果。

## 完成定义

功能必须满足 PRD 验收标准，包含错误与空状态，测试通过，无敏感配置，并更新相关文档。界面变更需附开发者工具截图；API 变更需列出兼容性影响和回滚方式。
