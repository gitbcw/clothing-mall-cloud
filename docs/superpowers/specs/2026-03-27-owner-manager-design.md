# 小程序店主管理后台设计文档

> 日期：2026-03-27
> 状态：待审阅

## 概述

增强现有小程序 `pages/manager/` 模块，为店主提供订单管理和商品上架能力，与管理后台系统共享数据模型和状态流转逻辑。

## 设计决策

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 目标用户 | 仅店主 (owner) | 导购不需要管理功能 |
| 改造方式 | 增强现有 manager 模块 | 现有功能可复用，风险低 |
| 订单分类 | 3 tab：待处理/售后中/已完成 | 简洁，覆盖店主核心操作场景 |
| 售后处理 | 同意/拒绝退款 | 最小可用，复杂协商后续迭代 |
| 商品管理 | 列表+上下架、拍照上传、编辑、批量操作 | 与管理后台对齐 |
| 状态同步 | 共享 status + is_on_sale 字段 | 实时一致，无需同步逻辑 |

## 整体架构

### 方案：增强现有 Manager API

在现有 `WxManagerOrderController` / `WxManagerGoodsController` 基础上扩展 API，前端增强 `pages/manager/` 下的页面。

### 权限变更

现有 `checkManager()` 检查 owner 或 guide，改为仅检查 owner：

```java
// Before
if (!"owner".equals(role) && !"guide".equals(role)) { return 403; }
// After
if (!"owner".equals(role)) { return 403; }
```

改动范围：`WxManagerOrderController.checkManager()` 和 `WxManagerGoodsController.checkManager()` 两个方法。

---

## 一、订单管理模块

### 1.1 订单分类

```
┌──────────┬──────────┬───────────────────────────────┐
│  待处理   │  售后中   │          已完成               │
├──────────┼──────────┼───────────────────────────────┤
│ 201 已付款│ 202 退款中 │ 301 已发货                  │
│ 150 待确认│          │ 401 已收货                   │
│ 501 待核销│          │ 402 自动确认收货              │
│          │          │ 502 已核销                   │
│          │          │ 102/103/104 已取消            │
└──────────┴──────────┴───────────────────────────────┘
```

**不展示**：101(待付款) — 店主无需操作。

### 1.2 店主可执行操作

| 订单状态 | 可操作 | 说明 |
|----------|--------|------|
| 201 已付款 | 发货、取消 | 填写快递单号和快递公司 |
| 150 待确认 | 确认、取消 | 管理员确认付款后进入待发货 |
| 501 待核销 | 核销 | 验证取货码 |
| 202 退款中 | 同意退款、拒绝退款 | 触发微信退款或通知用户 |
| 301 已发货 | 无操作 | 仅查看 |
| 401/402 已收货 | 无操作 | 仅查看 |
| 502 已核销 | 无操作 | 仅查看 |

### 1.3 API 设计

```
# 新增
GET  /wx/manager/order/list?status=pending&page=1&limit=20
     → 分页订单列表 + 各 tab 数量统计
     → status 枚举: pending(待处理) / aftersale(售后中) / completed(已完成)

POST /wx/manager/order/refundAgree
     → 同意退款：调用微信退款 API → 202→203 → 释放库存
     → 参数: orderId

POST /wx/manager/order/refundReject
     → 拒绝退款：202→原状态 → 通知用户
     → 参数: orderId, reason(拒绝原因)

POST /wx/manager/order/verify
     → 核销自提订单：验证取货码 → 501→502
     → 参数: orderId, pickupCode

# 已有（保留）
GET  /wx/manager/order/detail?id=123
POST /wx/manager/order/ship
POST /wx/manager/order/confirm
POST /wx/manager/order/cancel
```

### 1.4 前端页面

**manager/order（订单列表页）**：
- 顶部 3 个 Tab：待处理、售后中、已完成
- 每个 Tab 显示数量角标
- 下拉刷新 + 上拉加载更多
- 订单卡片展示：订单号、收货人、金额、状态标签、操作按钮

**manager/orderDetail（订单详情页）**：
- 订单信息：订单号、状态、时间线
- 收货信息：收货人、电话、地址
- 商品信息：商品列表（图、名、规格、单价、数量）
- 支付信息：商品总价、运费、实付金额
- 操作区域：根据状态显示不同按钮

**manager/aftersale（售后处理页，新增）**：
- 售后信息：退款金额、原因、申请时间
- 商品信息：关联商品
- 操作按钮：同意退款 / 拒绝退款（拒绝时需填写原因）

---

## 二、商品管理模块

### 2.1 商品列表

**Tab 分类**：全部 / 草稿(draft) / 待上架(pending) / 已上架(published + is_on_sale=true)

### 2.2 状态流转（与管理后台一致）

```
拍照上传 → draft(草稿)
                ↓ 编辑完善
            pending(待上架)
                ↓ 上架
            published + is_on_sale=true(已上架)
                ↓ 下架
            published + is_on_sale=false(已下架)
```

- `status` 字段控制商品生命周期（draft → pending → published）
- `is_on_sale` 控制前端是否展示
- 两端（小程序 + 管理后台）共享同一套字段，实时同步

### 2.3 商品编辑

支持在小程序端编辑：
- 基本信息：名称、简介、分类、品牌
- 价格：原价(counter_price)、零售价(retail_price)
- SKU：颜色、尺码、价格、库存
- 图片：主图(pic_url)、详情图(gallery)
- 上下架状态
- SKU 编辑：复用现有 `components/sku-picker` 组件的选择交互，编辑页中用表格形式展示现有 SKU 列表（颜色/尺码/价格/库存），支持增删改

### 2.4 批量操作

长按商品卡片 → 进入多选模式 → 勾选 → 底部操作栏（上架/下架/删除）

### 2.5 API 设计

```
# 新增
GET  /wx/manager/goods/list?status=draft&page=1&limit=20
     → 分页商品列表 + 各 tab 数量
     → status 枚举: all / draft / pending / on_sale

GET  /wx/manager/goods/detail?id=123
     → 商品详情（含 SKU、属性、规格）

POST /wx/manager/goods/edit
     → 编辑商品信息
     → 参数: id, name, brief, categoryId, brandId, counterPrice, retailPrice,
             picUrl, gallery, products(SKU列表), attributes, specifications

POST /wx/manager/goods/publish
     → 上架：status → published, is_on_sale → true
     → 参数: id 或 ids(数组，批量)

POST /wx/manager/goods/unpublish
     → 下架：is_on_sale → false
     → 参数: id 或 ids(数组，批量)

POST /wx/manager/goods/batchDelete
     → 批量软删除
     → 参数: ids(数组)

# 已有（保留）
POST /wx/manager/goods/create      → 快速创建草稿
POST /wx/manager/goods/unpublishAll → 一键下架全部
```

### 2.6 前端页面

**manager/goods（商品列表页，新增）**：
- 顶部 Tab：全部、草稿、待上架、已上架
- 商品卡片：图、名称、价格、状态标签
- 长按多选 → 底部操作栏
- 底部：拍照添加商品按钮

**manager/goodsEdit（商品编辑页，新增）**：
- 商品基本信息表单
- SKU 管理（颜色/尺码/价格/库存）
- 图片管理（主图 + gallery）
- 保存草稿 / 提交上架 按钮

**manager/draftList（草稿箱，改造）**：
- 增加编辑按钮 → 跳转 goodsEdit
- 增加上架按钮 → 调用 publish API
- 增加删除按钮

---

## 三、管理后台首页

### 3.1 数据展示

```
┌─────────────────────────────────────┐
│         店主管理后台                  │
├──────────┬──────────────────────────┤
│  待处理   │         N               │
│  (发货+核销)│                       │
├──────────┼──────────────────────────┤
│  售后中   │         N               │
├──────────┼──────────────────────────┤
│  待上架   │         N               │
├──────────┴──────────────────────────┤
│  [订单管理]          [商品管理]       │
├─────────────────────────────────────┤
│  最近订单                            │
│  (最近 5 条待处理订单)               │
└─────────────────────────────────────┘
```

### 3.2 API

```
GET /wx/manager/stats
    → { pendingOrderCount, aftersaleCount, pendingGoodsCount, recentOrders[] }
```

---

## 四、数据一致性保障

1. **商品状态**：小程序端和管理后台操作同一 `status` + `is_on_sale` 字段，无需同步逻辑
2. **订单操作**：通过同一 `LitemallOrderService` 处理，状态流转逻辑集中管理
3. **并发控制**：订单状态变更前检查当前状态，防止重复操作（乐观锁）
4. **微信退款**：同意退款时调用微信退款 API，失败则不更新状态，保证数据一致性

---

## 五、改动文件清单

### 后端 (clothing-mall-wx-api)

| 文件 | 改动 |
|------|------|
| `WxManagerOrderController.java` | 新增 list、refundAgree、refundReject、verify |
| `WxManagerGoodsController.java` | 新增 list、detail、edit、publish、unpublish、batchDelete |
| `LitemallOrderService.java` | 新增 refundAgree、refundReject、verify 方法 |
| `LitemallGoodsService.java` | 新增 edit、publish、unpublish、batchDelete 方法 |

### 前端 (clothing-mall-wx)

| 文件 | 改动 |
|------|------|
| `pages/manager/index/` | 改造：数据卡片 + 最近订单 |
| `pages/manager/order/` | 改造：3 tab 分类 + 分页 |
| `pages/manager/orderDetail/` | 改造：增加售后操作 |
| `pages/manager/draftList/` | 改造：增加编辑/上架操作 |
| `pages/manager/goods/` | 新增：商品列表页 |
| `pages/manager/goodsEdit/` | 新增：商品编辑页 |
| `pages/manager/aftersale/` | 新增：售后处理页 |
| `config/api.js` | 新增 API 配置 |

### 数据库

无表结构变更。复用现有 `litemall_order`、`litemall_goods`、`litemall_order_goods` 等表。
