# 搜索历史统计页面改造方案

## 动机

当前搜索历史页面（`history.vue`）只是一个关键字+时间的分页列表，信息密度低，管理员无法快速获取"用户在找什么"的需求洞察。将其改造为轻量统计看板，提供热门搜索和搜索趋势的直观展示。

## 当前数据概况

| 指标 | 值 |
|------|-----|
| 搜索总量 | 14 |
| 不同关键词 | 3 |
| 搜索用户数 | 1 |
| 数据覆盖天数 | 3 |

> 数据量少但结构完整，统计图表可正常展示空态和有数据的场景。

## 页面布局

```
┌──────────────────────────────────────────────────┐
│ KPI 概览条                                        │
│  [搜索总量] | [关键词数] | [搜索用户] | [日均搜索]  │
├────────────────────┬─────────────────────────────┤
│ 时段分布           │ 热门搜索 TOP10               │
│ (柱状图 0-23时)    │ (排行榜: 序号+关键字+次数)    │
│                    │                              │
│ ──────────────     │  1 上衣          9次          │
│                    │  2 衬衫          4次          │
│ 近 7 天趋势        │  3 裤           1次          │
│ (折线图)           │                              │
├────────────────────┴─────────────────────────────┤
```

### 模块说明

1. **KPI 概览**：搜索总量、不同关键词数、搜索用户数、日均搜索
2. **时段分布**：0-23 小时搜索量柱状图，了解用户搜索时间偏好
3. **热门搜索 TOP10**：排行榜形式，序号 + 关键词 + 搜索次数
4. **近 7 天趋势**：折线图展示搜索量变化

## 后端设计

### 新增云函数 action

在 `admin-stat/service/stat.js` 中新增 `statSearchHistory` 函数。

### SQL 设计

#### 1. KPI

```sql
SELECT
  COUNT(*) AS totalCount,
  COUNT(DISTINCT keyword) AS keywordCount,
  COUNT(DISTINCT user_id) AS userCount
FROM litemall_search_history WHERE deleted = 0
```

日均搜索 = totalCount / MAX(days, 1)，其中 days 取自：

```sql
SELECT COUNT(DISTINCT DATE(add_time)) AS days
FROM litemall_search_history WHERE deleted = 0
```

#### 2. 热门搜索 TOP10

```sql
SELECT keyword, COUNT(*) AS count
FROM litemall_search_history
WHERE deleted = 0
GROUP BY keyword
ORDER BY count DESC
LIMIT 10
```

#### 3. 时段分布

```sql
SELECT HOUR(add_time) AS hour, COUNT(*) AS count
FROM litemall_search_history
WHERE deleted = 0
GROUP BY HOUR(add_time)
ORDER BY hour
```

前端补齐 0-23 小时的空位。

#### 4. 近 7 天趋势

```sql
SELECT DATE(add_time) AS date, COUNT(*) AS count
FROM litemall_search_history
WHERE deleted = 0 AND add_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY DATE(add_time)
ORDER BY date
```

前端补齐最近 7 天的空位。

### 返回数据结构

```json
{
  "errno": 0,
  "data": {
    "totalCount": 14,
    "keywordCount": 3,
    "userCount": 1,
    "dailyAvg": 4.7,
    "topKeywords": [
      { "keyword": "上衣", "count": 9 },
      { "keyword": "衬衫", "count": 4 }
    ],
    "hourlyDistribution": [
      { "hour": 0, "count": 5 },
      { "hour": 9, "count": 3 },
      { "hour": 18, "count": 6 }
    ],
    "dailyTrend": [
      { "date": "2026-04-15", "count": 2 },
      { "date": "2026-04-16", "count": 5 },
      { "date": "2026-04-17", "count": 7 }
    ]
  }
}
```

## 前端改动

### 文件清单

| 文件 | 改动 |
|------|------|
| `admin-stat/service/stat.js` | 新增 `statSearchHistory` 函数 |
| `admin-stat/index.js` | 注册路由 `statSearchHistory` |
| `clothing-mall-admin/src/api/stat.js` | 新增 `statSearchHistory()` API |
| `clothing-mall-admin/src/utils/request.js` | 新增路由映射 |
| `clothing-mall-admin/src/views/user/history.vue` | 重写为统计看板 |

### 保留原列表入口

搜索历史的原列表功能仍然有排查价值（按用户查搜索记录）。方案是：
- **方案 A**：在统计页面底部放一个"查看详细记录"折叠区域，内嵌原列表
- **方案 B**：直接替换为纯统计页，不再提供列表视图（数据量小，列表价值有限）

> 建议方案 B，与收藏/足迹保持一致的纯统计模式。

### 图表组件

- `ve-histogram`：时段分布（柱状图）
- `ve-line`：近 7 天趋势（折线图）
- 排行榜：纯 HTML，与收藏/足迹的 TOP10 样式一致（去掉图片列，只有关键词+次数）

## 影响面

| 模块 | 影响 |
|------|------|
| 小程序端搜索 | 不受影响，写入逻辑不变 |
| 管理后台搜索历史页面 | 页面完全重写 |
| 原列表 API (`historyList`) | 保留不删，其他地方可能引用 |
| 权限 | 复用 `admin:stat:order`（与收藏/足迹一致） |

## 回滚方式

还原 `history.vue` 文件即可恢复原列表页面。
