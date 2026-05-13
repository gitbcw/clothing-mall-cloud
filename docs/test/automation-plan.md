# 自动化测试落地计划

> 更新时间：2026-05-05
> 目标：把发布前必须执行的基础测试收敛为一组稳定命令。

---

## 目标命令

最终建议形成：

```bash
npm run test:release
```

等价执行：

```bash
npm run test:contracts
npm run test:miniprogram-static-smoke
npm run test:db-smoke
npm run test:admin-build
npm run test:admin-hosting-smoke
npm run test:cloud-smoke
npm run test:flow-smoke
npm run test:coupon
npm run test:pickup
```

当前已落地的第一版 `test:release` 已包含路由契约、小程序静态冒烟、数据库冒烟、管理后台生产构建、管理后台云托管浏览器冒烟、已部署云函数入口冒烟、已部署云函数主流程冒烟、优惠券逻辑、自提订单逻辑、商品生命周期逻辑、快递订单履约逻辑。由于根目录 `package.json` 被 `.gitignore` 忽略，稳定入口以 `node qa/release/run-release-tests.js` 为准；本地 `npm run test:release` 也已同步可用。

---

## 第一阶段：建立发布测试白名单

目标：避免旧测试误报污染上线判断。

任务：

- 新建 `qa/release/`。
- 只纳入当前业务仍存在的模块：
  - 商品
  - 购物车
  - 订单
  - 优惠券
  - 用户/权限
  - 小程序管理端订单和上架
- 明确排除废弃模块：
  - 秒杀
  - 满减
  - 会员等级
  - 团购

已产出：

- `qa/release/README.md`
- `qa/release/run-release-tests.js`
- `qa/release/route-contract.js`
- `qa/release/miniprogram-static-smoke.js`
- `qa/release/db-smoke.js`
- `qa/release/admin-build.js`
- `qa/release/admin-hosting-smoke.js`
- `qa/release/cloudfunction-smoke.js`
- `qa/release/cloudfunction-flow-smoke.js`
- `qa/release/cloudfunctions/coupon-verify.test.js`
- `qa/release/cloudfunctions/pickup-order.test.js`
- `qa/release/cloudfunctions/goods-lifecycle.test.js`
- `qa/release/cloudfunctions/express-order.test.js`

---

## 第二阶段：静态契约测试

目标：最快发现前端路由和云函数 action 不一致。

建议脚本：

```text
qa/release/route-contract.js
```

检查逻辑：

- 从 `clothing-mall-admin/src/utils/request.js` 提取 `ROUTE_MAP`。
- 从 `clothing-mall-wx/utils/util.js` 提取 `ROUTE_MAP`。
- 从 `cloudfunctions/*/index.js` 提取 `routes` key。
- 对比每个 `[functionName, action]` 是否存在。

通过标准：

- 所有前端路由都有云函数。
- 所有 action 都能在目标云函数入口找到。
- 输出未覆盖或失配清单。

---

## 第三阶段：云函数逻辑测试

目标：覆盖 P0 业务规则。

建议目录：

```text
qa/release/cloudfunctions/
├── order-pickup.test.js
├── coupon.test.js
├── goods.test.js
├── order-express.test.js
└── auth.test.js
```

优先用例：

| 文件 | 用例 |
|------|------|
| `pickup-order.test.js` | 已落地：自提订单 `501 -> 505 -> 502`，错误取件码失败 |
| `coupon-verify.test.js` | 已落地：生日券 `type=4` 生日窗口校验、百分比折扣 |
| `goods-lifecycle.test.js` | 已落地：商品创建 JSON 字段、上架、下架、特价 |
| `express-order.test.js` | 已落地：快递订单发货 `201 -> 301`，确认收货 `301 -> 401` |
| `auth.test.js` | 未登录、普通用户、管理员权限 |

执行策略：

- 对纯逻辑函数优先 mock DB。
- 对必须验证真实 SQL 的流程，使用测试环境创建带 `AI_TEST_` 前缀的数据。
- 每个测试记录创建的 `goodsId/orderId/couponId`，用于清理或复查。

---

## 第四阶段：小程序静态冒烟

目标：在不依赖微信开发者工具的前提下，先把小程序端最容易断的配置和页面资产纳入发布门禁。

脚本：

```text
qa/release/miniprogram-static-smoke.js
```

当前覆盖：

- `project.config.json` 的 `compileType`、appid 和 CloudBase env。
- `minium_tests/config.json` 的项目路径与 appid 是否和当前项目一致。
- `app.json` 注册页面是否都存在 `.js` / `.wxml` / `.json`，且页面 JSON 可解析。
- P0 页面是否仍注册：首页、分类、商品详情、购物车、确认订单、订单、我的、管理端订单/上架/订单详情。
- 自定义 TabBar 文件是否齐全。
- 全局组件引用是否有对应实现文件。
- `config/api.js` 导出的 URL 是否都能被 `utils/util.js` 的 `ROUTE_MAP` 接管到云函数。
- `e2e` 脚本是否还指向旧项目目录。

通过标准：

- 上述配置、页面、组件和 API 映射全部存在。
- 不要求启动微信开发者工具；真正的页面交互 E2E 作为下一层测试单独接入。

---

## 第五阶段：数据库冒烟

目标：确认测试环境可运行主流程。

建议脚本：

```text
qa/release/db-smoke.js
```

检查：

- 关键表存在。
- 关键字段存在。
- 商品状态中存在 `published`。
- 订单状态枚举未出现未知状态。
- 优惠券字段支持 `discount_type`、`item_limit`、`popup`。

注意：

- 默认只读。
- 如需创建测试数据，必须使用 `AI_TEST_` 前缀。

---

## 第六阶段：已部署云函数真实冒烟

目标：确认发布环境中的云函数入口真实可调用，不只停留在本地 mock。

脚本：

```text
qa/release/cloudfunction-smoke.js
```

当前覆盖：

- `wx-home.homeIndex` 首页公开入口。
- `wx-goods.list` 商品列表公开入口。
- `wx-goods.detail` 商品详情公开入口。
- `wx-coupon.list` 优惠券公开入口。
- `wx-region.list` 地区公开入口。
- `wx-cart.index`、`wx-order.list`、`wx-manager-order.stats`、`wx-manager-shelf.list` 未登录鉴权屏障。

通过标准：

- CloudBase CLI 调用退出码为 0。
- `InvokeResult = 0`。
- 公开入口返回 `errno = 0` 且关键数据结构存在。
- 需登录入口返回 `errno = 501` 或 `506`，不能出现 `404` 或 `502`。

## 第七阶段：已部署云函数主流程冒烟

目标：确认真实云函数、认证、数据库写入和订单状态流转能串成最小业务闭环。

脚本：

```text
qa/release/cloudfunction-flow-smoke.js
```

当前覆盖：

- 测试用户登录：通过 `event.userInfo.openId` 触发 `wx-auth` 自动建用户。
- 管理端身份：创建测试管理用户并临时设置 `role = owner`。
- 商品选择：读取当前已发布商品。
- 地址：调用 `wx-user.addressSave` 创建临时默认地址。
- 快递链路：`wx-cart.fastadd -> wx-cart.checkout -> wx-order.submit -> wx-order.prepay -> wx-manager-order.ship -> wx-order.confirm`。
- 自提链路：`wx-cart.fastadd -> wx-cart.checkout -> wx-order.submit -> wx-order.prepay -> wx-manager-order.prepare -> wx-manager-order.verify`。
- 数据清理：成功后标记本轮测试用户、地址、购物车、订单和订单商品为 `deleted = 1`；失败时保留现场便于排查。

通过标准：

- 快递订单状态依次到达 `201 -> 301 -> 401`。
- 自提订单状态依次到达 `501 -> 505 -> 502`。
- 管理端发货写入物流单号。
- 自提备货生成 6 位取件码，核销必须使用该取件码。

---

## 第八阶段：管理后台构建

脚本：

```text
qa/release/admin-build.js
```

等价命令：

```bash
cd clothing-mall-admin
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

通过标准：

- 构建退出码为 0。
- `dist/` 产物生成。

---

## 第八阶段：管理后台云托管冒烟

目标：确认 CloudBase 静态托管上的管理后台真实可用，不只停留在本地构建。

脚本：

```text
qa/release/admin-hosting-smoke.js
```

当前覆盖：

- 访问 `https://cloudbase-d3g1zmq7r388144eb-1427677265.tcloudbaseapp.com`。
- 登录页可渲染，用户名、密码和登录按钮存在。
- 使用 `admin123 / admin123` 真实登录。
- Dashboard 可渲染。
- 商品列表路由 `/goods/list` 可渲染。
- 订单列表路由 `/order/order` 可渲染。
- 静态 JS/CSS/API 关键请求无失败，页面无关键 console/page error。

已修复：

- 登录页曾在验证码 UI 已禁用的情况下仍预取 `auth/kaptcha`，且可能抢在 CloudBase 匿名登录完成前调用云函数，导致控制台 `Cannot read properties of null (reading 'scope')`。现已停止初始化预取验证码，并重新构建部署到静态托管。

待跟进：

- 构建仍提示 `profile/notice.vue` 引用未导出的 `rmNotice`，不影响本轮云托管冒烟，但个人通知页相关流程需后续修正或覆盖测试。

---

## 第九阶段：小程序冒烟

现有资产：

- `clothing-mall-wx/minium_tests/round1_smoke`
- `clothing-mall-wx/minium_tests/round2_flow`
- `clothing-mall-wx/e2e`

需要先做：

- 修正旧项目路径。
- 统一微信开发者工具服务端口配置。
- 将不稳定的纯 UI 断言降级为冒烟断言。

发布前最小冒烟：

- 首页可加载。
- 分类页可加载。
- 商品详情可加载。
- SKU 选择器可打开。
- 购物车可进入。
- 用户中心订单入口存在。

---

## 推荐执行顺序

1. 静态契约测试。
2. 数据库冒烟。
3. 管理后台构建。
4. 管理后台云托管冒烟。
5. 已部署云函数入口冒烟。
6. 已部署云函数主流程冒烟。
7. 云函数逻辑测试。
8. 小程序冒烟。
9. AI 手动走查 P0 流程。

原因：

- 前三步最快暴露接口和数据问题。
- 构建验证前端发布可行性。
- 小程序和 AI 走查成本最高，放在基础问题修完后执行。

---

## 近期优先任务

- [x] 建立 `qa/release` 白名单目录。
- [x] 实现 admin/wx 路由契约检查。
- [x] 实现数据库冒烟检查。
- [x] 接入管理后台构建测试。
- [x] 接入管理后台云托管冒烟。
- [x] 接入已部署云函数真实冒烟。
- [x] 接入已部署云函数主流程冒烟。
- [x] 为优惠券生日券 `type=4` 写失败复现测试。
- [x] 修复生日券 `type=4` 下单校验并部署 `wx-order`。
- [x] 为自提 `501 -> 505 -> 502` 写云函数测试。
- [ ] 修正小程序 E2E 脚本旧路径。
- [x] 接入商品上架逻辑测试。
- [x] 接入快递订单履约逻辑测试。
- [x] 串联发布测试入口。
