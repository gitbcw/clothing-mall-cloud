# 云环境 + AppID 迁移计划

> 更新时间：2026-05-11
> 当前状态：迁移后校准中。新环境已可用，schema 与测试入口已修复；手机号能力、企业微信关联和客服跳转仍待确认。

## 迁移背景

从测试环境迁移到上线环境，涉及云环境和小程序 AppID 同时变更。

| 项目 | 旧（测试） | 新（上线） |
|------|-----------|-----------|
| AppID | `wx1809b86df93c5107` | `wx07e5af39e1096d3d` |
| 云环境 ID | `clo-test-4g8ukdond34672de` | `cloudbase-d3g1zmq7r388144eb` |
| COS 域名 | `636c-clo-test-4g8ukdond34672de-1258700476.tcb.qcloud.la` | `636c-cloudbase-d3g1zmq7r388144eb-1427677265.tcb.qcloud.la` |
| 静态托管域名 | `clo-test-4g8ukdond34672de-1258700476.tcloudbaseapp.com` | `cloudbase-d3g1zmq7r388144eb-1427677265.tcloudbaseapp.com` |
| 区域 | ap-shanghai | ap-shanghai |

## 前提条件

- [x] 注册新小程序（AppID: `wx07e5af39e1096d3d`）
- [x] 新小程序开通云开发（环境 ID: `cloudbase-d3g1zmq7r388144eb`）
- [ ] 新小程序开通「获取手机号」能力（当前审核未通过，暂不可用）
- [x] 拿到管理员微信授权并完成 MCP 新环境绑定
- [ ] （可选）企业微信后台关联新小程序（当前未关联，推送暂不推进）

## 不需要迁移的内容

- **数据库数据**：仅迁移基础结构；当前已补分类、优惠券相关 schema，并允许创建迁移验证测试数据
- **用户头像/商品图等业务文件**：可通过管理后台和小程序重新上传；当前新环境已有部分商品图片和协议 HTML
- **微信支付**：未接入，上线后再配
- **订阅消息模板**：目前没用，上线时再申请

---

## 迁移步骤

### 第一阶段：新环境基建

#### 1. MCP 认证到新环境

```
auth(action="logout", confirm="yes")
auth(action="start_auth", authMode="web")  ← 需要管理员微信扫码
auth(action="set_env", envId="cloudbase-d3g1zmq7r388144eb")
```

> **关键依赖**：MCP web 授权需要管理员个人微信号扫码，开发者微信权限不够。

#### 2. MySQL 就绪检查 + Schema 初始化

```bash
# 检查 MySQL 状态
querySqlDatabase(action="getInstanceInfo")

# 等待 MySQL 状态为 READY 后，执行建表 SQL
manageSqlDatabase(action="initializeSchema", statements=[...])
```

建表 SQL 从旧环境导出，或使用项目中的 SQL 文件。

#### 3. 上传协议 HTML 到云存储

必须上传的文件（协议页面依赖）：
- `assets/agreement/user_agreement.html`
- `assets/agreement/privacy_policy.html`

从旧环境下载后上传到新环境，或从项目源码中获取。

### 第二阶段：云函数部署

#### 4. 部署 3 个共享层

| 层名 | 当前版本 | 操作 |
|------|---------|------|
| layer-base | v4 | 重新打包 → `createLayerVersion` |
| layer-auth | — | 同上 |
| layer-wechat | — | 同上 |

> 层的打包规范：`node_modules/层名/` 结构，源码在 `cloudfunctions/layers/层名/nodejs/` 下。

#### 5. 创建 37 个云函数 + 绑定层 + 环境变量

云函数列表：

**管理后台（12 个）**：
admin-auth, admin-clothing, admin-config, admin-content, admin-goods, admin-marketing, admin-order, admin-stat, admin-storage, admin-system, admin-user, admin-wework

**小程序端（19 个）**：
wx-ai, wx-auth, wx-cart, wx-clothing, wx-coupon, wx-express, wx-goods, wx-home, wx-manager-content, wx-manager-holiday, wx-manager-marketing, wx-manager-order, wx-manager-shelf, wx-manager-system, wx-manager-wework, wx-order, wx-pay-callback, wx-region, wx-scene, wx-storage, wx-tracker, wx-user

**定时任务（3 个）**：
task-coupon, task-order, task-push

每个函数需要：
1. `createFunction`（带 VPC 配置、层绑定）
2. 设置环境变量：`MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`、`TCB_ENV_ID`

新环境的 MySQL 连接信息需要在基建阶段获取。

#### 6. 创建 5 个定时触发器

| 函数 | 触发器名 | Cron（7段） | 说明 |
|------|---------|-------------|------|
| task-order | cancelUnpaid | `0 */5 * * * * *` | 每5分钟取消超时未付款订单 |
| task-order | autoConfirm | `0 0 3 * * * *` | 每天3点自动确认收货 |
| task-coupon | expireCoupon | `0 0 * * * * *` | 每小时处理过期优惠券 |
| task-coupon | birthdayCoupon | `0 30 0 * * * *` | 每天0:30发放生日券 |
| task-push | scheduledPush | `0 * * * * * *` | 每分钟检查定时推送 |

### 第三阶段：代码修改

#### 7. AppID 替换（2 处）

| 文件 | 旧值 | 新值 |
|------|------|------|
| `clothing-mall-wx/project.config.json` | `wx1809b86df93c5107` | `wx07e5af39e1096d3d` |
| `clothing-mall-wx/minium_tests/config.json` | `wx5e8bdc1bc5a3e0d8` | `wx07e5af39e1096d3d` |

#### 8. 云环境 ID 替换（5 处）

| 文件 | 改什么 |
|------|--------|
| `clothing-mall-wx/project.config.json` | `cloudbaseConfig.env` |
| `clothing-mall-wx/app.js` | `wx.cloud.init({ env: '...' })` |
| `clothing-mall-admin/.env.development` | `VUE_APP_CLOUDBASE_ENV` |
| `clothing-mall-admin/.env.production` | `VUE_APP_CLOUDBASE_ENV` |
| `clothing-mall-admin/.env.deployment` | `VUE_APP_CLOUDBASE_ENV` |

#### 9. COS_BASE URL 替换（8 处）

全局替换：
```
旧：https://636c-clo-test-4g8ukdond34672de-1258700476.tcb.qcloud.la/
新：https://636c-cloudbase-d3g1zmq7r388144eb-1427677265.tcb.qcloud.la/
```

| 文件 | 说明 |
|------|------|
| `clothing-mall-wx/utils/image.wxs` | WXS 全局图片 URL（WXS 无法用动态变量） |
| `clothing-mall-wx/pages/index/index.js` × 2 | 客服二维码、活动背景 |
| `clothing-mall-wx/pages/goods_detail/goods_detail.js` | 商品图预览 |
| `clothing-mall-wx/pages/agreement/agreement.js` | 协议文件加载 |
| `clothing-mall-admin/src/main.js` | 管理后台全局 imageUrl |
| `cloudfunctions/admin-goods/index.js` | 云函数 fileID 转 URL |
| `cloudfunctions/wx-ai/index.js` | AI 识别 fileID 转 URL |

#### 10. 文档和测试更新

| 文件 | 改什么 |
|------|--------|
| `CLAUDE.md` | 环境 ID、部署命令 |
| `AGENTS.md` | 同上 |
| `clothing-mall-admin/e2e/smoke.spec.js` | BASE_URL → 新静态托管域名 |

### 第四阶段：部署 & 验证

#### 11. 管理后台构建 + 部署

```bash
cd clothing-mall-admin
NODE_OPTIONS=--openssl-legacy-provider npm run build
cloudbase hosting deploy dist/ -e cloudbase-d3g1zmq7r388144eb
```

#### 12. 小程序验证

- 微信开发者工具用新 AppID 打开项目
- 真机调试验证

#### 13. 冒烟测试

| 功能 | 验证点 |
|------|--------|
| 登录 | 微信登录 + 手机号注册（需开通获取手机号权限） |
| 首页 | 加载正常、协议页面可访问 |
| 商品 | 浏览、搜索、详情 |
| 购物车 | 添加、修改、删除 |
| 下单 | 创建订单 |
| 管理后台 | 登录、商品管理、图片上传 |
| 图片上传 | 新图片能正常上传和显示 |

---

## 注意事项

1. **MCP 认证**：需要管理员微信扫码，开发者权限不够
2. **image.wxs**：WXS 模块无法使用动态变量，COS_BASE 只能硬编码
3. **layer-base**：不要修改共享层代码，只重新打包部署
4. **新环境 MySQL**：连接信息（host/port/password）会自动分配，和旧环境不同
5. **云存储 bucket**：`636c-` 前缀是 bucket 标识，新环境会不同
6. **企业微信 appid**：存储在数据库 `litemall_system_config` 表中，上线后通过管理后台更新

## 优化建议（迁移后做）

- 把 COS_BASE 提取到 `app.js` globalData 或独立 config 文件，减少硬编码点
- 管理后台 COS_BASE 从 `VUE_APP_CLOUDBASE_ENV` 环境变量派生
- `image.wxs` 的 COS_BASE 需要特殊处理（WXS 限制）
