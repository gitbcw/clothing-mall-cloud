# 优惠券首页弹窗功能设计

## 概述

在小程序首页增加优惠券弹窗，管理端可标记某张券为"弹窗推荐"，用户进入首页时自动弹出领取。

## 现有能力

项目中已有完整的优惠券体系：
- 管理端 CRUD（`admin-marketing` 云函数 + `coupon.vue`）
- 小程序领券/兑换/我的券（`wx-coupon` 云函数）
- 下单选券与折扣计算（`coupon-verify.js`）
- 定时任务：过期处理、生日券发放（`task-coupon`）

**仅缺少**：首页弹窗展示环节。

## 改动范围

| 层 | 改动 | 涉及文件 |
|---|---|---|
| 数据库 | `litemall_coupon` 新增 `popup` 字段 | DDL |
| 管理后台 | 优惠券表单加"弹窗推荐"开关 | `coupon.vue` |
| 云函数 | `wx-coupon` 新增 `popup` 接口 | `wx-coupon/service/coupon.js`, `wx-coupon/index.js` |
| 小程序 | 新建 `coupon-popup` 组件，首页集成 | 新建组件 + 改 `index.js/wxml/json` |

## 详细设计

### 1. 数据库

```sql
ALTER TABLE litemall_coupon ADD COLUMN popup TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否弹窗推荐 0否1是';
```

### 2. 管理后台

文件：`clothing-mall-admin/src/views/promotion/coupon.vue`

在创建/编辑弹窗表单中，新增 `el-switch` 控件：
- 绑定字段：`popup`
- 关闭 = 0，开启 = 1
- 位置：放在"发行数量"字段旁，与现有表单风格一致

### 3. 云函数

文件：`cloudfunctions/wx-coupon/service/coupon.js` + `index.js`

新增 `popup` action：
- 无需登录（公开接口）
- 查询条件：`type = 0 AND status = 0 AND popup = 1 AND (total = 0 OR total > 已领取数) AND 未过期`
- 返回：最多 3 张券的基本信息（id, name, desc, tag, discount, discountType, min, days, startTime, endTime）
- 排序：按 `add_time DESC`

### 4. 小程序弹窗组件

新建 `components/coupon-popup/` 目录，含 `.js/.wxml/.wxss/.json` 四个文件。

#### 组件属性

| 属性 | 类型 | 说明 |
|---|---|---|
| show | Boolean | 控制显隐 |
| coupons | Array | 弹窗券列表 |

#### 组件事件

| 事件 | 参数 | 说明 |
|---|---|---|
| close | - | 关闭弹窗 |
| receive | { couponId } | 点击领取 |

#### 视觉设计

- 居中弹出卡片，宽约 560rpx
- 卡片背景：渐变色装饰（如粉橘渐变），营造优惠氛围
- 顶部：装饰性标题区（"专属优惠"），带图形点缀
- 中部：优惠券信息
  - 金额/折扣（大字号突出，如"¥20"或"8折"）
  - 使用条件（如"满199可用"）
  - 有效期
- 底部：醒目的"立即领取"按钮
- 多张券：swiper 左右滑动切换，底部圆点指示器
- 右上角 X 关闭按钮
- 遮罩层：半透明黑色

#### 交互逻辑

```
首页 onShow
  → 调用 wx-coupon popup 接口（公开）
  → 无券或未登录 → 不弹
  → 已登录 → 过滤已领取 + 本地缓存已展示的券
  → 有剩余券 → 弹出 coupon-popup
  → 用户点击领取 → 调用 wx-coupon receive（需登录）
  → 成功 → 按钮变为"已领取"状态
  → 关闭弹窗 → 缓存已展示的券 ID（过期时间：当天结束）
```

#### 防重复弹出策略

- 本地缓存 key：`popup_coupon_shown_<couponId>`
- 值：展示当天的日期字符串 `YYYY-MM-DD`
- 每次弹窗前检查：若缓存值等于今天日期，则不再弹该券
- 天然实现"同一张券每天最多弹一次"

### 5. 首页集成

文件：`pages/index/index.js` + `index.wxml` + `index.json`

- `index.json`：注册 `coupon-popup` 组件
- `index.js`：
  - `onShow` 中调用弹窗券查询
  - 新增 `loadPopupCoupons` 方法
  - 新增 `onCouponReceive`、`onCouponPopupClose` 事件处理
- `index.wxml`：在页面底部添加 `<coupon-popup>` 组件

## 数据流

```
管理端创建券 → 标记 popup=1 → 存入 litemall_coupon
                     ↓
首页 onShow → wx-coupon popup(公开) → 获取弹窗券列表
                     ↓
         过滤已领取 + 今日已展示
                     ↓
         有券 → 弹出 coupon-popup
                     ↓
用户点击领取 → wx-coupon receive(需登录) → 写入 litemall_coupon_user
```

## 风险与回滚

- **风险**：弹窗频率过高影响用户体验 → 缓存策略控制同一券每天只弹一次
- **回滚**：管理端关闭券的 popup 开关即可停止弹窗，无需发版
