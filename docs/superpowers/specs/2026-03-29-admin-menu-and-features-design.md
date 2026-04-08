# 后台管理系统菜单及功能调整设计文档

> 日期：2026-03-29
> 状态：已确认

## 概述

后台管理系统三项调整：菜单结构重组、商品编辑优化、新增节日商品管理模块。分三阶段实施，每阶段独立可交付。

---

## 阶段 1：菜单调整（低风险，纯路由变更）

### 调整前后对比

**调整前（7 个一级菜单）：**

```
首页
订单管理（订单列表、售后列表）
商品管理（商品列表、商品分类）
平台设置（消息推送、推送组管理、会员管理、店铺设置）
系统设置（场景管理、平台规则、搜索关键词、权限管理、通用问题、操作日志、对象存储、小程序设置）
营销管理（促销管理、穿搭推荐、活动位管理）
营收分析（总报表、分类报表、季节分析、行为分析）
```

**调整后（5 个一级菜单）：**

```
首页
订单管理（订单列表、售后列表）
商品管理（商品列表、商品分类、场景管理、穿搭推荐）
平台设置（消息推送、推送组管理、会员管理、店铺设置、平台配置）
  ↳ "平台配置"为 Tab 整合页：平台规则 | 促销管理 | 小程序设置 | 通用问题 | 搜索关键词
系统设置（权限管理、操作日志、对象存储）
营收分析（总报表、分类报表、季节分析、行为分析）
```

### 路由变更明细

| 操作 | 路由 | 说明 |
|------|------|------|
| 移动 | `/system/scene` → `/goods/scene` | 场景管理移到商品管理 |
| 移动 | `/promotion/outfit` → `/goods/outfit` | 穿搭推荐移到商品管理 |
| 整合 | `/system/rule` → `/platform/config` (Tab) | 平台规则 |
| 整合 | `/system/wx` → `/platform/config` (Tab) | 小程序设置 |
| 整合 | `/system/issue` → `/platform/config` (Tab) | 通用问题 |
| 整合 | `/system/keyword` → `/platform/config` (Tab) | 搜索关键词 |
| 整合 | `/promotion/index` → `/platform/config` (Tab) | 促销管理 |
| 删除 | `/promotion/activity` | 活动位管理删除 |
| 删除 | `/promotion/*` 整个模块 | 营销管理一级菜单删除 |
| 新增 | `/platform/config` | Tab 整合配置页 |

### 平台配置 Tab 页

新建 `views/platform/config.vue`，5 个 Tab：

- **平台规则**（默认激活）— 复用 `config/rule.vue` 内容
- **促销管理** — 复用 `promotion/index.vue` 的 Tab 结构（限时特价/优惠券/满减）
- **小程序设置** — 复用 `config/wx.vue` 内容
- **通用问题** — 复用 `mall/issue.vue` 内容
- **搜索关键词** — 复用 `mall/keyword.vue` 内容

### 旧路由兼容

所有被移动的路由保留旧路径但标记 `hidden: true`，确保浏览器书签和旧链接不 404。

### 活动位管理删除范围

| 类型 | 文件 |
|------|------|
| 前端页面 | `views/promotion/activity.vue` |
| 前端 API | `api/activityTop.js` |
| 后端 Controller | `AdminActivityTopController.java` |
| 数据库表 | `clothing_activity_top`（新增 DROP TABLE 迁移脚本） |

> 注：活动位管理的后端代码和数据库表在阶段 3 统一清理，避免阶段 1 就破坏活动位逻辑。

---

## 阶段 2：商品编辑优化

### 2.1 移除「是否新品」「是否热卖」

| 文件 | 操作 |
|------|------|
| `views/goods/create.vue` | 删除 isNew/isHot 两个 `el-form-item` |
| `views/goods/edit.vue` | 同上 |

前端不再展示和提交这两个字段，提交时默认 `false`。数据库 `litemall_goods` 表的 `is_new`、`is_hot` 列保留（向后兼容），不改表结构。

### 2.2 新增「设置特价」功能

#### UI 交互

在「市场售价」字段下方，新增可折叠的特价设置区域：

- **默认状态**：收起，商品无特价
- **点击"设置特价"**：展开特价金额输入框，`isSpecialPrice` 自动设为 `true`
- **清空金额**：`isSpecialPrice` 自动回到 `false`
- **编辑页面**：已有特价时进入页面自动展开并填入金额

#### 数据库变更

```sql
ALTER TABLE litemall_goods
ADD COLUMN special_price DECIMAL(10,2) DEFAULT NULL COMMENT '特价金额'
AFTER is_special_price;
```

- `is_special_price`（已有 Boolean）— 特价标记
- `special_price`（新增 Decimal）— 特价金额，NULL 表示无特价

#### 后端变更

| 文件 | 操作 |
|------|------|
| `LitemallGoods.java` | 新增 `specialPrice` 字段（BigDecimal） |
| `LitemallGoodsMapper.xml` | 查询结果映射新增 `special_price` |
| `AdminGoodsService` | 创建/更新时：特价金额 > 0 时 `isSpecialPrice = true`，否则 `false` |

#### 前端变更

| 文件 | 操作 |
|------|------|
| `views/goods/create.vue` | 移除 isNew/isHot，新增特价设置 UI |
| `views/goods/edit.vue` | 同上 |

#### 小程序端活动位展示

| 文件 | 操作 |
|------|------|
| `WxHomeController.buildHomeActivity()` | 特价商品返回时带上 `specialPrice` |
| `pages/index/index.wxml` | 活动位商品卡片：有特价时显示划线价(counterPrice) + 特价(specialPrice) |
| `pages/index/index.wxss` | 特价样式（红色价格 + 灰色划线原价） |
| `components/goods-card/` | 商品卡片组件支持特价展示模式 |

### 2.3 商品列表页增强

- 表格新增「特价」列，显示特价金额或"—"
- 筛选区新增「仅看特价」开关

---

## 阶段 3：节日商品设置模块

### 3.1 数据库设计

**节日表 `clothing_holiday`：**

```sql
CREATE TABLE clothing_holiday (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL COMMENT '节日名称（如"春节特惠"）',
  start_date  DATE NOT NULL COMMENT '活动开始日期',
  end_date    DATE NOT NULL COMMENT '活动结束日期',
  enabled     TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  add_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted     TINYINT(1) DEFAULT 0
) COMMENT '节日活动管理';
```

**节日商品关联表 `clothing_holiday_goods`：**

```sql
CREATE TABLE clothing_holiday_goods (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  holiday_id  INT NOT NULL COMMENT '节日ID',
  goods_id    INT NOT NULL COMMENT '商品ID',
  sort_order  INT DEFAULT 0 COMMENT '排序（越小越靠前）',
  add_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_holiday_goods (holiday_id, goods_id)
) COMMENT '节日关联商品';
```

设计要点：
- 不存海报/轮播图，节日商品直接在小程序活动位展示
- 日期用 DATE 类型，精确到天
- 不设优先级，节日一般不会日期重叠；重叠时取第一个找到的

### 3.2 后端架构

参照场景管理（ClothingScene）模式，新增文件清单：

| 层次 | 文件 | 说明 |
|------|------|------|
| 实体 | `ClothingHoliday.java` | 节日实体 |
| 实体 | `ClothingHolidayGoods.java` | 关联实体 |
| DAO | `ClothingHolidayMapper.java` | 节日 Mapper |
| DAO | `ClothingHolidayGoodsMapper.java` | 关联 Mapper |
| XML | `ClothingHolidayMapper.xml` | 节日 SQL |
| XML | `ClothingHolidayGoodsMapper.xml` | 关联 SQL |
| Service | `ClothingHolidayService.java` | 节日 CRUD + 按日期查询当前生效节日 |
| Service | `ClothingHolidayGoodsService.java` | 关联 CRUD |
| Controller | `AdminClothingHolidayController.java` | 管理端 API（`/admin/holiday/*`） |

### 3.3 管理端 API

| 接口 | 方法 | URL | 说明 |
|------|------|-----|------|
| 节日列表 | GET | `/admin/holiday/list` | 分页 + 状态筛选 |
| 节日详情 | GET | `/admin/holiday/detail` | 含关联商品列表 |
| 创建节日 | POST | `/admin/holiday/create` | 含关联商品 ID 列表 |
| 编辑节日 | POST | `/admin/holiday/update` | 含关联商品 ID 列表 |
| 删除节日 | POST | `/admin/holiday/delete` | 逻辑删除 |
| 启用/禁用 | POST | `/admin/holiday/toggle` | 切换 enabled 状态 |

权限注解使用 `@RequiresPermissions`，key 格式：`admin:clothing:holiday:list` 等，与场景管理保持一致。

### 3.4 前端管理页面

**路由：** `/goods/holiday`，商品管理菜单下

**列表页：**
- 表格列：节日名称、活动日期（start_date ~ end_date）、状态（进行中/未开始/已结束/已禁用）、商品数、操作
- 筛选标签：全部、进行中、未开始、已结束、已禁用
- 操作：新增、编辑（弹窗）、删除、启用/禁用

**新增/编辑弹窗：**
- 节日名称（必填）
- 活动日期（开始 ~ 结束，日期校验）
- 关联商品选择器（复用穿搭推荐的搜索选择器模式，支持按名称搜索、多选、排序）
- 确定提交时批量保存关联关系

### 3.5 活动位优先级重构

`WxHomeController.buildHomeActivity()` 重构为 3 级填充：

```
1. 节日商品 — 查询当前日期在 [start_date, end_date] 范围内且 enabled = 1 的节日
              获取该节日关联的已上架商品（按 sort_order 排序）
              ↓ 不足 20 个则继续
2. 特价商品 — is_special_price = true 的已上架商品
              ↓ 仍不足则继续
3. 本周上新 — 近 7 天上架的新品
              ↓ 总上限 20 个
```

去重逻辑保留：`addedIds` Set 防止重复。

### 3.6 小程序端变更

| 文件 | 变更 |
|------|------|
| `WxHomeController.java` | 重构 `buildHomeActivity()` 按新优先级 |
| `WxHomeController.java` | 删除 `clothing_activity_top` 查询和节假日场景硬编码 |

小程序端页面结构不变，只改数据来源。

### 3.7 清理范围

与阶段 1 中活动位管理删除范围一致，统一在此阶段执行：

| 类型 | 删除项 |
|------|--------|
| 表 | `clothing_activity_top`（DROP TABLE 迁移脚本） |
| 后端 | `AdminActivityTopController.java` |
| 后端 | `ClothingActivityTop.java`（实体） |
| 后端 | `ClothingActivityTopMapper.java` + `.xml` |
| 后端 | `ClothingActivityTopService.java` |
| 前端 | `views/promotion/activity.vue` |
| 前端 | `api/activityTop.js` |
| 后端 | `WxHomeController` 中活动位置顶查询和节假日场景硬编码 |

---

## 实施顺序

| 阶段 | 内容 | 风险 |
|------|------|------|
| 1 | 菜单调整 | 低（纯前端路由变更） |
| 2 | 商品编辑优化 | 中（需数据库迁移 + 前后端联动） |
| 3 | 节日商品模块 | 中高（新模块 + 活动位重构 + 旧代码清理） |

每个阶段独立可交付、可测试。
