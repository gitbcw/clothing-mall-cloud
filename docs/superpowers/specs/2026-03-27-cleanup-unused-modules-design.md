# 清理不生效营销模块

> 日期: 2026-03-27
> 状态: 已确认，待实施

## 背景

系统中有多个营销模块在管理后台可配置，但对微信小程序端不生效或已被替代。这些模块占用代码空间、菜单入口，且首页聚合接口存在大量冗余查询。

### 各模块在小程序端的生效情况

| 功能 | 管理后台 | 后端 API | 小程序前端 | 对用户是否生效 |
|------|---------|---------|-----------|-------------|
| 优惠券 | 有 | 完整 | 完整使用 | 生效 |
| 限时特卖 | 有 | 完整 | 仅商品详情页展示特价 | 部分生效 |
| 满减活动 | 有(默认隐藏) | 完整 | 无前端入口 | 后端生效但用户无感知 |
| 穿搭推荐 | 有 | 完整 | 完整使用 | 生效 |
| 活动位 | 有 | 完整 | 完整使用 | 生效 |
| 场景轮播图 | 有 | 完整 | 完整使用 | 生效 |
| **专题** | 有 | 完整 | **未接入** | **不生效** |
| **广告(Ad)** | 有 | 有查询 | **被场景替代** | **不生效** |

## 清理范围

### 1. 管理后台前端清理

**专题管理移除：**
- 删除 `views/promotion/topic.vue`、`topicCreate.vue`、`topicEdit.vue`
- 删除 `api/topic.js`
- 移除 `router/index.js` 中 topic / topic-create / topic-edit 路由
- 移除菜单中的专题管理入口

**广告管理移除：**
- 删除 `views/promotion/ad.vue`
- 删除 `api/ad.js`
- 移除路由和菜单

**国际化清理：**
- `locales/zh-Hans.js` 中移除 topic/ad 相关文案

### 2. 小程序端清理

- `config/api.js`：移除 `TopicList`、`TopicDetail`、`TopicRelated` 定义
- 删除 `services/activity.js`（封装了未使用的限时特卖列表/详情方法）
- 清理其他未使用的 API 定义（如 FlashSaleList、FlashSaleDetail 等）

### 3. 后端首页接口瘦身

`WxHomeController.index()` 中移除对以下数据的查询和返回：
- `banner`（广告轮播，已被场景轮播替代）
- `channel`（分类频道，前端未用）
- `couponList`（首页优惠券，前端未用）
- `brandList`（品牌列表，前端未用）
- `topicList`（专题列表，前端未用）
- `floorGoodsList`（楼层商品，前端未用）

保留：`newGoodsList`、`hotGoodsList`、`homeActivity`、`outfitList`（前端实际使用）

## 不动的部分

- 后端 Controller（WxTopicController、AdminTopicController、广告相关）保留
- 数据库表和服务层保留
- 满减活动不动
- 优惠券不动

## 方案选择

**方案 A：前端清理 + 后端瘦身**（已选定）
- 安全可逆，改动集中在前端和首页接口
- 后端 API 保留，将来如需恢复也方便
- 不影响数据库和其他业务
