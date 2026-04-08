# 小程序店主管理后台 - 需求记录

> 来源：`docs/superpowers/specs/2026-03-27-owner-manager-design.md`
> 日期：2026-03-27

## 概述

增强小程序 `pages/manager/` 模块，为**店主(owner)**提供订单管理 + 商品管理能力。

---

## A. 订单管理

### A1. 订单列表页（改造 `pages/manager/order/`）

- 3 个 Tab：待处理 / 售后中 / 已完成
- 各 Tab 显示数量角标
- 下拉刷新 + 上拉加载
- 订单卡片：订单号、收货人、金额、状态标签、操作按钮

**Tab 与状态码映射：**

| Tab | 包含状态码 | 说明 |
|-----|-----------|------|
| 待处理 | 201(已付款), 150(待确认), 501(待核销) | 需店主操作的订单 |
| 售后中 | 202(退款中) | 退款申请 |
| 已完成 | 301(已发货), 401(已收货), 402(自动确认), 502(已核销), 102/103/104(已取消) | 历史订单 |

**不展示 101(待付款)** — 店主无需操作。

### A2. 订单详情页（改造 `pages/manager/orderDetail/`）

- 展示：订单号、状态、收货人、商品列表、支付信息
- 根据状态显示操作按钮：

| 状态 | 操作 |
|------|------|
| 201 已付款 | 发货、取消 |
| 150 待确认 | 确认、取消 |
| 501 待核销 | 核销（验证取货码） |
| 202 退款中 | 同意退款、拒绝退款 |

### A3. 售后处理页（新增 `pages/manager/aftersale/`）

- 退款信息：金额、原因、申请时间
- 关联商品
- 操作：同意退款（触发微信退款）/ 拒绝退款（需填原因）

### A4. 后端 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/wx/manager/order/list` | GET | status=pending/aftersale/completed，返回分页列表 + 各 tab 数量 |
| `/wx/manager/order/refundAgree` | POST | 同意退款：202→203，调用微信退款，释放库存 |
| `/wx/manager/order/refundReject` | POST | 拒绝退款：202→原状态，参数：orderId, reason |
| `/wx/manager/order/verify` | POST | 核销：501→502，参数：orderId, pickupCode |
| `/wx/manager/order/detail` | GET | 已有，保留 |
| `/wx/manager/order/ship` | POST | 已有，保留 |
| `/wx/manager/order/confirm` | POST | 已有，保留 |
| `/wx/manager/order/cancel` | POST | 已有，保留 |

### A5. 权限变更

两个 Controller 的 `checkManager()` 从 owner+guide → 仅 owner。

---

## B. 商品管理

### B1. 商品列表页（新增 `pages/manager/goods/`）

- Tab：全部 / 草稿(draft) / 待上架(pending) / 已上架(published+is_on_sale=true)
- 商品卡片：图、名称、价格、状态标签
- 长按多选 → 底部操作栏（上架/下架/删除）
- 底部：拍照添加按钮

### B2. 商品编辑页（新增 `pages/manager/goodsEdit/`）

- 表单：名称、简介、分类、品牌、原价、零售价
- SKU 管理：颜色/尺码/价格/库存
- 图片管理：主图 + gallery
- 操作：保存草稿 / 提交上架

### B3. 草稿箱（改造 `pages/manager/draftList/`）

- 增加编辑按钮 → 跳转 goodsEdit
- 增加上架按钮 → 调用 publish API
- 增加删除按钮

### B4. 状态流转（与管理后台共享字段）

```
拍照上传 → draft(草稿) → 编辑完善 → pending(待上架) → 上架 → published(is_on_sale=true) → 下架 → published(is_on_sale=false)
```

### B5. 后端 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/wx/manager/goods/list` | GET | status=all/draft/pending/on_sale，返回分页列表 + 各 tab 数量 |
| `/wx/manager/goods/detail` | GET | 商品详情含 SKU、属性、规格 |
| `/wx/manager/goods/edit` | POST | 编辑商品信息 |
| `/wx/manager/goods/publish` | POST | 上架，支持 id 或 ids(批量) |
| `/wx/manager/goods/unpublish` | POST | 下架 |
| `/wx/manager/goods/batchDelete` | POST | 批量软删除 |
| `/wx/manager/goods/create` | POST | 已有，保留 |
| `/wx/manager/goods/unpublishAll` | POST | 已有，保留 |

---

## C. 管理后台首页（改造 `pages/manager/index/`）

- 数据卡片：待处理订单数、售后中数、待上架商品数
- 入口：订单管理、商品管理
- 最近订单：最近 5 条待处理订单
- API：`GET /wx/manager/stats`

---

## D. 改动文件清单

### 后端

| 文件 | 改动类型 |
|------|---------|
| `WxManagerOrderController.java` | 新增 list、refundAgree、refundReject、verify；改 checkManager |
| `WxManagerGoodsController.java` | 新增 list、detail、edit、publish、unpublish、batchDelete；改 checkManager |

> Service 层：复用现有 `LitemallOrderService`、`LitemallGoodsService`，无需新增方法。

### 前端

| 文件/目录 | 改动类型 |
|-----------|---------|
| `pages/manager/index/` | 改造 |
| `pages/manager/order/` | 改造 |
| `pages/manager/orderDetail/` | 改造 |
| `pages/manager/draftList/` | 改造 |
| `pages/manager/goods/` | 新增 |
| `pages/manager/goodsEdit/` | 新增 |
| `pages/manager/aftersale/` | 新增 |
| `config/api.js` | 新增 API 配置 |

### 数据库

无表结构变更。

---

## 实施顺序

**先 A 后 B**：订单管理依赖较少，可独立上线；商品管理涉及商品编辑和图片处理，复杂度更高。

1. A 后端 API → A 前端页面 → 测试
2. B 后端 API → B 前端页面 → 测试
3. C 首页改造 → 联调
