# 自提/快递完整流程设计

**日期**: 2026-04-03
**状态**: 待实施

## 背景

当前系统后端已具备自提（pickup）和快递（express）两种配送方式的基础框架，但小程序前端下单流程完全未接入自提功能，导致自提形同虚设。本设计补全前端流程并修复后端衔接断裂处，实现完整闭环。

## 现状问题

| # | 问题 | 严重性 |
|---|------|--------|
| 1 | 确认订单页无配送方式选择，`deliveryType` 硬编码为 `express` | 严重 |
| 2 | Checkout API 不接收 `deliveryType`，运费计算不区分配送方式 | 严重 |
| 3 | 支付回调未区分自提/快递，自提订单支付后停在 201 而非流转到 501 | 严重 |
| 4 | 订单详情 API 不返回 `deliveryType` 和自提字段 | 严重 |
| 5 | 管理端订单详情对自提订单的收货信息展示不完整 | 中等 |
| 6 | 管理端对 `deliveryType=pickup` 的 201 状态订单仍显示"发货"按钮 | 中等 |

## 设计决策

- **运费规则**：自提免运费，快递正常计算
- **门店场景**：多门店，用户自提时选择门店
- **核销方式**：店员输入取货码核销（已有实现）
- **联系人信息**：两种配送方式都要求用户有收货地址，自提时自动从地址中取姓名和手机号作为联系人
- **取货码唯一性**：本次暂不处理，后续迭代

## 订单状态流转

```
快递 (express):
  101(待付款) → 201(已付款) → 301(已发货) → 401(已收货)

自提 (pickup):
  101(待付款) → 201(已付款) → 501(待核销) → 502(已核销)
                  ↑ 支付回调自动流转
```

## 改动清单

### 1. 小程序前端 - 确认订单页

**文件**: `clothing-mall-wx/pages/confirm_order/`

#### 1.1 JS 改动 (`confirm_order.js`)

- data 新增字段：
  - `deliveryType`: 'express' | 'pickup'，默认 'express'
  - `storeList`: []，门店列表
  - `selectedStore`: {}，已选门店
  - `showStorePicker`: false，门店选择弹窗

- 新增方法：
  - `switchDeliveryType(e)`: 切换配送方式，重新调用 checkout
  - `loadStores()`: 调用门店列表 API
  - `selectStore(e)`: 选择门店
  - `openStorePicker()`: 打开门店选择弹窗
  - `closeStorePicker()`: 关闭门店选择弹窗

- 改动 `getCheckoutInfo()`：
  - 传入 `deliveryType` 参数
  - 自提模式下存储门店列表 `storeList`

- 改动 `submitOrder()`：
  - 提交时传 `deliveryType`
  - 自提模式下传 `pickupStoreId`
  - 两种模式都校验地址存在（地址中的姓名/手机号作为联系人）
  - 自提模式下校验已选择门店

#### 1.2 模板改动 (`confirm_order.wxml`)

在地址卡片上方新增配送方式切换器：
```xml
<!-- 配送方式切换 -->
<view class="delivery-tabs">
  <view class="tab {{deliveryType === 'express' ? 'active' : ''}}" bindtap="switchDeliveryType" data-type="express">快递配送</view>
  <view class="tab {{deliveryType === 'pickup' ? 'active' : ''}}" bindtap="switchDeliveryType" data-type="pickup">到店自提</view>
</view>
```

- 快递模式：显示地址卡片（现有逻辑不变）
- 自提模式：
  - 地址卡片简化为只显示联系人姓名和手机号
  - 新增门店选择卡片（显示已选门店或"请选择门店"）
  - 运费显示 "免运费"

新增门店选择弹窗：
```xml
<view class="store-picker-mask" wx:if="{{showStorePicker}}" bindtap="closeStorePicker">
  <view class="store-picker" catchtap="">
    <view class="picker-title">选择自提门店</view>
    <scroll-view scroll-y class="store-list">
      <view class="store-item" wx:for="{{storeList}}" bindtap="selectStore" data-index="{{index}}">
        <view class="store-name">{{item.name}}</view>
        <view class="store-address">{{item.address}}</view>
        <view class="store-hours">{{item.businessHours}}</view>
      </view>
    </scroll-view>
  </view>
</view>
```

#### 1.3 样式改动 (`confirm_order.wxss`)

新增配送方式切换器、门店选择卡片、门店选择弹窗的样式。

### 2. 后端 API 改动

#### 2.1 Checkout API (`WxCartController.java`)

改动方法签名：
```java
@GetMapping("checkout")
public Object checkout(@LoginUser Integer userId,
                       Integer cartId, Integer addressId,
                       Integer couponId, Integer userCouponId,
                       String deliveryType)
```

逻辑变更：
- `deliveryType` 为 null 或 `express`：行为不变
- `deliveryType` 为 `pickup`：
  - 运费固定为 0
  - 不要求 `addressId`
  - 返回数据新增 `stores` 字段（门店列表）
  - 返回数据新增 `deliveryType` 字段

#### 2.2 订单提交 (`WxOrderService.java` submit 方法)

改动：
- 自提模式：`pickupContact` 自动从用户地址的 `name` 取值
- 自提模式：`pickupPhone` 自动从用户地址的 `mobile` 取值
- 自提模式：不要求 `addressId` 非空（但要求地址存在以获取联系人信息）

#### 2.3 支付回调

在支付成功回调中，根据 `deliveryType` 决定订单状态：
- `express`：保持 201（已付款/待发货）
- `pickup`：自动流转到 501（待核销），同时生成取货码

具体位置：`WxOrderService` 的 `payNotify` 或相关的支付成功处理方法中。

#### 2.4 订单详情 API (`WxOrderService.java` detail 方法)

返回数据新增：
- `deliveryType` 字段
- 自提订单额外返回：
  - `pickupCode`: 取货码
  - `pickupStoreId`: 门店 ID
  - `pickupContact`: 联系人
  - `pickupPhone`: 联系电话
  - `pickupStore`: 门店详情对象（name, address, phone, businessHours），通过 `ClothingStoreService.findById()` 查询

### 3. 管理端（小程序经理端）改动

#### 3.1 订单详情模板 (`manager/orderDetail/orderDetail.wxml`)

收货信息区域根据 `deliveryType` 区分显示：

```xml
<!-- 快递订单 -->
<view class="info-section" wx:if="{{order.deliveryType !== 'pickup'}}">
  <view class="section-title">收货信息</view>
  <view class="info-item"><text class="label">收货人</text><text class="value">{{order.consignee}}</text></view>
  <view class="info-item"><text class="label">手机号</text><text class="value">{{order.mobile}}</text></view>
  <view class="info-item"><text class="label">收货地址</text><text class="value">{{order.address}}</text></view>
</view>

<!-- 自提订单 -->
<view class="info-section" wx:if="{{order.deliveryType === 'pickup'}}">
  <view class="section-title">自提信息</view>
  <view class="info-item"><text class="label">取货码</text><text class="value pickup-code">{{order.pickupCode}}</text></view>
  <view class="info-item"><text class="label">联系人</text><text class="value">{{order.pickupContact}}</text></view>
  <view class="info-item"><text class="label">联系电话</text><text class="value">{{order.pickupPhone}}</text></view>
  <view class="info-item"><text class="label">自提门店</text><text class="value">{{order.pickupStore.name}}</text></view>
  <view class="info-item"><text class="label">门店地址</text><text class="value">{{order.pickupStore.address}}</text></view>
</view>
```

核销信息区域扩展到 502 状态也显示（已核销时仍显示取货码供查看）。

#### 3.2 订单详情 JS (`manager/orderDetail/orderDetail.js`)

- 对 `deliveryType === 'pickup'` 且 `orderStatus === 201` 的订单，不显示"发货"按钮
- 核销信息区域在 501 和 502 状态都显示

### 4. 不改动的部分

- **取货码生成逻辑**：暂不修改，6位随机数重复概率极低
- **管理后台 Vue 端**：已有自提 Tab 和相关处理，暂不改动
- **退款流程**：暂不区分自提/快递的退款差异
- **核销过期机制**（503/504 状态）：暂不实现自动过期

## 数据流

### 自提下单流程

```
用户选"到店自提"
  → checkout API (deliveryType=pickup) → 运费=0, 门店列表
  → 用户选门店 (pickupStoreId)
  → 用户确认地址存在 (复用姓名+手机号)
  → submit API (deliveryType, pickupStoreId, addressId)
    → 后端自动填充 pickupContact/pickupPhone
    → 后端生成 pickupCode
  → 微信支付
  → 支付回调 → deliveryType=pickup → orderStatus=501(待核销)
  → 管理端看到待核销订单 → 输入取货码核销 → orderStatus=502(已核销)
```

### 快递下单流程（不变）

```
用户选"快递配送"
  → checkout API (deliveryType=express) → 正常运费, 地址
  → 用户选择/确认地址
  → submit API (deliveryType, addressId)
  → 微信支付
  → 支付回调 → deliveryType=express → orderStatus=201(已付款)
  → 管理端发货 → orderStatus=301(已发货)
  → 用户确认收货 → orderStatus=401(已收货)
```
