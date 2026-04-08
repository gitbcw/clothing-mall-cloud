# 小程序首页重构设计

> 日期: 2026-03-27
> 状态: 待审核

## 背景

小程序首页当前存在以下问题：
1. 轮播图使用 `litemall_ad` 广告表，但实际需求是场景海报（点击筛选场景商品）
2. 轮播图不可点击跳转（前端未绑定事件）
3. 缺少活动位模块
4. 「搭配推荐」只是热销商品的子集，不是真正的搭配
5. 穿搭推荐后端已实现但管理后台是 Mock 数据，前后端字段不一致
6. 场景管理有完整 CRUD 但缺少海报图字段，且商品-场景关联表无 Java 代码
7. 广告管理与场景管理职责重叠

## 目标首页结构

从上到下共 6 个模块：

| # | 模块 | 数据来源 | 管理入口 |
|---|------|----------|----------|
| 1 | 场景轮播图 | `clothing_scene` (有海报图 + 启用) | 商品管理 > 场景管理 |
| 2 | 活动位 | 自动聚合 + 手动置顶 | 商品属性 + 活动位管理 |
| 3 | 每周上新 | `is_new=true` 的商品 | 商品列表勾选"新品" |
| 4 | 穿搭推荐 | `litemall_outfit` (启用的穿搭) | 推广管理 > 穿搭推荐 |
| 5 | 限时热卖 | `is_hot=true` 的商品 | 商品列表勾选"热卖" |
| 6 | 饰饰如意 | categoryId=1022001 | 保持现状 |

---

## 模块 A：场景管理增强

### 数据库变更

**A1. `clothing_scene` 新增海报图字段**

```sql
ALTER TABLE clothing_scene ADD COLUMN poster_url VARCHAR(255) DEFAULT NULL COMMENT '场景海报图' AFTER icon;
```

**A2. `clothing_goods_scene` 关联表已有建表 SQL，需补充 Java 代码**

表结构（已存在）：
```sql
clothing_goods_scene (id, goods_id, scene_id, add_time)
-- UNIQUE KEY uk_goods_scene (goods_id, scene_id)
```

需新建：
- `ClothingGoodsScene.java` 实体类
- `ClothingGoodsSceneMapper.java` + XML
- `ClothingGoodsSceneService.java`

### 后端变更

**小程序端 API（WxHomeController 或新建 WxSceneController）：**

- `GET /wx/scene/banners` — 获取场景轮播图列表
  - 查询条件：`enabled=true AND poster_url IS NOT NULL AND deleted=false`
  - 按 `sort_order ASC` 排序
  - 返回：`[{id, name, posterUrl, description}]`

- `GET /wx/scene/goods?sceneId={id}&page={page}&limit={limit}` — 获取场景下的商品列表
  - 通过 `clothing_goods_scene` 关联查询
  - 返回标准商品分页数据

### 管理后台变更

- 场景管理页面 (`scene.vue`)：
  - 新增「海报图」上传字段（el-upload）
  - 列表新增「海报图」预览列
  - 新增「关联商品」功能：弹窗内支持搜索、分类筛选、多选商品
  - 关联商品以标签形式展示在场景详情中，可移除

### 小程序变更

- 首页 `index.js`：
  - 轮播图数据源改为调用 `GET /wx/scene/banners`
  - `banners` 数据结构从 `{url, link}` 改为 `{posterUrl, name, sceneId}`
- 首页 `index.wxml`：
  - 轮播图 `swiper-item` 添加 `bindtap="goToScene"` 跳转场景商品页
- 新建 `/pages/scene/scene` 页面：
  - 顶部显示场景名称和描述
  - 商品网格展示该场景下所有关联商品
  - 支持下拉刷新、上拉加载更多
  - 商品卡片点击跳转商品详情

---

## 模块 B：活动位

### 数据库变更

**B1. `litemall_goods` 新增特价标记**

```sql
ALTER TABLE litemall_goods ADD COLUMN is_special_price BIT(1) DEFAULT 0 COMMENT '是否特价' AFTER is_hot;
```

**B2. 新建手动置顶商品表**

```sql
CREATE TABLE clothing_activity_top (
    id INT(11) NOT NULL AUTO_INCREMENT,
    goods_id INT(11) NOT NULL COMMENT '商品ID',
    sort_order INT(11) DEFAULT 0 COMMENT '排序（越小越靠前）',
    add_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_goods_id (goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动位置顶商品';
```

### 后端逻辑

**API: `GET /wx/home/activity`**（集成到 `WxHomeController.index()` 返回的 `homeActivity` 字段）

活动位商品聚合逻辑：

```
结果 = 手动置顶商品 (sort_order ASC)
     + 节假日场景商品 (clothing_goods_scene JOIN clothing_scene WHERE name LIKE '%节假日%')
     + 特价商品 (is_special_price=true, status='published')
     + 本周上新商品 (is_new=true AND add_time >= NOW() - INTERVAL 7 DAY, status='published')

去重（同一商品只出现一次）
取前 20 条
```

每个分类限流：手动置顶不限，其余每类最多 8 条。

**管理后台 API:**
- `GET /admin/activity/top/list` — 置顶商品列表
- `POST /admin/activity/top/add` — 添加置顶商品
- `POST /admin/activity/top/delete` — 移除置顶商品
- `POST /admin/activity/top/update` — 修改排序

### 管理后台变更

- 商品列表 (`goods/list.vue`)：新增「特价」勾选列
- 新增「活动位管理」页面 (`promotion/activity.vue`)：
  - 替换现有 Mock 数据
  - 显示当前置顶商品列表（支持拖拽排序或手动输入排序值）
  - 添加置顶商品（弹窗选择商品）
  - 移除置顶商品

### 小程序变更

- 首页 `index.js`：
  - 从 `homeActivity` 字段获取活动位数据
- 首页 `index.wxml`：
  - 在轮播图下方新增活动位模块
  - UI：横向滚动商品卡片，显示商品图片 + 价格 + 场景标签
  - 支持手动左右滑动

---

## 模块 C：穿搭推荐对接

### 管理后台修复

**字段映射修复 (`outfit.vue`)：**

| 前端字段 | 后端字段 | 说明 |
|----------|----------|------|
| `posterUrl` | `coverPic` | 封面图 |
| `name` | `title` | 穿搭标题 |
| `enabled` (Boolean) | `status` (0/1) | 启用状态 |
| `goodsIds` (Array) | `goodsIds` (String) | 关联商品，Service 层转换 |

**对接真实 API：**
- 取消 Mock 数据和 `setTimeout`
- 调用 `outfit.js` 中已定义的 API 方法
- `goodsIds`：前端传 `[1,2,3]` 数组，Service 层转为 `"1,2,3"` 字符串存储

**路由变更：**
- `router/index.js` 中 outfit 路由取消 `hidden: true`
- 加入营销管理菜单 Tab

### 小程序变更

- 首页 `index.js`：
  - 使用后端 `outfitList` 数据渲染穿搭推荐
  - 数据结构：`[{id, title, coverPic, sortOrder, goods: [{id, name, picUrl, retailPrice}]}]`
- 首页 `index.wxml`：
  - 替换当前「搭配推荐」模块为真正的穿搭推荐
  - UI：两列网格，卡片显示封面图 + 标题
  - 点击跳转穿搭详情页（可选：展示关联商品列表）

---

## 模块 D：广告管理处理

- 管理后台：`router/index.js` 中广告管理路由设为 `hidden: true`
- 小程序首页：不再使用 `litemall_ad` 作为轮播图数据源
- `WxHomeController` 中 `banner` 字段保留但首页不再消费（向后兼容）
- 广告表和相关代码暂不删除（避免影响其他可能的引用）

---

## 变更影响面

| 层 | 影响模块 |
|----|----------|
| 数据库 | clothing_scene (ALTER), litemall_goods (ALTER), clothing_activity_top (CREATE) |
| Java 实体 | ClothingScene, LitemallGoods, ClothingGoodsScene (新建) |
| Java Service | ClothingSceneService, ClothingGoodsSceneService (新建), LitemallGoodsService |
| Java Controller | WxHomeController, AdminClothingSceneController, AdminActivityTopController (新建) |
| 管理前端 | scene.vue, outfit.vue, goods/list.vue, activity.vue, router/index.js |
| 小程序前端 | pages/index/, pages/scene/ (新建) |

## 不涉及的模块

- 限时热卖：保持现状（`is_hot=true`）
- 饰饰如意：保持现状（硬编码 categoryId=1022001）
- 每周上新：保持现状（`is_new=true`，过滤掉饰品分类）
