# 文档时效状态表

> 更新时间：2026-05-11
> 目的：标明哪些文档可作为当前事实，哪些仅作历史参考，避免迁移后继续引用旧架构或旧环境。

## 当前有效

| 文档 | 状态 | 说明 |
|------|------|------|
| `docs/current/INDEX.md` | 当前有效 | 当前项目状态、架构、测试入口和待确认项 |
| `docs/current/migration-plan.md` | 当前有效 | 新旧环境迁移对照，旧环境列仅作历史对照 |
| `docs/test/release-test-strategy.md` | 当前有效 | 发布前测试策略 |
| `docs/test/automation-plan.md` | 当前有效 | 自动化测试建设计划 |
| `docs/test/core-flow-checklist.md` | 当前有效 | 核心流程走查模板 |
| `docs/guides/开发环境指南.md` | 当前有效 | CloudBase 当前开发和部署流程 |
| `docs/guides/客服接入与企业微信方案说明.md` | 待确认 | 方向有效，但客服跳转企微依赖账号绑定、客服链接和 `corpId` |
| `AGENTS.md` | 当前有效 | 当前仓库工作协议和 CloudBase 环境 |

## 待确认

| 文档 | 状态 | 说明 |
|------|------|------|
| `docs/current/wework-integration.md` | 待确认 | 企业微信推送暂不推进；配置和小程序关联未确认 |
| `docs/current/plan-footprint-stat.md` | 待确认 | 统计页面方案，需确认是否已完全落地 |
| `docs/current/plan-history-stat.md` | 待确认 | 统计页面方案，需确认是否已完全落地 |
| `docs/current/阻塞记录.md` | 待更新 | 仍保留 Java 类名和旧配置示例，AI 识别/打印机阻塞结论仍有参考价值 |

## 历史参考

| 文档/目录 | 状态 | 说明 |
|----------|------|------|
| `docs/云开发迁移方案.md` | 历史参考 | 记录从 Spring Boot 到 CloudBase 的迁移设计，当前已迁移完成，不作为现状 |
| `docs/guides/阿里云部署指南.md` | 历史参考 | 旧 ECS/Docker/Spring Boot 部署路径，当前不使用 |
| `docs/design/` | 历史参考 | 产品与流程设计可参考，但技术栈、状态和接口以当前代码为准 |
| `docs/research/` | 历史参考 | 技术和业务调研资料，涉及平台政策需重新核验 |
| `docs/operations/` | 历史参考 | 走查和会议记录，用于理解业务背景 |
| `docs/superpowers/` | 历史参考 | 历史功能方案和实施计划，不能直接当作当前实现 |
| `docs/test/test-strategy.md` | 历史参考 | 早期测试体系设计，当前发布门禁以 `qa/release/` 为准 |
| `docs/test/test-plan.md` | 历史参考 | 历史测试计划，环境信息已校准，但用例细节需按当前脚本复核 |
| `docs/test/reports/` | 历史参考 | 历史测试结果 |
| `docs/test/html/` | 历史参考 | 历史 HTML 测试报告 |

## 已归档

| 目录 | 状态 | 说明 |
|------|------|------|
| `docs/_archive/legacy-litemall/` | 已归档 | 原 litemall 文档 |
| `docs/_archive/phase-*` | 已归档 | 早期阶段文档 |
| `docs/_archive/deprecated/` | 已归档 | 明确过时的任务清单 |

## 维护规则

1. 当前事实只允许从 `docs/current/INDEX.md` 或本表进入。
2. 发现文档还在引用旧环境 `clo-test-4g8ukdond34672de` 时，先判断是历史对照还是误导性默认值。
3. 涉及 Java/Spring Boot/阿里云 ECS 的内容默认视为历史参考，除非文档明确说明是迁移背景。
4. 涉及微信、企业微信、手机号能力、支付和审核规则时，需按当前官方规则重新核验后再更新。
