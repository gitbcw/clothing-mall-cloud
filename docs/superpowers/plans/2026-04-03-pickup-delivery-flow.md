# 自提/快递完整流程 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全小程序前端自提下单流程并修复后端衔接断裂处，实现快递/自提完整闭环。

**Architecture:** 后端已有 express/pickup 双模式框架（WxOrderService.submit 支持两种配送方式），但前端未接入。改动分三层：后端 API 衔接修复 → 小程序前端确认订单页改造 → 管理端订单详情展示修复。

**Tech Stack:** Java 8 / Spring Boot / MyBatis / 微信小程序 (WXML/JS/WXSS)

---

## Task 1: 后端 - Checkout API 支持 deliveryType 参数

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxCartController.java:373-491`

- [ ] **Step 1: 修改 checkout 方法签名，新增 deliveryType 参数**

在 `WxCartController.java` 第 374 行，修改 checkout 方法：

```java
@GetMapping("checkout")
public Object checkout(@LoginUser Integer userId, Integer cartId, Integer addressId, Integer couponId, Integer userCouponId, String deliveryType) {
```

- [ ] **Step 2: 在 checkout 方法中添加自提模式处理逻辑**

在第 462 行（运费计算）之后、第 467 行之前，插入自提运费覆盖逻辑：

将原来的运费计算：
```java
BigDecimal freightPrice = freightService.calculateFreight(checkedGoodsPrice, totalPieceCount);
```

替换为：
```java
BigDecimal freightPrice;
List<ClothingStore> stores = null;
if ("pickup".equals(deliveryType)) {
    // 自提模式：免运费
    freightPrice = BigDecimal.ZERO;
} else {
    freightPrice = freightService.calculateFreight(checkedGoodsPrice, totalPieceCount);
}
```

- [ ] **Step 3: 在返回数据中新增 deliveryType 和 stores 字段**

在 `data.put("checkedGoodsList", checkedGoodsList);` 之前添加：

```java
data.put("deliveryType", deliveryType);
if ("pickup".equals(deliveryType)) {
    // 注入 ClothingStoreService（需要在类顶部添加 @Autowired）
    stores = clothingStoreService.queryAll();
    data.put("stores", stores);
}
```

- [ ] **Step 4: 在类顶部注入 ClothingStoreService**

在 `WxCartController` 类的字段声明区域（约第 50 行 `FreightService` 之后）添加：

```java
@Autowired
private ClothingStoreService clothingStoreService;
```

需要确保 import 中包含：
```java
import org.linlinjava.litemall.db.service.ClothingStoreService;
import org.linlinjava.litemall.db.domain.ClothingStore;
```

- [ ] **Step 5: 编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxCartController.java
git commit -m "feat: checkout API 支持 deliveryType 参数，自提模式免运费并返回门店列表"
```

---

## Task 2: 后端 - 支付回调区分自提/快递流转

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/service/WxOrderService.java:744-745`

- [ ] **Step 1: 修改 payNotify 方法中的状态流转逻辑**

将 `WxOrderService.java` 第 744-745 行：

```java
order.setPayTime(LocalDateTime.now());
order.setOrderStatus(OrderUtil.STATUS_PAY);
```

替换为：

```java
order.setPayTime(LocalDateTime.now());
// 根据配送方式决定下一步状态
if ("pickup".equals(order.getDeliveryType())) {
    order.setOrderStatus(OrderUtil.STATUS_VERIFY_PENDING);
} else {
    order.setOrderStatus(OrderUtil.STATUS_PAY);
}
```

- [ ] **Step 2: 同步修改零元支付逻辑（submit 方法中）**

将 `WxOrderService.java` 约第 480-483 行：

```java
LitemallOrder o = new LitemallOrder();
o.setId(orderId);
o.setOrderStatus(OrderUtil.STATUS_PAY);
orderService.updateSelective(o);
```

替换为：

```java
LitemallOrder o = new LitemallOrder();
o.setId(orderId);
// 根据配送方式决定下一步状态
if ("pickup".equals(order.getDeliveryType())) {
    o.setOrderStatus(OrderUtil.STATUS_VERIFY_PENDING);
} else {
    o.setOrderStatus(OrderUtil.STATUS_PAY);
}
orderService.updateSelective(o);
```

- [ ] **Step 3: 编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/service/WxOrderService.java
git commit -m "feat: 支付回调区分自提/快递，自提订单自动流转到待核销(501)"
```

---

## Task 3: 后端 - submit 方法自提联系人自动填充

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/service/WxOrderService.java:290-317`

- [ ] **Step 1: 修改自提模式验证逻辑，从地址自动取联系人信息**

将 `WxOrderService.java` 约第 290-317 行的自提验证和快递地址验证逻辑：

```java
// 自提模式验证
if ("pickup".equals(deliveryType)) {
    if (pickupStoreId == null || pickupStoreId <= 0) {
        return ResponseUtil.fail(400, "请选择自提门店");
    }
    if (pickupContact == null || pickupContact.isEmpty()) {
        return ResponseUtil.fail(400, "请输入联系人姓名");
    }
    if (pickupPhone == null || !pickupPhone.matches("^1[3-9]\\d{9}$")) {
        return ResponseUtil.fail(400, "请输入正确的手机号");
    }
}

if (cartId == null || couponId == null) {
    return ResponseUtil.badArgument();
}

// 快递配送需要验证地址
LitemallAddress checkedAddress = null;
if ("express".equals(deliveryType)) {
    if (addressId == null || addressId <= 0) {
        return ResponseUtil.fail(400, "请选择收货地址");
    }
    checkedAddress = addressService.query(userId, addressId);
    if (checkedAddress == null) {
        return ResponseUtil.fail(400, "收货地址不存在");
    }
}
```

替换为：

```java
// 自提模式验证
if ("pickup".equals(deliveryType)) {
    if (pickupStoreId == null || pickupStoreId <= 0) {
        return ResponseUtil.fail(400, "请选择自提门店");
    }
}

if (cartId == null || couponId == null) {
    return ResponseUtil.badArgument();
}

// 两种模式都需要地址（快递用地址，自提用联系人信息）
LitemallAddress checkedAddress = null;
if (addressId != null && addressId > 0) {
    checkedAddress = addressService.query(userId, addressId);
}
if (checkedAddress == null) {
    checkedAddress = addressService.findDefault(userId);
}
if (checkedAddress == null) {
    return ResponseUtil.fail(400, "请先添加收货地址");
}

// 自提模式：从地址中自动取联系人信息
if ("pickup".equals(deliveryType)) {
    if (pickupContact == null || pickupContact.isEmpty()) {
        pickupContact = checkedAddress.getName();
    }
    if (pickupPhone == null || pickupPhone.isEmpty()) {
        pickupPhone = checkedAddress.getTel();
    }
    if (pickupPhone == null || !pickupPhone.matches("^1[3-9]\\d{9}$")) {
        return ResponseUtil.fail(400, "收货地址中手机号不完整，请先完善地址信息");
    }
}
```

注意：删除了 express 模式下对 addressId 的强制校验（因为两种模式都需要地址），统一在 checkedAddress == null 时报错。

- [ ] **Step 2: 编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/service/WxOrderService.java
git commit -m "feat: 自提订单联系人自动从地址取值，两种模式都要求有地址"
```

---

## Task 4: 后端 - 订单详情 API 返回自提字段

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/service/WxOrderService.java:172-250`
- Add `@Autowired ClothingStoreService` to WxOrderService

- [ ] **Step 1: 在 WxOrderService 中注入 ClothingStoreService**

在 WxOrderService 类字段声明区域（约第 110 行 `LitemallOrderExpressService` 之后）添加：

```java
@Autowired
private ClothingStoreService clothingStoreService;
```

- [ ] **Step 2: 在 detail 方法中添加 deliveryType 和自提字段**

在 `WxOrderService.java` detail 方法中，在 `orderVo.put("expNo", order.getShipSn());` 之后（约第 202 行）添加：

```java
orderVo.put("deliveryType", order.getDeliveryType());
if ("pickup".equals(order.getDeliveryType())) {
    orderVo.put("pickupCode", order.getPickupCode());
    orderVo.put("pickupStoreId", order.getPickupStoreId());
    orderVo.put("pickupContact", order.getPickupContact());
    orderVo.put("pickupPhone", order.getPickupPhone());
    // 查询门店信息
    if (order.getPickupStoreId() != null) {
        ClothingStore store = clothingStoreService.findById(order.getPickupStoreId());
        if (store != null) {
            Map<String, Object> storeInfo = new HashMap<>();
            storeInfo.put("id", store.getId());
            storeInfo.put("name", store.getName());
            storeInfo.put("address", store.getAddress());
            storeInfo.put("phone", store.getPhone());
            storeInfo.put("businessHours", store.getBusinessHours());
            orderVo.put("pickupStore", storeInfo);
        }
    }
}
```

需要确保 import 包含：
```java
import org.linlinjava.litemall.db.service.ClothingStoreService;
import org.linlinjava.litemall.db.domain.ClothingStore;
```

- [ ] **Step 3: 编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/service/WxOrderService.java
git commit -m "feat: 订单详情 API 返回 deliveryType 和自提相关字段（取货码、门店信息等）"
```

---

## Task 5: 后端 - 管理端订单详情返回自提字段

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxManagerOrderController.java`

- [ ] **Step 1: 找到管理端订单详情接口**

搜索 `WxManagerOrderController.java` 中的 `detail` 方法。在返回的 order 对象中添加自提字段。管理端 detail 接口构建 orderVo 时，在已有的字段赋值之后添加：

```java
orderVo.put("deliveryType", order.getDeliveryType());
if ("pickup".equals(order.getDeliveryType())) {
    orderVo.put("pickupCode", order.getPickupCode());
    orderVo.put("pickupStoreId", order.getPickupStoreId());
    orderVo.put("pickupContact", order.getPickupContact());
    orderVo.put("pickupPhone", order.getPickupPhone());
    if (order.getPickupStoreId() != null) {
        ClothingStore store = clothingStoreService.findById(order.getPickupStoreId());
        if (store != null) {
            Map<String, Object> storeInfo = new HashMap<>();
            storeInfo.put("id", store.getId());
            storeInfo.put("name", store.getName());
            storeInfo.put("address", store.getAddress());
            storeInfo.put("phone", store.getPhone());
            storeInfo.put("businessHours", store.getBusinessHours());
            orderVo.put("pickupStore", storeInfo);
        }
    }
}
```

- [ ] **Step 2: 在 WxManagerOrderController 中注入 ClothingStoreService**

在字段声明区域添加：
```java
@Autowired
private ClothingStoreService clothingStoreService;
```

- [ ] **Step 3: 编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxManagerOrderController.java
git commit -m "feat: 管理端订单详情返回 deliveryType 和自提字段"
```

---

## Task 6: 小程序前端 - 确认订单页 JS 改造

**Files:**
- Modify: `clothing-mall-wx/pages/confirm_order/confirm_order.js`

- [ ] **Step 1: 扩展 data 字段**

在 `confirm_order.js` 的 `data` 对象中（第 9-33 行），在 `defaultImage` 之后添加：

```javascript
deliveryType: 'express',
storeList: [],
selectedStore: null,
showStorePicker: false,
```

- [ ] **Step 2: 修改 getCheckoutInfo 方法**

将整个 `getCheckoutInfo()` 方法（第 68-96 行）替换为：

```javascript
getCheckoutInfo() {
    let that = this
    util.request(api.CartCheckout, {
        cartId: that.data.cartId,
        addressId: that.data.addressId,
        couponId: that.data.couponId,
        userCouponId: that.data.userCouponId,
        deliveryType: that.data.deliveryType
    }).then(function(res) {
        if (res.errno === 0) {
            that.setData({
                checkedGoodsList: res.data.checkedGoodsList || [],
                checkedAddress: res.data.checkedAddress || {},
                availableCouponLength: res.data.availableCouponLength || 0,
                actualPrice: res.data.actualPrice || 0,
                couponPrice: res.data.couponPrice || 0,
                freightPrice: res.data.freightPrice || 0,
                goodsTotalPrice: res.data.goodsTotalPrice || 0,
                orderTotalPrice: res.data.orderTotalPrice || 0,
                addressId: res.data.addressId || 0,
                couponId: res.data.couponId || 0,
                userCouponId: res.data.userCouponId || 0
            })
            // 自提模式下存储门店列表
            if (res.data.stores) {
                that.setData({ storeList: res.data.stores || [] })
            }
        }
        wx.hideLoading()
    }).catch(function() {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
    })
},
```

- [ ] **Step 3: 新增配送方式切换方法**

在 `getCheckoutInfo()` 方法之后添加：

```javascript
switchDeliveryType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.deliveryType) return
    this.setData({
        deliveryType: type,
        selectedStore: null
    })
    this.getCheckoutInfo()
},
```

- [ ] **Step 4: 新增门店选择方法**

在 `switchDeliveryType()` 方法之后添加：

```javascript
openStorePicker() {
    if (this.data.storeList.length === 0) {
        wx.showToast({ title: '暂无可用门店', icon: 'none' })
        return
    }
    this.setData({ showStorePicker: true })
},

closeStorePicker() {
    this.setData({ showStorePicker: false })
},

selectStore(e) {
    const index = e.currentTarget.dataset.index
    const store = this.data.storeList[index]
    this.setData({
        selectedStore: store,
        showStorePicker: false
    })
},
```

- [ ] **Step 5: 修改 submitOrder 方法**

将 `submitOrder()` 方法（第 130-210 行）的地址校验和提交逻辑替换。从第 138 行开始：

原代码：
```javascript
if (!this.data.checkedAddress || !this.data.checkedAddress.id) {
    wx.showToast({ title: '请选择收货地址', icon: 'none' })
    return
}
```

替换为：
```javascript
if (!this.data.checkedAddress || !this.data.checkedAddress.id) {
    wx.showToast({ title: '请先添加收货地址', icon: 'none' })
    return
}
// 自提模式校验门店
if (this.data.deliveryType === 'pickup' && !this.data.selectedStore) {
    wx.showToast({ title: '请选择自提门店', icon: 'none' })
    return
}
```

将提交请求体（原第 146-151 行）：
```javascript
util.request(api.OrderSubmit, {
    cartId: that.data.cartId,
    addressId: that.data.addressId,
    couponId: that.data.couponId,
    userCouponId: that.data.userCouponId,
    message: that.data.message
}, 'POST')
```

替换为：
```javascript
const submitData = {
    cartId: that.data.cartId,
    addressId: that.data.addressId,
    couponId: that.data.couponId,
    userCouponId: that.data.userCouponId,
    message: that.data.message,
    deliveryType: that.data.deliveryType
}
if (that.data.deliveryType === 'pickup') {
    submitData.pickupStoreId = that.data.selectedStore.id
}
util.request(api.OrderSubmit, submitData, 'POST')
```

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-wx/pages/confirm_order/confirm_order.js
git commit -m "feat: 确认订单页支持配送方式切换、门店选择、自提下单"
```

---

## Task 7: 小程序前端 - 确认订单页模板改造

**Files:**
- Modify: `clothing-mall-wx/pages/confirm_order/confirm_order.wxml`

- [ ] **Step 1: 在地址卡片上方添加配送方式切换器**

在第 14 行 `<view class="content-wrap">` 之后、地址卡片之前，插入：

```xml
<!-- 配送方式切换 -->
<view class="delivery-tabs">
    <view class="tab {{deliveryType === 'express' ? 'active' : ''}}" bindtap="switchDeliveryType" data-type="express">快递配送</view>
    <view class="tab {{deliveryType === 'pickup' ? 'active' : ''}}" bindtap="switchDeliveryType" data-type="pickup">到店自提</view>
</view>
```

- [ ] **Step 2: 修改地址卡片，区分快递/自提显示**

将原地址卡片（第 16-30 行）：
```xml
<!-- 地址选择卡片 -->
<view class="card address-card" bindtap="selectAddress">
    <view class="address-left">
        <view class="location-icon"></view>
        <view class="address-info">
            <view class="address-detail" wx:if="{{checkedAddress.id}}">
                {{checkedAddress.province}}{{checkedAddress.city}}{{checkedAddress.county}}{{checkedAddress.addressDetail}}
            </view>
            <view class="address-detail" wx:else>请选择收货地址</view>
            <view class="address-user" wx:if="{{checkedAddress.id}}">
                {{checkedAddress.name}} {{checkedAddress.mobile}}
            </view>
        </view>
    </view>
    <view class="arrow"></view>
</view>
```

替换为：
```xml
<!-- 快递模式：地址选择卡片 -->
<view class="card address-card" wx:if="{{deliveryType === 'express'}}" bindtap="selectAddress">
    <view class="address-left">
        <view class="location-icon"></view>
        <view class="address-info">
            <view class="address-detail" wx:if="{{checkedAddress.id}}">
                {{checkedAddress.province}}{{checkedAddress.city}}{{checkedAddress.county}}{{checkedAddress.addressDetail}}
            </view>
            <view class="address-detail" wx:else>请选择收货地址</view>
            <view class="address-user" wx:if="{{checkedAddress.id}}">
                {{checkedAddress.name}} {{checkedAddress.mobile}}
            </view>
        </view>
    </view>
    <view class="arrow"></view>
</view>

<!-- 自提模式：联系人卡片（只显示姓名+手机号）+ 门店选择 -->
<view class="card pickup-contact-card" wx:if="{{deliveryType === 'pickup'}}">
    <view class="pickup-contact-row" bindtap="selectAddress">
        <view class="pickup-contact-info">
            <view class="pickup-contact-detail" wx:if="{{checkedAddress.id}}">
                {{checkedAddress.name}} {{checkedAddress.mobile}}
            </view>
            <view class="pickup-contact-detail" wx:else>请先添加收货地址</view>
        </view>
        <view class="arrow"></view>
    </view>
</view>

<view class="card store-select-card" wx:if="{{deliveryType === 'pickup'}}" bindtap="openStorePicker">
    <view class="store-select-info">
        <view class="store-select-label">自提门店</view>
        <view class="store-select-value" wx:if="{{selectedStore}}">{{selectedStore.name}}</view>
        <view class="store-select-value placeholder" wx:else>请选择门店</view>
    </view>
    <view class="arrow"></view>
</view>
```

- [ ] **Step 3: 修改运费显示，自提显示免运费**

将运费显示（第 59-62 行）：
```xml
<view class="fee-item">
    <text class="fee-label">运费</text>
    <text class="fee-value theme-color">￥{{freightPrice}}</text>
</view>
```

替换为：
```xml
<view class="fee-item">
    <text class="fee-label">运费</text>
    <text class="fee-value theme-color" wx:if="{{deliveryType === 'pickup'}}">免运费</text>
    <text class="fee-value theme-color" wx:else>￥{{freightPrice}}</text>
</view>
```

- [ ] **Step 4: 在底部安全区占位之前添加门店选择弹窗**

在第 98 行 `<!-- 底部安全区占位 -->` 之前插入：

```xml
<!-- 门店选择弹窗 -->
<view class="store-picker-mask" wx:if="{{showStorePicker}}" bindtap="closeStorePicker">
    <view class="store-picker" catchtap="">
        <view class="picker-header">
            <text class="picker-title">选择自提门店</text>
            <view class="picker-close" bindtap="closeStorePicker"></view>
        </view>
        <scroll-view scroll-y class="picker-list">
            <view class="store-option {{selectedStore && selectedStore.id === item.id ? 'selected' : ''}}" wx:for="{{storeList}}" wx:key="id" bindtap="selectStore" data-index="{{index}}">
                <view class="store-option-name">{{item.name}}</view>
                <view class="store-option-address">{{item.address}}</view>
                <view class="store-option-hours" wx:if="{{item.businessHours}}">{{item.businessHours}}</view>
            </view>
        </scroll-view>
    </view>
</view>
```

- [ ] **Step 5: Commit**

```bash
git add clothing-mall-wx/pages/confirm_order/confirm_order.wxml
git commit -m "feat: 确认订单页模板支持配送方式切换和门店选择弹窗"
```

---

## Task 8: 小程序前端 - 确认订单页样式

**Files:**
- Modify: `clothing-mall-wx/pages/confirm_order/confirm_order.wxss`

- [ ] **Step 1: 在文件末尾添加配送方式切换器样式**

在 `confirm_order.wxss` 末尾追加：

```css
/* ================== 配送方式切换 ================== */
.delivery-tabs {
    display: flex;
    background-color: #ffffff;
    border-radius: 20rpx;
    padding: 8rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.02);
}

.delivery-tabs .tab {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    font-size: 28rpx;
    color: #666666;
    border-radius: 16rpx;
    transition: all 0.2s;
}

.delivery-tabs .tab.active {
    background-color: #FF8096;
    color: #ffffff;
    font-weight: 500;
}

/* ================== 自提联系人卡片 ================== */
.pickup-contact-card {
    padding: 32rpx;
}

.pickup-contact-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.pickup-contact-info {
    display: flex;
    flex-direction: column;
}

.pickup-contact-detail {
    font-size: 28rpx;
    color: #333333;
}

/* ================== 门店选择卡片 ================== */
.store-select-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
}

.store-select-info {
    display: flex;
    flex-direction: column;
}

.store-select-label {
    font-size: 24rpx;
    color: #999999;
    margin-bottom: 8rpx;
}

.store-select-value {
    font-size: 28rpx;
    color: #333333;
    font-weight: 500;
}

.store-select-value.placeholder {
    color: #999999;
    font-weight: normal;
}

/* ================== 门店选择弹窗 ================== */
.store-picker-mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 900;
}

.store-picker {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: #ffffff;
    border-radius: 32rpx 32rpx 0 0;
    z-index: 1000;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
}

.picker-header {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100rpx;
    position: relative;
    border-bottom: 1rpx solid #f0f0f0;
    flex-shrink: 0;
}

.picker-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
}

.picker-close {
    position: absolute;
    right: 32rpx;
    top: 50%;
    transform: translateY(-50%);
    width: 36rpx;
    height: 36rpx;
}

.picker-close::before,
.picker-close::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2rpx;
    background-color: #999999;
}

.picker-close::before {
    transform: translateY(-50%) rotate(45deg);
}

.picker-close::after {
    transform: translateY(-50%) rotate(-45deg);
}

.picker-list {
    flex: 1;
    padding: 24rpx 32rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.store-option {
    padding: 24rpx;
    margin-bottom: 16rpx;
    background-color: #f7f8fa;
    border-radius: 16rpx;
    border: 2rpx solid transparent;
}

.store-option.selected {
    border-color: #FF8096;
    background-color: #fff5f7;
}

.store-option-name {
    font-size: 30rpx;
    font-weight: 500;
    color: #333333;
    margin-bottom: 8rpx;
}

.store-option-address {
    font-size: 24rpx;
    color: #666666;
    margin-bottom: 4rpx;
}

.store-option-hours {
    font-size: 22rpx;
    color: #999999;
}
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-wx/pages/confirm_order/confirm_order.wxss
git commit -m "feat: 确认订单页新增配送方式切换器和门店选择样式"
```

---

## Task 9: 管理端 - 订单详情模板区分自提/快递

**Files:**
- Modify: `clothing-mall-wx/pages/manager/orderDetail/orderDetail.wxml`
- Modify: `clothing-mall-wx/pages/manager/orderDetail/orderDetail.js`

- [ ] **Step 1: 修改管理端订单详情模板的收货信息区域**

将 `orderDetail.wxml` 第 7-14 行（收货信息区域）：

```xml
<!-- 收货信息 -->
<view class="address-section">
    <view class="address-info">
        <text class="name">{{order.consignee}}</text>
        <text class="mobile">{{order.mobile}}</text>
    </view>
    <text class="address">{{order.address}}</text>
</view>
```

替换为：

```xml
<!-- 收货信息（快递订单） -->
<view class="address-section" wx:if="{{order.deliveryType !== 'pickup'}}">
    <view class="address-info">
        <text class="name">{{order.consignee}}</text>
        <text class="mobile">{{order.mobile}}</text>
    </view>
    <text class="address">{{order.address}}</text>
</view>

<!-- 自提信息（自提订单） -->
<view class="pickup-section" wx:if="{{order.deliveryType === 'pickup'}}">
    <view class="info-item">
        <text class="label">取货码</text>
        <text class="value pickup-code">{{order.pickupCode}}</text>
    </view>
    <view class="info-item">
        <text class="label">联系人</text>
        <text class="value">{{order.pickupContact}}</text>
    </view>
    <view class="info-item">
        <text class="label">联系电话</text>
        <text class="value">{{order.pickupPhone}}</text>
    </view>
    <view class="info-item" wx:if="{{order.pickupStore}}">
        <text class="label">自提门店</text>
        <text class="value">{{order.pickupStore.name}}</text>
    </view>
    <view class="info-item" wx:if="{{order.pickupStore}}">
        <text class="label">门店地址</text>
        <text class="value">{{order.pickupStore.address}}</text>
    </view>
</view>
```

- [ ] **Step 2: 扩展核销信息显示范围**

将第 62-69 行（核销信息区域）：

```xml
<!-- 核销信息（待核销时显示） -->
<view class="info-section" wx:if="{{order.orderStatus === 501}}">
```

替换为：

```xml
<!-- 核销信息（待核销和已核销时显示） -->
<view class="info-section" wx:if="{{order.orderStatus === 501 || order.orderStatus === 502}}">
```

- [ ] **Step 3: 修改操作按钮，自提订单 201 状态不显示发货按钮**

将第 102-106 行（201 已付款的操作按钮）：

```xml
<!-- 201 已付款：发货、取消 -->
<block wx:if="{{order.orderStatus === 201}}">
    <view class="action-btn btn-cancel" bindtap="handleCancel">取消订单</view>
    <view class="action-btn btn-primary" bindtap="handleShip">发货</view>
</block>
```

替换为：

```xml
<!-- 201 已付款：发货（快递）/ 待流转（自提）、取消 -->
<block wx:if="{{order.orderStatus === 201}}">
    <view class="action-btn btn-cancel" bindtap="handleCancel">取消订单</view>
    <view class="action-btn btn-primary" wx:if="{{order.deliveryType !== 'pickup'}}" bindtap="handleShip">发货</view>
</block>
```

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-wx/pages/manager/orderDetail/orderDetail.wxml
git commit -m "feat: 管理端订单详情区分自提/快递展示，自提订单隐藏发货按钮"
```

---

## Task 10: 后端全量编译和集成验证

**Files:** 无新文件，验证所有改动

- [ ] **Step 1: 全量编译**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn clean compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 2: 打包验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn clean package -DskipTests -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: 更新设计文档状态**

将 `docs/superpowers/specs/2026-04-03-pickup-delivery-flow-design.md` 中的 `**状态**: 待实施` 改为 `**状态**: 已实施`
