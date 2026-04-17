# 浏览足迹统计页面改造方案

## 动机

当前浏览足迹页面是传统列表页（用户名/商品名/时间），数据量大时缺乏洞察力。商品收藏页已完成统计仪表盘改造，浏览足迹应保持一致的设计语言，同时发挥足迹数据独有的分析价值（浏览是漏斗最上层，反映用户"潜在兴趣"）。

## 现状分析

### 数据源：`litemall_footprint` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int PK | 自增主键 |
| user_id | int | 用户 ID（**无索引**） |
| goods_id | int | 商品 ID（**无索引**） |
| add_time | datetime | 浏览时间 |
| update_time | datetime | 更新时间 |
| deleted | tinyint | 逻辑删除 |

**已知问题**：
- 无辅助索引，统计查询数据量大时会慢
- 同一用户对同一商品每次浏览都 INSERT 新行（不去重），但这恰好保留了浏览频次信息

### 后端：仅有一个列表接口

- `admin-user` 云函数 → `footprintList` action → 分页查询 + 可选 userId 筛选
- **无统计类接口**

### 前端：传统表格页

- 搜索条件：userId、goodsId（后端实际未处理 goodsId）
- 表格列：用户名、商品名、添加时间

### 参考实现：商品收藏统计（已完成）

- 前端 API：`statCollect()` → `/stat/collect` → `admin-stat` 云函数 → `statCollect` action
- 7 段 SQL → KPI 概览 + 分类分布 + 价格偏好 + 热门 TOP10
- 前端使用 v-charts（VePie、VeHistogram）渲染图表

---

## 方案设计

### 整体思路

**完全复用收藏统计的架构模式**：后端在 `admin-stat` 新增 `statFootprint` action，前端重写 `footprint.vue` 为统计仪表盘。

### 页面布局（与收藏页一致）

```
┌─────────────────────────────────────────────────┐
│  KPI 概览条                                      │
│  浏览总量  │  日均浏览  │  人均浏览  │  被浏览商品数 │
├────────────┬────────────────────────────────────┤
│ 分类分布    │  热门浏览 TOP10                      │
│ （饼图）    │  （排行榜，同收藏页样式）              │
│            │                                     │
├────────────┤                                     │
│ 时段分布    │                                     │
│ （柱状图）  │                                     │
│            │                                     │
└────────────┴────────────────────────────────────┘
```

### 统计维度

| 模块 | 指标 | SQL 思路 | 备注 |
|------|------|---------|------|
| **KPI** | 浏览总量 | `COUNT(*)` | 全量 |
| | 日均浏览 | `COUNT(*) / 天数`（近30天） | 30天有数据的天数 |
| | 人均浏览 | `COUNT(*) / COUNT(DISTINCT user_id)` | 保留1位小数 |
| | 被浏览商品数 | `COUNT(DISTINCT goods_id)` | 去重商品 |
| **分类分布** | 各分类浏览次数 | JOIN goods + category，GROUP BY cat.id | 复用收藏的 SQL 模式 |
| **时段分布** | 0-23点各时段浏览量 | `HOUR(add_time)` 分组 | **足迹独有**，反映用户活跃时段 |
| **热门浏览 TOP10** | 商品排行 | JOIN goods，GROUP BY goods_id，ORDER BY count | 同收藏页模式 |

**不做价格偏好**：收藏页有"价格偏好"柱状图，但浏览足迹做价格偏好意义不大（用户浏览不代表认可这个价格）。换成"时段分布"更有业务价值。

**暂不做"浏览→收藏转化"**：这个需要跨表关联 collect 和 footprint，逻辑较重，作为后续迭代。

### 不做时间筛选器

收藏统计页也没有时间筛选，保持一致。后续如需要可统一加上。

---

## 改动清单

### 1. 后端：`admin-stat` 新增 `statFootprint` action

**文件**：`cloudfunctions/admin-stat/service/stat.js`

新增 `statFootprint` 函数，执行 4 组 SQL：

```js
// KPI（4个标量查询合并为1条）
SELECT
  COUNT(*) AS totalCount,
  COUNT(DISTINCT user_id) AS userCount,
  COUNT(DISTINCT goods_id) AS goodsCount,
  SUM(CASE WHEN DATE(add_time) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS recentCount
FROM litemall_footprint WHERE deleted = 0

// 分类分布
SELECT COALESCE(cat.name, '未分类') AS name, COUNT(*) AS count
FROM litemall_footprint f
LEFT JOIN litemall_goods g ON f.goods_id = g.id
LEFT JOIN litemall_category cat ON g.category_id = cat.id
WHERE f.deleted = 0
GROUP BY cat.id ORDER BY count DESC

// 时段分布（足迹独有）
SELECT HOUR(add_time) AS hour, COUNT(*) AS count
FROM litemall_footprint WHERE deleted = 0
GROUP BY HOUR(add_time) ORDER BY hour

// 热门浏览 TOP10
SELECT f.goods_id AS goodsId, MAX(g.name) AS name,
       MAX(g.pic_url) AS picUrl, MAX(g.retail_price) AS price,
       COUNT(*) AS count
FROM litemall_footprint f
LEFT JOIN litemall_goods g ON f.goods_id = g.id
WHERE f.deleted = 0
GROUP BY f.goods_id ORDER BY count DESC LIMIT 10
```

返回结构：
```js
{
  totalCount,        // 浏览总量
  dailyAvg,          // 日均浏览（近30天）
  perUser,           // 人均浏览
  goodsCount,        // 被浏览商品数
  categoryDistribution: [{ name, count }],
  hourlyDistribution: [{ hour, count }],  // 0-23 补全
  topGoods: [{ goodsId, name, picUrl, price, count }]
}
```

**文件**：`cloudfunctions/admin-stat/index.js`

路由注册：
```js
statFootprint: { handler: statFootprint, permission: 'admin:stat:order' },
```

### 2. 前端 API + 路由映射

**文件**：`clothing-mall-admin/src/api/stat.js`

```js
export function statFootprint(query) {
  return request({ url: '/stat/footprint', method: 'get', params: query })
}
```

**文件**：`clothing-mall-admin/src/utils/request.js`（ROUTE_MAP）

```js
'stat/footprint': ['admin-stat', 'statFootprint'],
```

### 3. 前端页面重写

**文件**：`clothing-mall-admin/src/views/user/footprint.vue`

完全重写为统计仪表盘，复用 `collect.vue` 的样式和组件结构：

- KPI 条：4 个指标
- 左栏：分类分布（VePie）+ 时段分布（VeHistogram）
- 右栏：热门浏览 TOP10 排行榜

不再使用 `listFootprint` 接口和分页组件。

### 4. 数据库：添加辅助索引（建议但非必须）

```sql
ALTER TABLE litemall_footprint ADD INDEX idx_goods_id (goods_id);
ALTER TABLE litemall_footprint ADD INDEX idx_add_time (add_time);
```

当前数据量可能不大，索引可以先不加。当 `litemall_footprint` 超过 5000 行时建议加上。

---

## 影响面

| 模块 | 影响 |
|------|------|
| `admin-stat` 云函数 | 新增 action，不影响现有功能 |
| `footprint.vue` | 完全重写，原来的列表功能移除 |
| `admin-user` 云函数 | `footprintList` 接口不再被管理后台调用，但保留不影响 |
| 小程序端 | **无影响**，wx-user 的足迹列表/删除接口不变 |
| 数据库 | 可选加索引，无破坏性变更 |

## 回滚方式

1. `git revert` 前端 `footprint.vue` 的改动即可恢复列表页
2. 后端新增的 action 不影响其他功能，不删也无害
3. 索引如已添加，`DROP INDEX` 即可

## 工作量估计

- 后端：1 个统计函数 + 路由注册
- 前端：1 个页面重写 + API + 路由映射
- 部署：admin-stat 云函数 + 管理后台前端重新构建部署
