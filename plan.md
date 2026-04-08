# 实现计划：阶段三测试

## 涉及文档
- docs/current/开发进度-阶段三.md
- docs/current/INDEX.md

## 涉及模块和文件

### 后端测试
- `clothing-mall-wx-api/src/test/java/org/linlinjava/litemall/wx/web/WxUserControllerTest.java`
- `clothing-mall-wx-api/src/test/java/org/linlinjava/litemall/wx/web/WxManagerOrderControllerTest.java`
- `clothing-mall-wx-api/src/test/java/org/linlinjava/litemall/wx/web/WxAiControllerTest.java`

### 小程序 E2E 测试
- `clothing-mall-wx/e2e/manager-e2e.test.js`

### 小程序页面
- `clothing-mall-wx/pages/manager/index/` - 管理首页
- `clothing-mall-wx/pages/manager/order/` - 订单列表
- `clothing-mall-wx/pages/manager/orderDetail/` - 订单详情
- `clothing-mall-wx/pages/manager/upload/` - 拍照上传
- `clothing-mall-wx/pages/manager/confirmUpload/` - 确认上传
- `clothing-mall-wx/pages/manager/draftList/` - 草稿列表
- `clothing-mall-wx/pages/manager/skuList/` - SKU 列表

## 测试覆盖现状

| 测试类别 | 测试文件 | 测试用例数 | 状态 |
|---------|---------|-----------|------|
| 用户角色 API | WxUserControllerTest.java | 12 | 已编写 |
| 管理端订单 API | WxManagerOrderControllerTest.java | 12 | 已编写 |
| AI 识别 API | WxAiControllerTest.java | 10 | 已编写 |
| 小程序 E2E | manager-e2e.test.js | 18 | 已编写 |

## 实现步骤

### 步骤 1：运行后端单元测试
- **目标**：验证所有后端 API 测试通过
- **涉及文件**：`clothing-mall-wx-api/src/test/java/`
- **验证命令**：`mvn test -pl clothing-mall-wx-api -Dtest=WxUserControllerTest,WxManagerOrderControllerTest,WxAiControllerTest`
- **依赖**：无

### 步骤 2：检查小程序 E2E 测试环境
- **目标**：确认微信开发者工具可连接，E2E 测试可运行
- **涉及文件**：`clothing-mall-wx/e2e/manager-e2e.test.js`
- **前置条件**：
  - 微信开发者工具已安装并打开
  - 服务端口已开启（设置 -> 安全设置 -> 服务端口）
  - 项目已导入开发者工具
- **验证命令**：`cd clothing-mall-wx && node e2e/manager-e2e.test.js`
- **依赖**：步骤 1

### 步骤 3：修复测试失败用例
- **目标**：修复任何失败的测试用例
- **涉及文件**：根据步骤 1-2 结果确定
- **验证命令**：重新运行失败的测试
- **依赖**：步骤 1, 2

### 步骤 4：验收测试报告
- **目标**：生成测试覆盖率报告，确认阶段三测试完成
- **验证命令**：全量测试 + 输出报告
- **依赖**：步骤 3

## 风险与注意事项

1. **E2E 测试环境依赖**：小程序 E2E 测试需要微信开发者工具，Mac 路径硬编码在测试文件中，Windows 需要修改路径
2. **测试数据**：E2E 测试部分用例需要真实订单数据，可能需要先创建测试数据
3. **数据库隔离**：测试不应影响生产数据库，建议使用独立的测试数据库
4. **网络依赖**：AI 识别测试使用 Mock 数据，不依赖真实 AI API

## 预期结果

- [ ] 后端 34 个单元测试全部通过
- [ ] 小程序 E2E 测试可运行（部分用例可能因环境跳过）
- [ ] 测试覆盖率报告生成
