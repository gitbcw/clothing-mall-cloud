# 优惠券体系统一实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首单立减、注册券、新人券统一为 type=1 新人券，优惠券管理为唯一管理入口，系统配置只保留生日券开关。

**Architecture:** 前端改 couponManage/couponEdit/systemConfig 三个页面，后端改 wx-auth（注册发券）、wx-cart/wx-order（移除首单立减）、wx-coupon（类型校验）、wx-manager-marketing + admin-marketing（popup 字段）。数据库不改表结构。

**Tech Stack:** 微信小程序云函数（Node.js）、MySQL、小程序原生框架

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `cloudfunctions/wx-manager-marketing/service/coupon.js` | 修改 | create/update 添加 popup 字段读写 |
| `cloudfunctions/admin-marketing/service/coupon.js` | 修改 | 同上（代码相同） |
| `cloudfunctions/wx-auth/index.js` | 修改 | ensureUser() 后自动发放 type=1 券 |
| `cloudfunctions/wx-cart/service/cart.js` | 修改 | 移除 newuserDiscount 逻辑 |
| `cloudfunctions/wx-order/service/order.js` | 修改 | 移除 newuserDiscount 逻辑 |
| `cloudfunctions/wx-coupon/service/coupon.js` | 修改 | type=1 新人券选券时校验首单 |
| `clothing-mall-wx/pages/manager/couponManage/couponManage.js` | 修改 | 更新 TYPE_TABS |
| `clothing-mall-wx/pages/manager/couponEdit/couponEdit.js` | 修改 | 更新类型选项，添加 popup 字段 |
| `clothing-mall-wx/pages/manager/couponEdit/couponEdit.wxml` | 修改 | 添加 popup 开关控件 |
| `clothing-mall-wx/pages/manager/couponEdit/couponEdit.wxss` | 修改 | popup 开关样式（已有 toggle-switch 可复用） |
| `clothing-mall-wx/pages/manager/systemConfig/systemConfig.js` | 修改 | 添加生日券配置区块 |
| `clothing-mall-wx/pages/manager/systemConfig/systemConfig.wxml` | 修改 | 添加生日券配置 UI |
| `clothing-mall-wx/pages/manager/systemConfig/systemConfig.wxss` | 修改 | 生日券配置样式 |

---

## Task 1: 云函数 — 添加 popup 字段读写

**Files:**
- Modify: `cloudfunctions/wx-manager-marketing/service/coupon.js`
- Modify: `cloudfunctions/admin-marketing/service/coupon.js`

两个文件代码结构相同，改法一致。

- [ ] **Step 1: wx-manager-marketing create 接口添加 popup**

在 `service/coupon.js` 的 `create` 方法中，解构添加 `popup` 字段，INSERT 语句添加 `popup` 列。

找到 create 方法中的解构行（约第 69-71 行）：
```javascript
const { name, type, desc, tag, total, discount, min, limit, status, timeType, days, startTime, endTime, discountType, itemLimit, goodsType, goodsValue, code } = data
```

改为：
```javascript
const { name, type, desc, tag, total, discount, min, limit, status, timeType, days, startTime, endTime, discountType, itemLimit, goodsType, goodsValue, code, popup } = data
```

找到 INSERT SQL（约第 75-80 行），在 `code` 后添加 `popup`：
```sql
INSERT INTO litemall_coupon (name, `type`, `desc`, tag, total, discount, min, `limit`, status, time_type, days, start_time, end_time, discount_type, item_limit, goods_type, goods_value, code, popup)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

对应的参数数组末尾添加 `popup || 0`。

- [ ] **Step 2: wx-manager-marketing update 接口添加 popup**

在 `update` 方法中，找到动态 SET 字段构建的位置（约第 108-128 行），在末尾 `if (code !== undefined)` 块之后添加：
```javascript
if (popup !== undefined) {
  fields.push('popup = ?')
  values.push(popup ? 1 : 0)
}
```

同时确保解构行包含 `popup`。

- [ ] **Step 3: admin-marketing 同步改动**

对 `cloudfunctions/admin-marketing/service/coupon.js` 执行完全相同的改动。

- [ ] **Step 4: 部署两个云函数并验证**

```
manageFunctions(action=updateFunctionCode, functionName=wx-manager-marketing, functionRootPath=cloudfunctions/)
manageFunctions(action=updateFunctionCode, functionName=admin-marketing, functionRootPath=cloudfunctions/)
```

通过小程序管理端创建一张通用券，popup 设为 1，然后读取确认 popup 字段已保存。

- [ ] **Step 5: 提交**

```
git add cloudfunctions/wx-manager-marketing/ cloudfunctions/admin-marketing/
git commit -m "feat: coupon create/update 添加 popup 字段读写"
```

---

## Task 2: 云函数 — 注册自动发新人券

**Files:**
- Modify: `cloudfunctions/wx-auth/index.js`

- [ ] **Step 1: 在 ensureUser 中添加注册发券逻辑**

在 `index.js` 的 `ensureUser(openId)` 函数中，找到 INSERT 成功后 SELECT 用户记录的位置（约第 75-79 行之后）。在返回用户记录之前，添加新人券发放逻辑：

```javascript
// ---------- 注册成功：自动发放新人券 (type=1) ----------
try {
  const coupons = await db.query(
    `SELECT id, days, time_type, start_time, end_time FROM litemall_coupon
     WHERE type = 1 AND status = 0 AND deleted = 0`
  )
  for (const coupon of coupons) {
    let startTime = new Date()
    let endTime = new Date()
    if (coupon.time_type === 0 && coupon.days > 0) {
      endTime.setDate(endTime.getDate() + coupon.days)
    } else if (coupon.time_type === 1 && coupon.start_time) {
      startTime = new Date(coupon.start_time)
      endTime = coupon.end_time ? new Date(coupon.end_time) : new Date(startTime.getTime() + 365 * 24 * 3600 * 1000)
    } else {
      endTime.setFullYear(endTime.getFullYear() + 1)
    }
    await db.query(
      `INSERT INTO litemall_coupon_user (coupon_id, user_id, status, start_time, end_time, add_time, update_time, deleted)
       VALUES (?, ?, 0, ?, ?, NOW(), NOW(), 0)
       ON DUPLICATE KEY UPDATE update_time = NOW()`,
      [coupon.id, userId, startTime, endTime]
    )
  }
} catch (e) {
  console.error('register auto coupon error:', e)
}
```

注意：`userId` 是 ensureUser 内已有的变量（INSERT 后 SELECT 得到）。

- [ ] **Step 2: 部署并验证**

```
manageFunctions(action=updateFunctionCode, functionName=wx-auth, functionRootPath=cloudfunctions/)
```

先在优惠券管理中创建一张 type=1 的新人券。然后用一个新微信用户登录小程序，检查 `litemall_coupon_user` 表中是否自动有了该券记录。

- [ ] **Step 3: 提交**

```
git add cloudfunctions/wx-auth/
git commit -m "feat: 注册成功自动发放新人券 (type=1)"
```

---

## Task 3: 云函数 — 移除首单立减逻辑

**Files:**
- Modify: `cloudfunctions/wx-cart/service/cart.js`
- Modify: `cloudfunctions/wx-order/service/order.js`

- [ ] **Step 1: wx-cart 移除 newuserDiscount**

在 `cart.js` 的 `checkout` 函数中：

1. 删除第 511-523 行的首单立减计算块（`// ---------- 5. 新人首单立减 ----------` 到 `if (discount > 0) newuserDiscount = discount }`）
2. 删除第 530 行的 `Math.min(newuserDiscount, ...)` 钳制行
3. 修改第 531 行的最终价格计算，移除 `newuserDiscount`：
   ```javascript
   // 原: orderTotalPrice = Math.max(0, checkedGoodsPrice + freightPrice - finalCouponPrice - clampedNewuserDiscount)
   // 改:
   orderTotalPrice = Math.max(0, checkedGoodsPrice + freightPrice - finalCouponPrice)
   ```
4. 删除返回对象中的 `newuserDiscount` 字段（约第 545 行）
5. 删除 `let newuserDiscount = 0` 声明

- [ ] **Step 2: wx-order 移除 newuserDiscount**

在 `order.js` 的 `submit` 函数中：

1. 删除第 288-299 行的首单立减计算块
2. 修改第 309 行的最终价格计算，移除 `newuserDiscount`：
   ```javascript
   // 原: orderTotalPrice = Math.max(0, checkedGoodsPrice + freightPrice - couponPrice - newuserDiscount)
   // 改:
   orderTotalPrice = Math.max(0, checkedGoodsPrice + freightPrice - couponPrice)
   ```
3. 删除 `let newuserDiscount = 0` 声明
4. 删除 order 插入 SQL 中与 `newuser_discount` 相关的字段（如有）

- [ ] **Step 3: 部署并验证**

```
manageFunctions(action=updateFunctionCode, functionName=wx-cart, functionRootPath=cloudfunctions/)
manageFunctions(action=updateFunctionCode, functionName=wx-order, functionRootPath=cloudfunctions/)
```

在小程序中操作购物车结算，确认价格计算正常，不再出现 newuserDiscount。

- [ ] **Step 4: 提交**

```
git add cloudfunctions/wx-cart/ cloudfunctions/wx-order/
git commit -m "feat: 移除首单立减逻辑，统一走新人券抵扣"
```

---

## Task 4: 云函数 — 新人券选券校验

**Files:**
- Modify: `cloudfunctions/wx-coupon/service/coupon.js`

- [ ] **Step 1: checkCouponAvailable 添加 type=1 首单校验**

在 `coupon.js` 的 `checkCouponAvailable` 函数中（约第 398-447 行），在生日券校验（第 413-424 行）之后添加：

```javascript
// ---------- 新人券首单校验 ----------
if (coupon.type === 1) {
  const cancelStatuses = [102, 103, 104, 203]
  const orderCountRows = await db.query(
    `SELECT COUNT(*) as total FROM litemall_order
     WHERE user_id = ? AND deleted = 0 AND order_status NOT IN (?)`,
    [userId, cancelStatuses.join(',')]
  )
  if (orderCountRows[0].total > 0) {
    return { available: false, reason: '仅限首单使用' }
  }
}
```

注意：此处的 `userId` 需要从函数参数传入。当前 `checkCouponAvailable` 签名是 `(userId, coupon, couponUser, checkedGoodsPrice, cartList)`，已有 userId 参数。

- [ ] **Step 2: 部署并验证**

```
manageFunctions(action=updateFunctionCode, functionName=wx-coupon, functionRootPath=cloudfunctions/)
```

用已有订单的用户账号下单选券，确认 type=1 券不在可用列表中。用新用户确认 type=1 券可用。

- [ ] **Step 3: 提交**

```
git add cloudfunctions/wx-coupon/
git commit -m "feat: 新人券 (type=1) 选券时校验首单"
```

---

## Task 5: 前端 — couponManage 更新 Tab

**Files:**
- Modify: `clothing-mall-wx/pages/manager/couponManage/couponManage.js`

- [ ] **Step 1: 更新 TYPE_TABS 常量**

将 `couponManage.js` 顶部的 `TYPE_TABS` 从：
```javascript
var TYPE_TABS = [
  { key: -1, label: '全部' },
  { key: 0, label: '通用' },
  { key: 1, label: '注册' },
  { key: 2, label: '兑换' },
  { key: 3, label: '新人' },
  { key: 4, label: '生日' }
];
```

改为：
```javascript
var TYPE_TABS = [
  { key: -1, label: '全部' },
  { key: 0, label: '通用' },
  { key: 1, label: '新人' },
  { key: 2, label: '兑换' },
  { key: 4, label: '生日' }
];
```

- [ ] **Step 2: 更新 WXML 中的类型标签映射**

在 `couponManage.wxml` 的类型标签 text 中，将三元表达式更新：

```html
{{item.type === 0 ? '通用' : item.type === 1 ? '新人' : item.type === 2 ? '兑换' : item.type === 4 ? '生日' : '其他'}}
```

- [ ] **Step 3: 提交**

```
git add clothing-mall-wx/pages/manager/couponManage/
git commit -m "feat: couponManage Tab 更新为通用/新人/兑换/生日"
```

---

## Task 6: 前端 — couponEdit 更新类型选项 + popup 开关

**Files:**
- Modify: `clothing-mall-wx/pages/manager/couponEdit/couponEdit.js`
- Modify: `clothing-mall-wx/pages/manager/couponEdit/couponEdit.wxml`

- [ ] **Step 1: 更新类型选项**

在 `couponEdit.js` 顶部，将 `TYPE_OPTIONS` 从：
```javascript
var TYPE_OPTIONS = ['通用领券', '注册赠券', '兑换码', '新人专享', '生日专属'];
```

改为：
```javascript
var TYPE_OPTIONS = ['通用领券', '新人券', '兑换码', '生日专属'];
```

对应的 type 值映射：索引 0→type=0, 1→type=1, 2→type=2, 3→type=4。

注意：这改变了 type 值的映射关系。需要在 JS 中添加一个映射数组：
```javascript
var TYPE_MAP = [0, 1, 2, 4]; // 索引到实际 type 值的映射
```

然后修改表单相关逻辑：
- `onTypeConfirm`：`'form.type': parseInt(idx)` → `'form.type': TYPE_MAP[parseInt(idx)]`
- `loadCoupon` 中加载编辑数据时，需要反向映射 type 值到 picker 索引：
  ```javascript
  var pickerIndex = TYPE_MAP.indexOf(c.type || 0)
  ```
- WXML 中 picker-view 的 `value` 需要使用映射后的索引

- [ ] **Step 2: 添加 popup 字段到表单**

在 `couponEdit.js` 的 `data.form` 中添加 `popup: 0`。

在 `loadCoupon` 加载编辑数据时添加：
```javascript
popup: c.popup || 0
```

添加输入处理方法：
```javascript
onTogglePopup: function() {
  this.setData({ 'form.popup': this.data.form.popup === 0 ? 1 : 0 });
},
```

在 `onSave` 的 `requestData` 中添加 `popup: form.popup || 0`。

- [ ] **Step 3: WXML 添加 popup 开关**

在 WXML 的"发行设置"区块中（发行总量 form-item 之后），添加：

```html
<!-- 弹窗推荐（仅通用券） -->
<view class="form-item" wx:if="{{form.type === 0}}" bindtap="onTogglePopup">
  <text class="form-label">弹窗推荐</text>
  <text class="form-value">{{form.popup === 1 ? '已开启' : '已关闭'}}</text>
  <view class="toggle-switch {{form.popup === 1 ? 'switch-on' : 'switch-off'}}">
    <view class="switch-dot"></view>
  </view>
</view>
```

- [ ] **Step 4: 提交**

```
git add clothing-mall-wx/pages/manager/couponEdit/
git commit -m "feat: couponEdit 类型选项更新 + popup 开关"
```

---

## Task 7: 前端 — systemConfig 添加生日券配置

**Files:**
- Modify: `clothing-mall-wx/pages/manager/systemConfig/systemConfig.js`
- Modify: `clothing-mall-wx/pages/manager/systemConfig/systemConfig.wxml`
- Modify: `clothing-mall-wx/pages/manager/systemConfig/systemConfig.wxss`

- [ ] **Step 1: JS 添加生日券配置逻辑**

在 `systemConfig.js` 中：

1. `data` 中添加：
```javascript
birthdayEnabled: false,
birthdayCouponId: '',
birthdayDays: 30,
birthdayCouponList: [],  // type=4 的券列表供选择
```

2. `loadConfig()` 中，在现有加载之后添加加载 promotion 配置组：
```javascript
// 加载生日券配置
util.request(api.ManagerSystemConfigList, { group: 'promotion' }, 'GET').then(function(res) {
  var configs = res.data || {};
  that.setData({
    birthdayEnabled: configs['litemall_birthday_coupon_coupon_status'] === '1',
    birthdayCouponId: configs['litemall_birthday_coupon_id'] || '',
    birthdayDays: parseInt(configs['litemall_birthday_coupon_days']) || 30
  });
});

// 加载 type=4 优惠券列表供选择
util.request(api.ManagerCouponList, { type: 4, limit: 50 }, 'GET').then(function(res) {
  that.setData({
    birthdayCouponList: (res.data || {}).list || []
  });
});
```

3. 添加方法：
```javascript
onToggleBirthday: function() {
  this.setData({ birthdayEnabled: !this.data.birthdayEnabled });
},

onBirthdayCouponChange: function(e) {
  this.setData({ birthdayCouponId: e.detail.value });
},

onBirthdayDaysInput: function(e) {
  this.setData({ birthdayDays: e.detail.value });
},
```

4. `onSave()` 中，在现有保存之后追加保存 promotion 配置：
```javascript
var promotionConfigs = {
  'litemall_birthday_coupon_coupon_status': that.data.birthdayEnabled ? '1' : '0',
  'litemall_birthday_coupon_id': that.data.birthdayCouponId || '',
  'litemall_birthday_coupon_days': String(that.data.birthdayDays || 30)
};
util.request(api.ManagerSystemConfigUpdate, { group: 'promotion', configs: promotionConfigs }, 'POST').then(function() {
  wx.showToast({ title: '生日券配置已保存', icon: 'success' });
});
```

- [ ] **Step 2: WXML 添加生日券配置区块**

在 `systemConfig.wxml` 的活动位背景图区块之后，添加：

```html
<!-- 生日券配置 -->
<view class="config-section">
  <view class="section-header">
    <view class="section-accent"></view>
    <text class="section-title">生日券配置</text>
  </view>
  <view class="config-card">
    <!-- 开关 -->
    <view class="form-item" bindtap="onToggleBirthday">
      <text class="form-label">启用生日券</text>
      <text class="form-value">{{birthdayEnabled ? '已开启' : '已关闭'}}</text>
      <view class="toggle-switch {{birthdayEnabled ? 'switch-on' : 'switch-off'}}">
        <view class="switch-dot"></view>
      </view>
    </view>

    <!-- 关联优惠券 -->
    <view class="form-item" wx:if="{{birthdayEnabled}}">
      <text class="form-label">关联优惠券</text>
      <picker range="{{birthdayCouponList}}" range-key="name" value="{{birthdayCouponId}}" bindchange="onBirthdayCouponChange">
        <text class="{{birthdayCouponId ? 'form-value' : 'form-placeholder'}}">
          {{birthdayCouponList.length > 0 ? (birthdayCouponId ? birthdayCouponList[birthdayCouponList.findIndex(function(c){return c.id == birthdayCouponId})].name : '请选择优惠券') : '请先创建生日券'}}
        </text>
      </picker>
      <text class="form-arrow">></text>
    </view>

    <!-- 有效天数 -->
    <view class="form-item" wx:if="{{birthdayEnabled}}">
      <text class="form-label">发放后有效天数</text>
      <input class="form-input" type="number" placeholder="30" value="{{birthdayDays}}" bindinput="onBirthdayDaysInput" />
    </view>
  </view>
</view>
```

- [ ] **Step 3: 添加必要的样式**

在 `systemConfig.wxss` 中添加 section-header/accent 样式（复用 couponEdit 的设计语言）：

```css
.config-section {
  padding: 12rpx 0;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 16rpx 0 12rpx;
}

.section-accent {
  width: 6rpx;
  height: 28rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #FF8096, #FFB3C1);
  margin-right: 14rpx;
}

.section-title {
  font-size: 26rpx;
  color: #1A1A1A;
  font-weight: 600;
}

.config-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.03);
}

.form-item {
  display: flex;
  align-items: center;
  padding: 30rpx 32rpx;
  border-bottom: 1rpx solid #F5F3F0;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  flex-shrink: 0;
  width: 200rpx;
}

.form-value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #1A1A1A;
  font-weight: 500;
}

.form-placeholder {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #CCC;
}

.form-input {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #1A1A1A;
}

.form-arrow {
  font-size: 24rpx;
  color: #CCC;
  margin-left: 8rpx;
}

/* toggle-switch 样式与 couponEdit 一致 */
.toggle-switch {
  width: 92rpx; height: 50rpx;
  border-radius: 25rpx; position: relative;
  transition: background 0.3s;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.switch-on {
  background: #FF8096;
  box-shadow: 0 2rpx 8rpx rgba(255, 128, 150, 0.3);
}

.switch-off { background: #E0E0E0; }

.switch-dot {
  width: 42rpx; height: 42rpx; border-radius: 50%; background: #FFFFFF;
  position: absolute; top: 4rpx; transition: left 0.3s;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.switch-on .switch-dot { left: 46rpx; }
.switch-off .switch-dot { left: 4rpx; }
```

- [ ] **Step 4: 提交**

```
git add clothing-mall-wx/pages/manager/systemConfig/
git commit -m "feat: systemConfig 添加生日券配置区块"
```

---

## Task 8: 端到端验证 + 文档更新

- [ ] **Step 1: 全链路验证**

1. 在小程序管理端 → 优惠券管理 → 创建"新人券"（type=1），设置金额和门槛
2. 用新微信用户登录 → 检查"我的优惠券"中是否自动有新人券
3. 用该用户下单 → 确认新人券可用 → 完成订单
4. 再次下单 → 确认新人券不可用（首单校验）
5. 创建通用券并开启弹窗推荐 → 登录首页 → 确认弹窗出现
6. 系统配置 → 生日券配置 → 开关/关联券/天数 → 保存 → 确认持久化

- [ ] **Step 2: 更新 docs/current/INDEX.md**

在 INDEX.md 中更新优惠券相关条目的状态，标注首单立减已移除、新人券统一、popup 开关已添加。

- [ ] **Step 3: 最终提交**

```
git add docs/current/INDEX.md
git commit -m "docs: 更新优惠券体系统一后的进度"
```
