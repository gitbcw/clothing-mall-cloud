# 上线前测试策略

> 更新时间：2026-05-11
> 目标：建立 AI 可执行、发布前可重复运行的测试体系，保障核心业务流程可用。

---

## 测试原则

1. 价值优先：优先覆盖直接影响成交、履约、资金、商品展示的流程。
2. 自动化优先：能用脚本稳定验证的，不依赖人工目测。
3. 主流程必须走通：自动化测试之外，发布前必须由 AI 操作后台和小程序走查 P0 闭环。
4. 测试数据可变更：当前环境为测试环境，允许自动化创建、修改、清理测试商品、订单、优惠券。
5. 白名单发布：旧测试里包含废弃秒杀、满减等模块，不进入发布门禁。

---

## 测试环境

| 项 | 值 |
|----|----|
| CloudBase 环境 | `cloudbase-d3g1zmq7r388144eb` |
| MySQL | `READY`，MySQL 8.0 |
| 管理后台 | `clothing-mall-admin`，Vue 2 + Element UI |
| 小程序 | `clothing-mall-wx` |
| 云函数 | `cloudfunctions` |

---

## 发布门禁

发布前必须通过以下检查：

| 层级 | 必须通过 | 说明 |
|------|----------|------|
| 静态契约 | 是 | 前端 `ROUTE_MAP` 中每个路由都能映射到存在的云函数 action |
| 云函数逻辑 | 是 | 商品、订单、优惠券、权限 P0 逻辑测试通过 |
| 数据库冒烟 | 是 | 关键表和字段存在，状态枚举与代码一致 |
| 管理后台构建 | 是 | `NODE_OPTIONS=--openssl-legacy-provider npm run build` 成功 |
| 管理后台云托管冒烟 | 是 | 静态托管站点可打开，真实登录和核心页面可渲染 |
| 已部署云函数冒烟 | 是 | 真实调用测试环境云函数，确认公开入口和鉴权屏障可用 |
| 已部署主流程冒烟 | 是 | 真实创建测试用户/订单，验证快递和自提履约状态流转 |
| 商城端冒烟 | 是 | 首页、分类、商品详情、购物车、订单入口可用 |
| 核心流程走查 | 是 | P0 流程由 AI 实操验证并记录结果 |

---

## 测试分层

### 1. 静态契约测试

目标：在不启动前端、不调用云端的情况下，快速发现路由断裂。

覆盖：

- [request.js](/Users/combo/MyFile/projects/clothing-mall-cloud/clothing-mall-admin/src/utils/request.js) 中管理后台路由。
- [util.js](/Users/combo/MyFile/projects/clothing-mall-cloud/clothing-mall-wx/utils/util.js) 中小程序路由。
- `cloudfunctions/*/index.js` 中真实 `routes` 或 action 分发。

失败示例：

- 前端有 `manager/holiday/read`，但云函数没有 `holidayRead`。
- 云函数 action 改名，前端映射没同步。
- 管理后台使用了已删除的接口。

### 2. 云函数逻辑测试

目标：覆盖核心业务规则，不依赖完整 UI。

P0 覆盖：

- 商品：创建、编辑、上架、下架、特价、JSON 字段合法性。
- 订单：快递发货、自提备货、自提核销、退款、取消。
- 优惠券：通用券领取、兑换券兑换、新人/注册券首单校验、生日券校验、折扣计算。
- 权限：未登录、普通用户、管理角色访问管理端接口。

### 3. 数据库冒烟测试

目标：确认云端测试库能支撑主流程。

检查：

- `litemall_goods`、`clothing_goods_sku`、`litemall_order`、`litemall_order_goods`、`litemall_coupon`、`litemall_coupon_user`、`clothing_store`、`litemall_shipper` 存在。
- `litemall_order` 包含 `delivery_type`、`pickup_code`、`pickup_store_id`、`ship_sn`、`ship_channel`。
- `litemall_coupon` 包含 `discount_type`、`item_limit`、`popup`。
- `litemall_goods` 包含 `status`、`gallery`、`scene_tags`、`goods_params`、`special_price`。

### 4. 已部署云函数冒烟测试

目标：确认测试环境中已部署的云函数入口真实可调用。

当前脚本：[cloudfunction-smoke.js](/Users/combo/MyFile/projects/clothing-mall-cloud/qa/release/cloudfunction-smoke.js)。

覆盖：

- 商城公开入口：首页、商品列表、商品详情、优惠券列表、地区列表。
- 鉴权屏障：购物车、订单、小程序管理端订单、小程序管理端上架。

失败示例：

- 云函数未部署或层缺失，导致 `InvokeResult != 0`。
- 入口 action 不存在，返回 `404`。
- 内部异常，返回 `502`。
- 需登录入口未拦截或返回异常错误码。

### 5. 已部署云函数主流程冒烟测试

目标：确认测试环境中真实业务闭环可运行。

当前脚本：[cloudfunction-flow-smoke.js](/Users/combo/MyFile/projects/clothing-mall-cloud/qa/release/cloudfunction-flow-smoke.js)。

覆盖：

- 快递订单：商品、地址、购物车、结算、下单、mock 支付、管理端发货、用户确认收货。
- 自提订单：商品、地址、购物车、结算、下单、mock 支付、管理端备货、取件码核销。
- 认证和权限：普通用户、临时 owner 管理用户。
- 数据清理：成功后清理本轮测试数据，失败时保留现场。

失败示例：

- 认证无法通过 `event.userInfo.openId` 建立用户。
- 下单要求地址、购物车、门店或物流基础数据缺失。
- mock 支付后状态未进入 `201` 或 `501`。
- 管理端发货、备货、核销权限或状态判断异常。

### 6. 管理后台构建与云托管冒烟

目标：确认管理后台可发布，且 CloudBase 静态托管上的真实站点可操作。

当前脚本：

- [admin-build.js](/Users/combo/MyFile/projects/clothing-mall-cloud/qa/release/admin-build.js)
- [admin-hosting-smoke.js](/Users/combo/MyFile/projects/clothing-mall-cloud/qa/release/admin-hosting-smoke.js)

覆盖：

- 本地生产构建生成 `dist/`。
- 云端登录页渲染。
- `admin123 / admin123` 真实登录。
- Dashboard、商品列表、订单列表渲染。
- 静态资源和页面运行时无关键错误。

已修复：

- 登录页无用验证码预取会在 CloudBase 匿名登录完成前调用 `admin-auth.kaptcha`，导致控制台初始化错误；当前已停止预取并重新部署静态托管。

待跟进：

- `profile/notice.vue` 构建 warning：引用了未导出的 `rmNotice`。

### 7. UI 冒烟测试

目标：确认主要页面不是空白、核心入口可见、基础交互可操作。

管理后台：

- 登录页可打开。
- 商品列表可加载。
- 订单列表可加载。
- 优惠券管理可加载。
- 管理后台能完成生产构建。

小程序：

- 首页有商品或活动位。
- 分类页可加载商品。
- 商品详情展示价格、图片、SKU。
- 购物车可进入。
- 用户中心订单入口可见。

### 8. 核心流程走查

目标：从用户视角确认真实业务闭环。

详见 [core-flow-checklist.md](/Users/combo/MyFile/projects/clothing-mall-cloud/docs/test/core-flow-checklist.md)。

---

## 发布测试结果记录

每次上线前建议输出一份执行记录：

```text
docs/test/reports/release-check-YYYY-MM-DD.md
```

记录内容：

- 测试环境和代码版本。
- 自动化命令结果。
- AI 走查流程结果。
- 新建/修改的测试数据。
- 发现的问题、优先级、是否阻塞上线。

---

## 当前已知风险

| 风险 | 影响 | 处理 |
|------|------|------|
| `wx-order/lib/coupon-verify.js` 中生日券校验曾按 `type=2` 判断 | 生日券可能在下单时无法正确使用 | 已补 `test:coupon` 并修正为 `type=4` |
| 旧 `tests/` 包含秒杀、满减等废弃模块 | 直接全量运行会产生误报 | 建发布测试白名单 |
| 小程序部分 E2E 脚本路径指向旧目录 | 自动化无法稳定运行 | 统一项目路径和端口配置 |
| 当前测试命令分散 | 发布前容易漏跑 | 第一版 `node qa/release/run-release-tests.js` 已落地 |

当前 `node qa/release/run-release-tests.js` 已覆盖：

- 管理后台和小程序路由契约。
- CloudBase MySQL 关键表、字段和基础数据冒烟。
- 管理后台生产构建。
- CloudBase 静态托管管理后台真实登录和核心页面冒烟。
- 已部署 CloudBase 云函数真实调用冒烟。
- 已部署 CloudBase 云函数快递/自提主流程冒烟。
- 生日券 `type=4` 下单校验。
- 自提备货与核销服务层逻辑。
- 商品创建、JSON 字段、上架、下架、特价服务层逻辑。
- 快递订单发货和确认收货服务层逻辑。
