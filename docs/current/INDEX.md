# 川着线上商城 - 当前索引

> 文档定位：当前项目状态、主流程、关键决策与上线前测试建设入口。
> 更新时间：2026-05-11
> 校准方式：以当前代码、云函数路由、数据库迁移和测试环境只读查询为准；历史设计文档仅作参考。

---

## 当前阶段

**上线前稳定性与测试体系建设中。**

项目主业务已经进入上线前验证阶段，当前工作重点从功能扩展切换为：

- 确认商城端、管理后台、小程序管理端的核心业务闭环仍然可用。
- 建立发布前可重复执行的自动化测试集。
- 建立由 AI 执行的核心场景走查清单。
- 将测试环境数据作为可创建、可修改、可清理的测试数据使用。

测试环境：

| 项 | 当前值 |
|----|--------|
| CloudBase 环境 ID | `cloudbase-d3g1zmq7r388144eb` |
| 管理后台静态托管域名 | `cloudbase-d3g1zmq7r388144eb-1427677265.tcloudbaseapp.com` |
| 静态托管 Bucket | `0bdb-static-cloudbase-d3g1zmq7r388144eb-1427677265` |
| MySQL 状态 | 已存在，`READY` |
| MySQL 版本 | 8.0 |
| 自动化测试数据 | 允许创建和修改 |

---

## 事实来源

本次索引更新未继续依赖旧文档结论，主要依据：

- 管理后台路由映射：[request.js](/Users/combo/MyFile/projects/clothing-mall-cloud/clothing-mall-admin/src/utils/request.js)
- 小程序路由映射：[util.js](/Users/combo/MyFile/projects/clothing-mall-cloud/clothing-mall-wx/utils/util.js)
- 云函数目录：[cloudfunctions](/Users/combo/MyFile/projects/clothing-mall-cloud/cloudfunctions)
- 数据库迁移：[docker/db/migration](/Users/combo/MyFile/projects/clothing-mall-cloud/docker/db/migration)
- CloudBase 静态托管查询：管理后台托管域名、Bucket、`index.html` 自动寻址状态
- CloudBase MySQL 只读查询：表结构、订单状态分布、商品状态分布、优惠券类型分布

---

## 当前架构

```
clothing-mall-cloud/
├── cloudfunctions/
│   ├── admin-*              # 管理后台云函数
│   ├── wx-*                 # 商城端云函数
│   ├── wx-manager-*         # 小程序管理端云函数
│   ├── task-*               # 定时任务
│   └── layers/              # layer-base / layer-auth / layer-wechat
├── clothing-mall-admin/     # Vue 2 + Element UI 管理后台，构建后部署到 CloudBase 静态托管
├── clothing-mall-wx/        # 微信小程序商城端 + 小程序管理端
├── docker/db/               # MySQL 初始化与迁移脚本
├── tests/                   # 旧 Python/API/E2E 测试资产
└── docs/test/               # 上线前测试方案与执行清单
```

主要调用方式：

- 管理后台：构建产物部署在 CloudBase 静态托管；`request.js` 将 `/admin/**` 映射为 `app.callFunction({ name, data: { action, data } })`。
- 小程序端：`utils/util.js` 将 `/wx/**` 映射为 `wx.cloud.callFunction({ name, data: { action, data } })`。
- 云函数：统一入口为 `exports.main = async (event, context) => { ... }`，通过 `event.action` 分发。
- 数据库：云开发 MySQL，通过 `layer-base` 的 `db.query` / `db.execute` / `transaction` 访问。
- 静态托管：管理后台默认域名为 `cloudbase-d3g1zmq7r388144eb-1427677265.tcloudbaseapp.com`，站点配置使用 `index.html` 自动寻址。

---

## 主要业务模块

### 商城端

| 模块 | 云函数 | 关键能力 |
|------|--------|----------|
| 首页 | `wx-home` | 首页活动位、专题、FAQ、消息 |
| 商品 | `wx-goods` / `wx-clothing` | 分类、商品列表、详情、SKU、门店 |
| 购物车 | `wx-cart` | 加购、勾选、结算预览 |
| 订单 | `wx-order` | 下单、预支付、取消、退款、确认收货、售后 |
| 优惠券 | `wx-coupon` | 列表、我的券、可用券、领取、兑换、弹窗券 |
| 用户中心 | `wx-user` | 用户资料、地址、收藏、足迹、反馈、角色 |
| 内容与追踪 | `wx-scene` / `wx-tracker` / `wx-ai` | 场景、埋点、AI 识别 |

### 管理后台

| 模块 | 云函数 | 关键能力 |
|------|--------|----------|
| 登录与权限 | `admin-auth` | 登录、管理员、角色、权限、个人中心 |
| 商品 | `admin-goods` / `admin-clothing` | 商品、分类、物流商、门店、导购、场景、节日商品 |
| 订单 | `admin-order` | 订单列表、发货、退款、备货、核销、售后 |
| 营销 | `admin-marketing` | 优惠券、穿搭 |
| 内容 | `admin-content` | 公告、FAQ、关键词、广告、反馈 |
| 配置与统计 | `admin-config` / `admin-stat` / `admin-system` | 平台配置、看板、营收、埋点、日志、地区 |

### 小程序管理端

| 模块 | 云函数 | 关键能力 |
|------|--------|----------|
| 订单处理 | `wx-manager-order` | 待处理订单、发货、退款、备货、核销、售后 |
| 商品上架 | `wx-manager-shelf` | 创建、编辑、上架、下架、批量删除、特价 |
| 内容管理 | `wx-manager-content` | 场景、穿搭、FAQ |
| 营销管理 | `wx-manager-marketing` | 优惠券管理 |
| 节日活动 | `wx-manager-holiday` | 节日活动和关联商品 |
| 系统配置 | `wx-manager-system` | 系统配置读取和更新 |

补充约定：

- 小程序管理端“返回用户端”入口使用 `wx.reLaunch('/pages/index/index')`，并在管理端改动首页可见内容后设置首页刷新标记；首页只在检测到标记时重拉主数据，普通页面返回不强刷。
- 企业微信推送不再作为产品功能保留，相关管理后台入口/API、推送组、小程序管理端页面/API、`admin-wework`、`wx-manager-wework`、`task-push` 和 `layer-wechat/lib/wework.js` 已移除。

---

## 核心业务流程

### 1. 商品上架到商城展示

```
管理后台/小程序管理端创建商品
  -> 写入 litemall_goods，默认 draft 或指定状态
  -> 可写入 gallery / scene_tags / goods_params / special_price
  -> publish 将 status 改为 published
  -> 商城端 wx-goods 仅查询 status = 'published' 且 deleted = 0 的商品
```

关键数据：

- `litemall_goods.status`：`draft` / `pending` / `published`
- `gallery`：字符串字段，代码按 JSON 数组读写
- `scene_tags`、`goods_params`：TEXT，代码按 JSON 内容读写
- `special_price`、`is_special_price`：支持特价商品
- `litemall_category.enable_size`：控制 SKU 尺码选择器展示

### 2. 商城购买流程

```
首页/分类/搜索进入商品详情
  -> 选择 SKU
  -> 加入购物车或立即购买
  -> cart/checkout 计算商品、运费、优惠券
  -> order/submit 创建订单
  -> order/prepay 调起支付或 mock 支付
```

快递订单状态主线：

```
101(未付款)
  -> 201(已付款/待发货)
  -> 301(已发货)
  -> 401(用户确认收货) 或 402(系统自动确认)
```

自提订单状态主线：

```
101(未付款)
  -> 501(备货中)
  -> prepare 生成 pickup_code
  -> 505(已备货/待取件)
  -> verify 核销
  -> 502(已核销)
```

### 3. 订单管理流程

管理后台和小程序管理端均支持：

- 快递订单发货：`201 -> 301`
- 自提订单备货：`501 -> 505`
- 自提订单核销：`505 -> 502`
- 退款申请处理：`202 -> 203` 或回到可处理状态
- 售后审核、拒绝、换货发货、完成

当前数据库测试环境已有订单状态样本：

- 快递：`104`、`401`
- 自提：`501`、`505`、`502`

### 4. 优惠券流程

当前代码定义：

| 类型 | 含义 |
|------|------|
| `0` | 通用券，可领取 |
| `1` | 注册/新人自动发放券 |
| `2` | 兑换券 |
| `3` | 历史新人券保留类型 |
| `4` | 生日券 |

当前数据库测试环境中已有有效类型：

- `type=0` 通用券
- `type=4` 生日券

关键能力：

- `wx-coupon.list` 只展示通用券。
- `wx-coupon.receive` 只允许领取通用券。
- `wx-coupon.exchange` 只允许兑换兑换券。
- `wx-coupon.selectlist` 会做有效期、状态、首单、生日、商品范围、最低消费校验。
- 优惠券支持 `discount_type` 与 `item_limit`，用于固定金额和百分比折扣等场景。

已处理风险：

- [coupon-verify.js](/Users/combo/MyFile/projects/clothing-mall-cloud/cloudfunctions/wx-order/lib/coupon-verify.js) 中生日券校验已统一为 `type=4`，并由发布测试覆盖生日窗口校验。

---

## 上线前测试体系

测试方案入口：

- [release-test-strategy.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/release-test-strategy.md)
- [core-flow-checklist.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/core-flow-checklist.md)
- [automation-plan.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/automation-plan.md)
- [document-status.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/current/document-status.md)

测试分层：

| 层级 | 目标 | 执行方式 |
|------|------|----------|
| 静态契约检查 | 确认前端路由映射到真实云函数 action | Node 脚本扫描 `ROUTE_MAP` 与云函数 `routes` |
| 云函数逻辑测试 | 覆盖订单、商品、优惠券、权限等核心逻辑 | Node 测试，mock DB 或调用测试环境 |
| SQL/数据冒烟 | 确认关键表、字段、枚举和样本数据存在 | CloudBase MCP 只读 SQL |
| 管理后台构建 | 确认管理后台可构建 | `NODE_OPTIONS=--openssl-legacy-provider npm run build` |
| 管理后台云托管冒烟 | 确认静态托管站点和核心后台页面可用 | Playwright 浏览器检查 |
| 云函数冒烟 | 确认已部署云函数入口真实可调用 | CloudBase CLI `fn invoke` |
| 云函数主流程冒烟 | 确认快递/自提真实业务闭环可运行 | CloudBase CLI `fn invoke` + 测试 SQL 清理 |
| 小程序静态冒烟 | 确认小程序配置、页面资产、组件和 API 映射未断裂 | Node 脚本扫描 `app.json`、`project.config.json`、`config/api.js` |
| 小程序交互冒烟 | 确认首页、分类、商品、购物车、订单入口可用 | minium / miniprogram-automator |
| AI 主流程走查 | 由 AI 操作后台和小程序走 P0 闭环 | 记录截图、结果和缺陷 |

---

## 当前测试资产

已有但需要清理和升级：

- `clothing-mall-admin` 已有 `test:unit`、`test:ci`，但主要覆盖 Vue 单测/ lint，不等于发布级业务测试。
- `clothing-mall-wx/minium_tests` 已有小程序冒烟与业务流测试雏形，配置已对齐当前 appid 和项目路径。
- `clothing-mall-wx/e2e` 已有 miniprogram-automator 脚本，项目路径已改为相对当前仓库；部分用例语义仍需后续按当前管理端页面重校准。
- `tests/` 下存在旧 Python API/E2E 测试，其中包含已废弃秒杀/满减用例，需要隔离或淘汰，避免污染上线判断。

---

## 阻塞项与待确认

| 事项 | 状态 | 处理建议 |
|------|------|----------|
| 快递单打印 | 仍依赖硬件 | 上线前只测手动录入物流单号 |
| 生日券下单校验 | 已修复并测试 | `test:coupon` 覆盖 `type=4` 生日窗口 |
| 旧测试用例含废弃模块 | 待清理 | 发布测试套件只纳入新白名单 |
| 小程序 E2E 路径旧值 | 已修正 | 已统一使用当前仓库路径；交互用例语义后续继续重校准 |
| 管理后台个人通知页构建 warning | 已修复并部署 | `profile.js` 已正确导出 `rmNotice`，发布测试入口已通过 |
| 新环境分类 schema 与代码不一致 | 已修复 | 已补 `litemall_category.enabled`，`wx-goods.catalogIndex` 和商品列表真实调用通过 |
| 新环境优惠券 schema 与代码不一致 | 已修复 | 已补 `litemall_coupon.discount_type`、`item_limit`、`popup`，并补一条迁移验证通用券 |
| 新旧环境文档和测试配置混杂 | 已清理当前入口 | `AGENTS.md`、`qa/release` 默认值、当前测试文档已切到 `cloudbase-d3g1zmq7r388144eb`；迁移对照文档保留旧环境列 |
| 协议 HTML 源码归档 | 已完成 | 用户协议和隐私政策均已加入小程序源码；协议页不再依赖云端 HTML 网络请求 |
| 小程序用户隐私保护指引后台配置 | 待确认 | 代码已接入微信隐私授权组件和 `wx.getPrivacySetting`/`wx.openPrivacyContract`；仍需在微信公众平台按实际收集项配置并提交最新版隐私保护指引 |
| 小程序审核临时管理端权限 | 审核临时开启 | 新注册/新静默登录用户 `role` 默认授予 `owner`，便于审核人员访问小程序管理端；审核通过后必须改回 `user` |
| 小程序获取手机号能力 | 暂不可用 | 新小程序审核尚未通过，暂不测试真实手机号授权；相关注册/绑定链路先按待办处理 |
| 项目文档时效性 | 已建立入口 | 已新增 `document-status.md`，当前事实以 `docs/current/INDEX.md` 和 `docs/test/release-test-strategy.md` 为准 |

---

## 下次接续点

当前发布测试稳定入口：

```bash
node qa/release/run-release-tests.js
```

本次迁移排查已验证数据库冒烟、小程序静态冒烟和已部署云函数冒烟；完整发布入口需在小程序审核能力确认后再跑最终轮。

建议下一步：

1. 接入小程序交互冒烟：基于 `clothing-mall-wx/minium_tests` 或 `clothing-mall-wx/e2e`，实际打开小程序页面验证首页、分类、商品详情、购物车、订单入口。
2. 重校准现有 miniprogram-automator 用例语义：`e2e` 项目路径已修正，但部分脚本仍可能引用旧管理端页面或旧选择器。
3. 待小程序交互冒烟稳定后，再做一次 AI 主流程走查：后台发布商品 -> 小程序查看/下单 -> 后台发货或自提备货核销。

---

## 最新记录

- 2026-05-13：修复场景商品误包含饰品与上下架后关联污染问题：`wx-scene.goods`、`wx-goods.list(sceneId)`、管理后台/小程序管理端场景商品列表均过滤分类为“饰品”或关键词含“饰品/首饰”的商品，并用 `COUNT(DISTINCT)` / `GROUP BY MAX(add_time)` 避免历史关联导致计数或展示重复；`admin-goods` 与 `wx-manager-shelf` 在商品创建、编辑、分类变更、重新上架时阻止饰品同步到 `clothing_goods_scene`，并清空饰品 `scene_tags`；场景保存接口对提交商品 ID 去重并过滤饰品。新增迁移 `V1.0.36__exclude_accessories_from_scenes.sql`，当前云环境已清理 6 条饰品场景关联并清空 4 个饰品商品的 `scene_tags`。已部署 `wx-scene`、`wx-goods`、`wx-manager-shelf`、`wx-manager-content`、`admin-clothing`、`admin-goods`，真实调用 `wx-scene.goods(sceneId=2)` 与 `wx-goods.list(sceneId=2)` 返回 6 个非饰品商品，饰品关联只读复核为空。
- 2026-05-13：完成微信支付真实接入前准备：`wx-order` 接入 `wx-server-sdk` 并在真实支付分支调用 `cloud.cloudPay.unifiedOrder` 前检查云支付能力、订单金额和 OpenID；新增鉴权接口 `wx-order.payStatus` 用于上线前检查 `MOCK_PAY`、环境 ID、SDK、CloudPay 能力和数据库连通性。`wx-pay-callback` 已增强为按 `order_sn` 幂等处理支付回调，校验订单仍为待支付状态并核对回调金额后再更新为快递待发货或自提备货中，避免重复回调和金额不一致导致误改订单。已新增对接清单 [wechat-pay-readiness.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/current/wechat-pay-readiness.md)，并部署 `wx-order`、`wx-pay-callback`；当前云端 `payStatus` 返回 `mockPay=true/sdkLoaded=true/cloudPayAvailable=true/readyForRealPay=false`，需要客户完成商户号、JSAPI/小程序支付、AppID 绑定和 CloudBase 支付配置后，再将 `wx-order` 环境变量 `MOCK_PAY=false` 并做 1 分钱闭环测试。
- 2026-05-13：创建生日券模板但暂不启用：新增 `litemall_coupon.id=3`「生日专属七折券」，`type=4/status=0/popup=0/discount_type=1/discount=30/min=0/limit=1/days=30`，含义为生日专属七折、领取后 30 天有效；系统配置保持关闭 `litemall_birthday_coupon_coupon_status=0`，并保留 `litemall_birthday_coupon_id=3`、`litemall_birthday_coupon_days=30` 供后续启用。当前首页弹窗 `wx-coupon.popup` 只返回 `type=0/type=3` 且 `popup=1` 的券，因此不会弹生日券；后续如要做生日惊喜弹窗，应在首页弹窗接口中增加生日当天、未领取/未使用、有效期等后端校验后再返回。
- 2026-05-13：优化优惠券“去使用”落点：我的优惠券列表、登录后生日券提示、个人资料生日券提示中的“去使用”统一从首页改为跳转到分类 tab，减少领券后再找商品的路径。当前优惠券列表未透传具体适用商品/分类，后续如需要可按券适用范围进一步跳到指定分类或商品集合页。相关 JS 语法检查与小程序静态冒烟通过。
- 2026-05-13：修复小程序商品卡片与搜索页体验问题：场景商品陈列页商品图改为固定比例裁切，商品名称统一最多两行并预留两行高度；共享商品卡片名称行高改为固定 `36rpx`，与分类/搜索页的两行占位规则保持一致。搜索页拆分默认关键词与占位文本，默认占位兜底为“搜索商品”，避免新用户/无历史搜索时出现 `[object object]`；空搜索仍只使用后端返回的真实默认关键词，不会把占位文案当作搜索词。`node --check clothing-mall-wx/pages/search/search.js` 与小程序静态冒烟通过。
- 2026-05-11：迁移后排查现环境 `cloudbase-d3g1zmq7r388144eb`。MCP 绑定、MySQL、静态托管、37 个云函数、3 个层和 5 个定时触发器均存在；静态托管首页、商品图片、协议 HTML 可访问；`admin-auth.login`、`wx-home.homeIndex`、`wx-region.list`、`task-push.scheduledPush` 真实调用成功。
- 2026-05-11：修复新环境分类 schema：补齐 `litemall_category.enabled`，同步 `V1.0.33__category_enabled.sql` 与初始化 SQL；`wx-goods.catalogIndex`、`wx-goods.list` 真实调用通过。
- 2026-05-11：修复新环境优惠券 schema：补齐 `litemall_coupon.discount_type`、`item_limit`、`popup`，新增 `V1.0.34__coupon_popup.sql`，同步初始化 SQL；补一条迁移验证通用券后 `db-smoke` 和 `wx-coupon.list` 通过。
- 2026-05-11：按当前迁移边界更新待确认项：新小程序暂无获取手机号能力。
- 2026-05-12：按产品取舍移除企业微信推送功能，清理管理后台推送入口/推送组、小程序管理端推送页和相关云函数代码；首页刷新改为由管理端内容变更标记触发，普通返回不强刷。
- 2026-05-12：调整“我的”页合规与账号信息架构：新增“账号与隐私”二级页，集中放置个人信息、用户协议、商家隐私政策和微信官方“小程序隐私保护指引”；收货地址作为高频交易工具保留在“我的”页一级入口，登录/注册授权场景仍保留协议直达入口。
- 2026-05-12：修复小程序管理端商品上架体验问题：商品详情尺码对照表跟随分类尺码开关隐藏；小程序管理端创建/编辑商品时按已选场景标签同步 `clothing_goods_scene` 关联，场景管理可直接看到关联商品。
- 2026-05-12：修复小程序管理端商品上架后场景页不展示的问题：`wx-manager-shelf.syncSceneTags` 兼容事务连接 `conn.query()` 返回的 `[rows, fields]` 结构，`publish` 会按商品 `scene_tags` 补同步 `clothing_goods_scene`；`wx-scene` 与 `wx-manager-content` 读取场景商品时过滤无效关联。已回填当前云环境 20 个有场景标签商品的关联数据，重建 28 条有效关联，并部署 `wx-manager-shelf`、`wx-scene`、`wx-manager-content`。
- 2026-05-12：修复协议页体验问题：用户协议改为本地内容渲染，不再依赖云端 HTML；协议页正文滚动区按状态栏和自定义导航高度动态下移，避免标题遮挡正文。
- 2026-05-12：校准并实测小程序管理端商品上架 AI 识别图片链路：主图继续按原图上传和保存，选择主图时另行生成并上传 `ai/` 目录压缩图，AI 识别优先使用该压缩图；样本原图 `432KB/1440x1922` 压缩到 `48KB/575x768`，极小图 `8KB/239x320`。线上 `wx-ai.recognizeImage` 对压缩图和极小图均在约 `30s` 被 `layer-wechat/lib/ai.js` 的 ARK fetch 超时中止，说明当前慢点主要在火山 ARK 视觉接口/模型配置或云函数到 ARK 网络段，不在小程序压缩上传链路。
- 2026-05-12：同一样本用本机 `mmx-cli vision describe` 测 MiniMax VLM：原图 `15.62s` 成功，压缩图三次分别 `8.51s`、`9.55s`、`8.56s` 成功，极小图 `8.35s` 成功；压缩图延时约为原图的 `55%-61%`，识别可用但名称/分类比原图略有波动。
- 2026-05-12：`wx-ai.recognizeImage` 接入 MiniMax VLM provider，并将 `litemall_ai_provider` 切换为 `minimax`；`wx-ai.status` 返回 `enabled=true/provider=minimax`。同一压缩图经云函数真实调用成功，Duration `8984ms`，返回 `provider=minimax/isMock=false`；火山 ARK 逻辑保留为 provider 回退。临时测试图已删除。
- 2026-05-13：`wx-ai.recognizeTag` 吊牌识别改为 MiniMax VLM 优先，继续保留火山 ARK 作为失败回退；MiniMax 吊牌 prompt 要求优先读取吊牌文字并返回 `name/price/category/color/brand/confidence/provider/isMock`，其中 `price` 会规范为纯数字字符串。已部署 `wx-ai`，云端 `status` 调用返回 `enabled=true/provider=minimax`，函数更新时间 `2026-05-13 16:53:17`。
- 2026-05-13：上线初期启用首页弹窗领取型首单券：新增 `litemall_coupon.id=2`「首单立减20元」，`type=3/status=0/popup=1/discount=20/min=0/limit=1/days=30`；`wx-coupon.popup` 返回通用券与 `type=3` 新人首单券，并按用户已领取记录排除，领取后不再弹。`wx-coupon.receive` 支持领取 `type=3`，`wx-coupon.selectlist`、`wx-cart.checkout`、`wx-order.submit` 均补齐 `type=1/type=3` 首单校验。已部署 `wx-coupon`、`wx-cart`、`wx-order`，云端 `wx-coupon.popup` 真实调用返回该券。
- 2026-05-11：清理当前测试入口旧环境默认值：`AGENTS.md`、`qa/release/*.js`、`clothing-mall-admin/e2e/smoke.spec.js` 和 `docs/test/*` 已对齐 `cloudbase-d3g1zmq7r388144eb`；迁移对照文档保留旧环境列并补齐新静态托管域名。
- 2026-05-11：整理项目文档入口和时效状态：重写 `docs/README.md`、`docs/test/README.md`、`docs/guides/开发环境指南.md`，将阿里云部署和云开发迁移大文档标为历史参考，新增 `docs/current/document-status.md`。
- 2026-05-11：修复小程序用户协议/隐私政策实现缺口：新增微信隐私授权弹窗和全局兜底，隐私政策入口优先打开官方 `wx.openPrivacyContract`；手机号登录/注册/重置、个人资料、头像、生日、收货地址、反馈、售后凭证和管理端图片上传均在提交或调用隐私接口前执行 `ensurePrivacyAuthorized`。待确认项：微信公众平台“用户隐私保护指引”配置内容和协议 HTML 源码归档。
- 2026-05-11：将云存储中当前可访问的隐私政策 HTML 加入小程序源码，`/pages/agreement/agreement?type=privacy` 优先渲染本地 `privacy-policy.js` 内容，不再依赖网络请求加载隐私政策；用户协议 HTML 仍按原云存储地址加载。
- 2026-05-11：为小程序 1.0.3 审核临时放开管理端访问：`wx-auth` 新建用户路径写入 `role='owner'`，当前云环境 `litemall_user.role` 默认值改为 `owner`，并新增 `V1.0.35__temporary_owner_default_for_review.sql`；未批量更新现有用户。审核通过后需反向改回 `user` 并重新部署 `wx-auth`。
- 2026-05-04：重新校准当前索引，以代码、云函数路由、数据库结构和测试环境查询结果为准；新增上线前测试体系入口。
- 2026-05-04：确认测试环境使用 `clo-test-4g8ukdond34672de`，自动化测试允许创建和修改测试数据。
- 2026-05-04：确认 P0 测试主线为商品上架、商城下单、快递履约、自提备货核销、优惠券、管理端订单处理。
- 2026-05-04：落地第一版发布测试入口 `node qa/release/run-release-tests.js`，覆盖路由契约、数据库冒烟、生日券校验、自提备货核销、商品生命周期、快递订单履约逻辑；补齐 6 个小程序路由契约断点并部署 `wx-auth`、`wx-clothing`、`wx-order`。
- 2026-05-04：接入已部署云函数真实冒烟 `qa/release/cloudfunction-smoke.js`，覆盖首页、商品列表/详情、优惠券、地区和购物车/订单/小程序管理端鉴权屏障；完整发布测试入口已通过。
- 2026-05-05：接入已部署云函数主流程冒烟 `qa/release/cloudfunction-flow-smoke.js`，真实创建临时测试用户和订单，覆盖快递 `201 -> 301 -> 401` 与自提 `501 -> 505 -> 502`；成功后自动清理本轮测试数据，完整发布测试入口已通过。
- 2026-05-05：确认管理后台是 CloudBase 静态托管站点，默认域名 `clo-test-4g8ukdond34672de-1258700476.tcloudbaseapp.com`，通过 CloudBase JS SDK 调用 `admin-*` 云函数；后续后台测试应以云托管前端 + 云函数为当前事实。
- 2026-05-05：接入管理后台构建门禁 `qa/release/admin-build.js` 与云托管浏览器冒烟 `qa/release/admin-hosting-smoke.js`，覆盖真实登录、Dashboard、商品列表、订单列表；修复登录页无用验证码预取导致的 CloudBase 初始化控制台错误，并已重新部署静态托管；完整发布测试入口已通过。
- 2026-05-05：修复管理后台个人通知页 `rmNotice` 导出拼写错误，消除对应构建 warning；已重新构建并部署 CloudBase 静态托管，后台云托管冒烟与完整发布测试入口均已通过。
- 2026-05-05：接入小程序静态冒烟 `qa/release/miniprogram-static-smoke.js`，覆盖 appid/env、Minium 配置、49 个注册页面、11 个全局组件、152 个 API 导出到云函数路由映射和 E2E 项目路径；完整发布测试入口已通过。

---

*维护说明：此文件只记录当前事实和入口。历史设计过程、旧阶段任务和过期结论不再放入本索引。*
