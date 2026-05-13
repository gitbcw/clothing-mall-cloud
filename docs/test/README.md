# 测试文档

> 更新时间：2026-05-11
> 当前测试环境：`cloudbase-d3g1zmq7r388144eb`

本目录包含发布前测试策略、执行清单和历史测试报告。当前发布判断以 `qa/release/` 下的 Node 脚本和 CloudBase 测试环境为准；旧 Python/Maven 测试只作为历史资产，不进入发布门禁。

## 当前有效文档

| 文档 | 说明 |
|------|------|
| [release-test-strategy.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/release-test-strategy.md) | 当前发布前测试策略 |
| [automation-plan.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/automation-plan.md) | 自动化测试分层和后续建设计划 |
| [core-flow-checklist.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/core-flow-checklist.md) | AI/人工核心流程走查模板 |
| [test-plan.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/test-plan.md) | 历史测试计划，已更新当前环境信息，细节需按当前脚本校准 |

## 当前脚本入口

```bash
# 发布测试总入口
node qa/release/run-release-tests.js

# 单项冒烟
node qa/release/db-smoke.js
node qa/release/miniprogram-static-smoke.js
node qa/release/cloudfunction-smoke.js
node qa/release/cloudfunction-flow-smoke.js
node qa/release/admin-hosting-smoke.js
```

## 已知边界

- 新小程序暂无获取手机号能力，手机号授权/绑定链路暂不作为发布门禁。
- 企业微信未关联新小程序，本阶段暂不测试推送。
- 客服跳转企业微信仍待确认账号绑定、客服链接和 `corpId`。
- 旧 `tests/` 目录包含 Python API/E2E、废弃秒杀/满减等用例，不直接用于当前发布判断。

## 历史资料

| 路径 | 说明 |
|------|------|
| [test-strategy.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/test-strategy.md) | 早期测试体系设计，部分内容已过期 |
| [reports/](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/reports) | 历史测试报告 |
| [html/](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/html) | 历史 HTML 报告 |
