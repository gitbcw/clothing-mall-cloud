# 收藏/优惠券/足迹功能修复设计

## 背景

用户中心「收藏」「优惠券」「足迹」三个页面与后端 API 已打通，但存在 5 个 bug/UX 问题需要修复。

## 修复清单

### 1. 专题收藏 subtitle 取值错误 [BUG]

- **文件**: `clothing-mall-wx-api/.../WxCollectController.java:88`
- **问题**: `c.put("subtitle", topic.getTitle())` 取了主标题而非副标题
- **修复**: 改为 `topic.getSubtitle()`

### 2. 优惠券 pic 字段缺失 [数据断链]

- **文件**: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxml:47`
- **文件**: `clothing-mall-wx/pages/ucenter/couponSelect/couponSelect.wxml:22`
- **问题**: 前端引用 `{{item.pic}}` 但后端 `CouponVo` 和数据库 `litemall_coupon` 均无此字段
- **修复**: 移除两处 `<image src="{{item.pic}}" class="icon"></image>` 标签

### 3. 足迹列表 N+1 查询 [性能]

- **文件**: `clothing-mall-wx-api/.../WxFootprintController.java:88-101`
- **问题**: 循环内逐个 `goodsService.findById()` 查商品信息
- **修复**: 先收集所有 goodsId，调用 `goodsService.queryByIds(List<Integer>)` 批量查询，再遍历组装 Map

### 4. 优惠券列表无空状态提示 [UX]

- **文件**: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxml`
- **问题**: 无优惠券时页面空白，无友好提示
- **修复**: 在 `scroll-view` 内添加 `wx:if="{{couponList.length === 0}}"` 的空状态提示

### 5. 优惠券分页方式不一致 [UX]

- **文件**: `clothing-mall-wx/pages/ucenter/couponList/couponList.js`
- **文件**: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxml`
- **文件**: `clothing-mall-wx/pages/ucenter/couponList/couponList.wxss`
- **问题**: 用手动翻页按钮，与收藏/足迹的触底加载不一致
- **修复**: 移除手动翻页按钮，实现 `onReachBottom` 触底追加加载（concat 而非清空重载）

## 影响面

- 后端仅涉及 `WxCollectController` 和 `WxFootprintController` 两个文件
- 前端仅涉及 `couponList` 和 `couponSelect` 两个页面
- 无数据库变更
- 无 API 接口变更

## 回滚方式

所有改动均为独立的小改动，可逐个 git revert
