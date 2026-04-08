# 收藏/优惠券/足迹功能修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复用户中心收藏/优惠券/足迹三个功能的 5 个 bug/UX 问题

**Architecture:** 纯修复任务，不涉及新功能。后端修 2 个 Controller，前端改 3 个页面文件。无数据库变更，无 API 接口变更。

**Tech Stack:** Java (Spring Boot), 微信小程序 (WXML/WXSS/JS)

---

### Task 1: 修复专题收藏 subtitle 取值错误

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxCollectController.java:88`

- [ ] **Step 1: 修改 subtitle 取值**

将第 88 行的 `topic.getTitle()` 改为 `topic.getSubtitle()`：

```java
// 修改前
c.put("subtitle", topic.getTitle());
// 修改后
c.put("subtitle", topic.getSubtitle());
```

- [ ] **Step 2: 验证编译通过**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`

---

### Task 2: 移除优惠券无效的 pic 图片标签

**Files:**
- Modify: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxml:45-48`
- Modify: `clothing-mall-wx/pages/ucenter/couponSelect/couponSelect.wxml:20-23`

- [ ] **Step 1: 移除 couponList.wxml 中的 pic image 标签**

将 `.condition` 区域从：
```xml
<view class="condition">
  <text class="txt">{{item.desc}}</text>
  <image src="{{item.pic}}" class="icon"></image>
</view>
```

改为：
```xml
<view class="condition">
  <text class="txt">{{item.desc}}</text>
</view>
```

- [ ] **Step 2: 移除 couponSelect.wxml 中的 pic image 标签**

同样将 `.condition` 区域从：
```xml
<view class="condition">
  <text class="txt">{{item.desc}}</text>
  <image src="{{item.pic}}" class="icon"></image>
</view>
```

改为：
```xml
<view class="condition">
  <text class="txt">{{item.desc}}</text>
</view>
```

- [ ] **Step 3: 清理 couponList.wxss 中无用的 .icon 样式**

删除 `.container .b .condition .icon` 样式块（第 208-212 行）：
```css
/* 删除以下样式 */
.container .b .condition .icon {
  margin-left: 30rpx;
  width: 24rpx;
  height: 24rpx;
}
```

---

### Task 3: 优化足迹列表 N+1 查询

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxFootprintController.java:85-103`

- [ ] **Step 1: 添加 import**

在文件顶部 import 区域添加 `java.util.stream.Collectors`：
```java
import java.util.stream.Collectors;
```

- [ ] **Step 2: 重写 list 方法中的商品查询逻辑**

将第 85-103 行从：
```java
List<LitemallFootprint> footprintList = footprintService.queryByAddTime(userId, page, limit);

List<Object> footprintVoList = new ArrayList<>(footprintList.size());
for (LitemallFootprint footprint : footprintList) {
    Map<String, Object> c = new HashMap<String, Object>();
    c.put("id", footprint.getId());
    c.put("goodsId", footprint.getGoodsId());
    c.put("addTime", footprint.getAddTime());

    LitemallGoods goods = goodsService.findById(footprint.getGoodsId());
    c.put("name", goods.getName());
    c.put("brief", goods.getBrief());
    c.put("picUrl", goods.getPicUrl());
    c.put("retailPrice", goods.getRetailPrice());

    footprintVoList.add(c);
}

return ResponseUtil.okList(footprintVoList, footprintList);
```

改为：
```java
List<LitemallFootprint> footprintList = footprintService.queryByAddTime(userId, page, limit);

// 批量查询商品信息，避免 N+1
List<Integer> goodsIds = footprintList.stream()
        .map(LitemallFootprint::getGoodsId)
        .collect(Collectors.toList());
List<LitemallGoods> goodsList = goodsService.queryByIds(goodsIds);
Map<Integer, LitemallGoods> goodsMap = goodsList.stream()
        .collect(Collectors.toMap(LitemallGoods::getId, g -> g));

List<Object> footprintVoList = new ArrayList<>(footprintList.size());
for (LitemallFootprint footprint : footprintList) {
    Map<String, Object> c = new HashMap<String, Object>();
    c.put("id", footprint.getId());
    c.put("goodsId", footprint.getGoodsId());
    c.put("addTime", footprint.getAddTime());

    LitemallGoods goods = goodsMap.get(footprint.getGoodsId());
    c.put("name", goods.getName());
    c.put("brief", goods.getBrief());
    c.put("picUrl", goods.getPicUrl());
    c.put("retailPrice", goods.getRetailPrice());

    footprintVoList.add(c);
}

return ResponseUtil.okList(footprintVoList, footprintList);
```

- [ ] **Step 3: 验证编译通过**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q`

---

### Task 4: 添加优惠券列表空状态提示

**Files:**
- Modify: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxml`
- Modify: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxss`

- [ ] **Step 1: 在 couponList.wxml 的 scroll-view 内添加空状态**

在 `<scroll-view>` 内，优惠券列表 `wx:for` 之前，添加空状态提示：
```xml
<scroll-view class="coupon-list" scroll-y="true" scroll-top="{{scrollTop}}">

  <view class="no-coupon" wx:if="{{couponList.length === 0}}">
    <view class="c">
      <text>暂无优惠券</text>
    </view>
  </view>

  <view class="item {{ status == 0 ? 'active' : ''}}" wx:for="{{couponList}}" ...>
    ...
  </view>

</scroll-view>
```

完整替换后的 scroll-view 区域：
```xml
<scroll-view class="coupon-list" scroll-y="true" scroll-top="{{scrollTop}}">

  <view class="no-coupon" wx:if="{{couponList.length === 0}}">
    <view class="c">
      <text>暂无优惠券</text>
    </view>
  </view>

  <view class="item {{ status == 0 ? 'active' : ''}}" wx:for="{{couponList}}" wx:for-index="index" wx:for-item="item" wx:key="id">
    <view class="tag">{{item.tag}}</view>
    <view class="content">
      <view class="left">
        <view class="discount">{{item.discount}}元</view>
        <view class="min"> 满{{item.min}}元使用</view>
      </view>
      <view class="right">
        <view class="name">{{item.name}}</view>
        <view class="time"> 有效期：{{item.startTime}} - {{item.endTime}}</view>
      </view>
    </view>
    <view class="condition">
      <text class="txt">{{item.desc}}</text>
    </view>
  </view>

</scroll-view>
```

- [ ] **Step 2: 在 couponList.wxss 中添加空状态样式**

参照收藏页的 `.no-collect` 样式，在文件末尾添加：
```css
.no-coupon {
  width: 100%;
  height: auto;
  margin: 0 auto;
}

.no-coupon .c {
  width: 100%;
  height: auto;
  margin-top: 400rpx;
}

.no-coupon .c text {
  margin: 0 auto;
  display: block;
  width: 258rpx;
  height: 29rpx;
  line-height: 29rpx;
  text-align: center;
  font-size: 29rpx;
  color: #999;
}
```

---

### Task 5: 优惠券分页改为触底加载

**Files:**
- Modify: `clothing-mall-wx/pages/ucenter/couponList/couponList.js`
- Modify: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxml`
- Modify: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxss`

- [ ] **Step 1: 重写 couponList.js 的分页逻辑**

完整替换 `couponList.js` 文件内容为：

```javascript
var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

var app = getApp();

Page({
  data: {
    couponList: [],
    code: '',
    status: 0,
    page: 1,
    limit: 10,
    count: 0,
    scrollTop: 0,
    showPage: false,
    loading: false
  },

  onLoad: function(options) {
    this.loadCouponList();
  },

  onReady: function() {

  },

  onShow: function() {

  },

  onHide: function() {

  },

  onUnload: function() {

  },

  onPullDownRefresh() {
    wx.showNavigationBarLoading()
    this.setData({
      page: 1,
      couponList: [],
      count: 0,
      showPage: false
    }, function() {
      this.loadCouponList();
    }.bind(this));
  },

  onReachBottom: function() {
    if (!this.data.loading && this.data.page * this.data.limit < this.data.count) {
      this.setData({ page: this.data.page + 1 });
      this.loadCouponList();
    }
  },

  onShareAppMessage: function() {

  },
  loadCouponList: function() {
    let that = this;
    if (that.data.loading) return;
    that.setData({ loading: true });

    util.request(api.CouponMyList, {
      status: that.data.status,
      page: that.data.page,
      limit: that.data.limit
    }).then(function(res) {
      if (res.errno === 0) {
        var newList = that.data.couponList.concat(res.data.list);
        that.setData({
          scrollTop: 0,
          couponList: newList,
          showPage: res.data.total > that.data.limit,
          count: res.data.total,
          loading: false
        });
      }
    });
  },
  resetAndLoad: function() {
    this.setData({
      page: 1,
      couponList: [],
      count: 0,
      scrollTop: 0,
      showPage: false,
      loading: false
    });
    this.loadCouponList();
  },
  bindExchange: function (e) {
    this.setData({
      code: e.detail.value
    });
  },
  clearExchange: function () {
    this.setData({
      code: ''
    });
  },
  goExchange: function() {
    if (this.data.code.length === 0) {
      util.showErrorToast("请输入兑换码");
      return;
    }

    let that = this;
    util.request(api.CouponExchange, {
      code: that.data.code
    }, 'POST').then(function (res) {
      if (res.errno === 0) {
        that.resetAndLoad();
        that.clearExchange();
        wx.showToast({
          title: "领取成功",
          duration: 2000
        })
      }
      else{
        util.showErrorToast(res.errmsg);
      }
    });
  },
  switchTab: function(e) {
    this.setData({
      couponList: [],
      status: e.currentTarget.dataset.index,
      page: 1,
      limit: 10,
      count: 0,
      scrollTop: 0,
      showPage: false,
      loading: false
    });

    this.loadCouponList();
  },
})
```

关键变更：
- `getCouponList` 重命名为 `loadCouponList`，使用 `concat` 追加数据而非清空重载
- 新增 `loading` 状态防止重复请求
- `onReachBottom` 实现触底加载下一页
- `onPullDownRefresh` 下拉刷新重置为第一页
- `switchTab` 切换 tab 时重置并重新加载
- 删除 `nextPage` / `prevPage` 方法
- 新增 `resetAndLoad` 方法供兑换成功后使用

- [ ] **Step 2: 移除 couponList.wxml 中的翻页按钮**

删除手动翻页区域（第 51-54 行）：
```xml
<!-- 删除以下内容 -->
<view class="page" wx:if="{{showPage}}">
  <view class="prev {{ page <= 1 ? 'disabled' : ''}}" bindtap="prevPage">上一页</view>
  <view class="next {{ (count / limit) <= page ? 'disabled' : ''}}" bindtap="nextPage">下一页</view>
</view>
```

- [ ] **Step 3: 清理 couponList.wxss 中的翻页样式**

删除以下样式块：
```css
/* 删除以下样式 */
.container .b .page {
  width: 750rpx;
  height: 108rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.container .b .page view {
  height: 108rpx;
  width: 50%;
  float: left;
  font-size: 29rpx;
  color: #333;
  text-align: center;
  line-height: 108rpx;
}

.container .b .page .prev {
  border-right: 1px solid #d9d9d9;
}

.container .b .page .disabled {
  color: #ccc;
}
```

---

### Task 6: 后端编译验证 & 提交

- [ ] **Step 1: 全量编译后端**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -q`

Expected: BUILD SUCCESS

- [ ] **Step 2: 提交所有变更**

```bash
git add \
  clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxCollectController.java \
  clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxFootprintController.java \
  clothing-mall-wx/pages/ucenter/couponList/couponList.js \
  clothing-mall-wx/pages/ucenter/couponList/couponList.wxml \
  clothing-mall-wx/pages/ucenter/couponList/couponList.wxss \
  clothing-mall-wx/pages/ucenter/couponSelect/couponSelect.wxml

git commit -m "$(cat <<'EOF'
fix: 修复收藏/优惠券/足迹功能的 bug 和体验问题

- 修复专题收藏 subtitle 取值为 title 的 bug
- 移除优惠券页面无效的 pic 图片标签
- 优化足迹列表 N+1 查询为批量查询
- 添加优惠券列表空状态提示
- 优惠券分页从手动翻页改为触底加载

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
