# 管理端 TabBar 重构设计文档

> 日期：2026-03-29
> 状态：已确认

## 背景与目标

管理端当前有 9 个页面，从商城端「我的」页面 navigateTo 进入，无独立导航。页面功能分散，入口不直观。

**目标**：重构为底部双 Tab 结构（订单 + 上架），聚焦店主高频操作——处理订单和上架商品。

## 核心决策

| 决策项 | 结论 |
|--------|------|
| TabBar 方式 | 独立自定义 TabBar，与商城端 TabBar 互不干扰 |
| 底部 Tab 数量 | 2 个：订单、上架 |
| 订单范围 | 仅待处理（待确认/待发货/退款中/待核销） |
| 售后范围 | 仅待处理（退款中） |
| 商品粒度 | 商品即 SKU，无 SPU/SKU 分层 |
| 上架方式 | 内嵌表单在 Tab 页中 |
| AI 识别 | 集成在内嵌表单，拍照后自动填充 |
| 草稿保存 | 本地 wx.setStorageSync 自动保存 |
| 商品规格 | 移除，尺码选择在商城端独立处理 |

## §1 页面架构

### 新结构

```
管理端 TabBar
├── 订单 Tab (tabOrder)
│   ├── 订单子 Tab — 待处理订单列表（卡片 + 内联操作）
│   └── 售后子 Tab — 退款中订单列表（卡片 + 内联操作）
│
└── 上架 Tab (tabShelf)
    ├── 商品上架子 Tab — 内嵌表单（拍照/AI/手动填写）
    └── 商品列表子 Tab — 在售/待上架筛选 + 搜索
```

### 页面映射

| 旧页面 | 处理 |
|--------|------|
| manager/index（Dashboard） | 废弃，功能分散到各 Tab |
| manager/order（订单列表） | 合并到 tabOrder 的订单子 Tab |
| manager/orderDetail（订单详情） | 保留，从订单卡片跳转进入 |
| manager/upload（拍照上传） | 合并到 tabShelf 内嵌表单 |
| manager/confirmUpload（确认上传） | 合并到 tabShelf 内嵌表单 |
| manager/goods（商品列表） | 合并到 tabShelf 的商品列表子 Tab |
| manager/goodsEdit（商品编辑） | 保留，从商品列表进入 |
| manager/draftList（草稿箱） | 废弃，草稿自动保存在上架表单 |
| manager/skuList（SKU 列表） | 废弃，被商品列表子 Tab 替代 |

### 文件变更

**新增：**
- `pages/manager/tabOrder/tabOrder` (.wxml/.wxss/.js/.json)
- `pages/manager/tabShelf/tabShelf` (.wxml/.wxss/.js/.json)
- `custom-tab-bar/index` — 自定义 TabBar 组件（根据页面路径动态切换商城端/管理端 Tab）

**保留：**
- `pages/manager/orderDetail/orderDetail`
- `pages/manager/goodsEdit/goodsEdit`

**废弃：**
- `pages/manager/index/index`
- `pages/manager/order/order`
- `pages/manager/upload/upload`
- `pages/manager/confirmUpload/confirmUpload`
- `pages/manager/goods/goods`
- `pages/manager/draftList/draftList`
- `pages/manager/skuList/skuList`

## §2 订单 Tab 设计

### 页面结构

顶部两个子 Tab 切换：「订单」和「售后」，各显示待处理数量角标。

### 订单子 Tab

只显示需要店主处理的订单，按时间倒序排列。

**订单卡片内容：**
- 订单号（等宽字体）
- 订单状态标签（颜色区分）
- 商品缩略图 + 名称
- 收货人（脱敏手机号）
- 实付金额
- 操作按钮（根据状态动态显示）

**各状态操作方式：**

| 状态 | 状态码 | 操作按钮 | 交互方式 |
|------|--------|----------|----------|
| 待确认 | 150 | 取消 / 确认接单 | 内联：确认框弹窗 |
| 待发货 | 201 | 填写物流发货 → | 跳转 orderDetail（发货弹窗） |
| 退款中 | 202 | 拒绝退款 / 同意退款 | 内联：同意确认框 / 拒绝原因输入框 |
| 待核销 | 501 | 输入取货码核销 → | 跳转 orderDetail（核销弹窗） |

### 售后子 Tab

结构与订单子 Tab 一致，筛选条件为退款中的售后工单。显示退款原因和退款金额，操作为同意/拒绝退款。

### 使用的 API

- `ManagerOrderList` — 获取订单列表（status 参数筛选）
- `ManagerOrderConfirm` — 确认接单
- `ManagerOrderCancel` — 取消订单
- `ManagerOrderRefundAgree` — 同意退款
- `ManagerOrderRefundReject` — 拒绝退款（需传 reason）
- `ManagerOrderDetail` — 跳转详情时获取完整数据
- `ManagerOrderShip` — 发货（详情页内）
- `ManagerOrderVerify` — 核销（详情页内）

## §3 商品上架表单设计

### 表单位置

内嵌在上架 Tab 的「商品上架」子 Tab 中，不跳转独立页面。

### 表单字段与顺序

| 序号 | 区块 | 字段 | 类型 | 必填 | AI 填充 |
|------|------|------|------|------|---------|
| ❶ | 商品图片 | 主图 | 图片上传（拍照/相册） | 是 | ✓ |
| ❶ | 商品图片 | 宣传画廊 | 多图上传（最多 9 张） | 否 | — |
| ❷ | 商品名称 | 商品名称 | 文本输入 | 是 | ✓ |
| ❸ | 价格设置 | 零售价 | 数字输入 | 是 | — |
| ❸ | 价格设置 | 专柜价 | 数字输入 | 否 | — |
| ❸ | 价格设置 | 特价 | 数字输入 | 否 | — |
| ❹ | 分类与标签 | 分类 | Picker 单选 | 是 | ✓ |
| ❹ | 分类与标签 | 场景 | Chip 多选标签 | 否 | ✓ |
| ❹ | 分类与标签 | 关键词 | 文本输入（空格分隔） | 否 | ✓ |
| ❺ | 商品描述 | 商品简介 | 文本输入（一句话） | 否 | ✓ |
| ❺ | 商品描述 | 商品详细介绍 | Textarea（500 字） | 否 | ✓ |
| ❻ | 商品参数 | 键值对 | 动态行（参数名+参数值） | 否 | ✓ |

### 图片上传与 AI 识别

1. 用户点击拍照/选图 → `wx.chooseMedia`
2. 图片上传到 `StorageUpload` 获取 URL
3. 调用 `AiRecognizeByUrl` 进行 AI 识别
4. 识别结果自动填充表单字段（名称、分类、场景、关键词等）
5. 图片右上角显示 AI 识别置信度标签（如「AI 92%」）
6. 用户可修改任何 AI 填充的字段

### 特价逻辑

- 设置特价后，商品以特价销售
- 商品卡片和列表显示「特价」标签（橙色）
- 售价显示特价金额，划线价显示零售价或专柜价

### 商品参数

键值对形式，用户可自由添加/删除行。如：
- 面料：棉麻混纺
- 产地：杭州
- 洗涤方式：手洗/机洗

### 场景标签

预设选项（Chip 多选）：日常通勤、约会聚餐、度假旅行、运动健身、居家休闲、商务正式。支持自定义输入。

### 自动保存机制

- **触发**：每次表单字段变化时（bindinput/bindchange）自动调用 `wx.setStorageSync('managerDraft', data)`
- **恢复**：进入上架 Tab 时检查本地是否有未提交草稿，有则自动恢复并在表单顶部显示提示：「已恢复上次编辑的内容 · 丢弃」
- **清除**：用户成功上架后清除本地草稿
- **存储内容**：图片 URL + 所有表单字段 + 保存时间

### 预览模式

点击「预览」按钮后，以半屏弹窗展示商品卡片效果（模拟买家视角）。弹窗底部有「继续编辑」和「确认上架」两个按钮。

### 底部操作按钮

- 「预览」— 半屏弹窗预览效果
- 「直接上架」— 创建商品 + 立即上架

### 使用的 API

- `StorageUpload` — 图片上传
- `AiRecognizeByUrl` — AI 服装识别
- `ManagerGoodsCreate` — 创建商品
- `ManagerGoodsPublish` — 上架商品

## §4 商品列表子 Tab 设计

### 页面结构

- 顶部搜索栏
- 状态筛选 Tab：「在售」（默认）/ 「待上架」，各带数量角标
- 商品卡片列表

### 搜索

- 输入商品名称或关键词，实时筛选（bindinput + debounce 300ms）
- 搜索结果在当前筛选 Tab 范围内

### 在售 Tab（默认）

- 显示已上架商品
- 顶部：「共 N 件在售商品」+ 「一键全部下架」按钮
- 卡片操作：编辑 / 下架
- 下架操作：弹出确认框 → `ManagerGoodsUnpublish`

### 待上架 Tab

- 显示已创建但未上架的商品
- 卡片操作：编辑 / 上架
- 上架操作：弹出确认框 → `ManagerGoodsPublish`

### 商品卡片内容

- 商品图片（主图缩略图）
- 商品名称
- 分类 + 场景标签（Chip）
- 售价（有特价时显示特价 + 橙色「特价」标签 + 划线价）
- 操作按钮

### 使用的 API

- `ManagerGoodsList` — 获取商品列表（status 参数：published/pending）
- `ManagerGoodsPublish` — 上架
- `ManagerGoodsUnpublish` — 下架
- `ManagerGoodsUnpublishAll` — 一键全部下架

### 编辑跳转

点击「编辑」→ `wx.navigateTo({ url: '/pages/manager/goodsEdit/goodsEdit?id=xxx' })`

## §5 技术实现方案

### 入口流程

1. 商城端「我的」页面 → 点击「管理后台」
2. 权限校验 `UserIsManager`
3. 通过后 `wx.switchTab({ url: '/pages/manager/tabOrder/tabOrder' })`
4. 管理端使用自定义 TabBar，底部显示「订单」「上架」

### 自定义 TabBar 实现

小程序不支持同一 app.json 配置两套 TabBar。采用自定义 TabBar 方案：

- `app.json` 中 `"custom": true`
- TabBar list 注册所有可能的 tab 页（商城端 + 管理端）
- `custom-tab-bar/index.js` 根据当前页面路径动态切换显示的 Tab：
  - 页面在 `pages/manager/` 下 → 显示「订单 / 上架」
  - 其他页面 → 显示「首页 / 分类 / 购物车 / 我的」

### app.json 页面路由变更

新增：
```json
"pages/manager/tabOrder/tabOrder",
"pages/manager/tabShelf/tabShelf"
```

TabBar list 新增：
```json
{ "pagePath": "pages/manager/tabOrder/tabOrder", "text": "订单" },
{ "pagePath": "pages/manager/tabShelf/tabShelf", "text": "上架" }
```

废弃页面路由可暂时保留（不删除文件），确保不影响线上版本。

### 样式规范

沿用已完成的管理端配色统一方案：
- 主色：`#BA8D59`，深主色：`#96745A`
- 页面背景：`#F7F8FA`
- 卡片圆角：`16rpx`，阴影：`0 2rpx 12rpx rgba(0,0,0,0.04)`
- 共享样式：`@import "../../styles/manager-common.wxss"`
