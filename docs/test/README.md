# 测试文档

本目录包含 Clothing Mall 项目的测试策略、计划和报告。

## 文档列表

| 文档 | 说明 |
|------|------|
| [测试策略](test-strategy.md) | 测试架构、工具选择和目录结构 |
| [测试计划](test-plan.md) | 测试用例和执行计划 |
| [测试报告 2026-03-15](test-report-2026-03-15.md) | 最新测试执行报告 |

## HTML 报告

- [小程序 API 测试报告](html/test-report-wx-api.html)
- [本地测试报告](html/test-report-wx-api-local.html)

## 运行测试

```bash
# 后端单元测试
mvn test

# API 测试
/Users/combo/Library/Python/3.9/bin/pytest tests/api/ -v

# E2E 测试
/Users/combo/Library/Python/3.9/bin/pytest tests/e2e/ -v --headed

# 前端单元测试
cd clothing-mall-admin
NODE_OPTIONS="--experimental-vm-modules" npm run test:unit

# 小程序 UI 测试
cd tests/miniprogram
npm test
```

---

*最后更新: 2026-03-15*
