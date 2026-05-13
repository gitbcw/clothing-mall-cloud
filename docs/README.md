# 川着项目文档

> 更新时间：2026-05-11
> 当前事实入口：[current/INDEX.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/current/INDEX.md)

本目录包含当前实现文档、测试文档、历史设计资料和调研资料。由于项目已从早期 Java/Spring Boot + 阿里云方案迁移到微信小程序云开发架构，阅读文档时以 `docs/current/` 和 `docs/test/release-test-strategy.md` 为准。

## 当前有效入口

| 文档 | 用途 |
|------|------|
| [current/INDEX.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/current/INDEX.md) | 当前项目状态、架构、测试入口、阻塞项 |
| [current/migration-plan.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/current/migration-plan.md) | 新旧云环境与 AppID 迁移对照 |
| [current/document-status.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/current/document-status.md) | 文档时效状态表 |
| [test/release-test-strategy.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/release-test-strategy.md) | 当前发布前测试策略 |
| [test/README.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/README.md) | 测试文档与脚本入口 |
| [guides/开发环境指南.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/guides/开发环境指南.md) | 当前 CloudBase 开发和验证流程 |
| [guides/客服接入与企业微信方案说明.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/guides/客服接入与企业微信方案说明.md) | 客服/企业微信接入边界和待确认项 |

## 目录结构

```
docs/
├── current/       # 当前事实、迁移状态、待确认项和近期计划
├── test/          # 当前发布测试策略、脚本入口、历史测试报告
├── guides/        # 开发、部署、客服接入指南
├── design/        # 产品设计和流程设计，多数为历史设计参考
├── research/      # 技术调研和成本调研
├── operations/    # 运营走查、会议记录、业务梳理
├── superpowers/   # 历史功能设计/实施方案，按日期保留
└── _archive/      # 已明确归档的旧文档和原 litemall 文档
```

## 时效规则

| 状态 | 含义 |
|------|------|
| 当前有效 | 可作为当前开发、测试、部署依据 |
| 待确认 | 内容方向仍有价值，但依赖账号、审核、配置或业务决策 |
| 历史参考 | 记录历史设计、调研或旧实现，不可直接作为当前事实 |
| 已归档 | 明确过时，仅供追溯 |

具体清单见 [current/document-status.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/current/document-status.md)。

## 维护规范

1. 当前事实只写入 `docs/current/INDEX.md` 或从该文件链接出去。
2. 新增测试入口要同步更新 `docs/test/README.md` 和 `docs/current/INDEX.md`。
3. 涉及云环境、AppID、静态托管域名的改动，要同步检查 `AGENTS.md`、`docs/current/migration-plan.md` 和 `qa/release/*`。
4. 历史文档不要直接删除；若仍有参考价值，标为“历史参考”，必要时移动到 `_archive/`。
5. 遇到不确定内容，明确写“待确认”，不要把推测写成事实。
