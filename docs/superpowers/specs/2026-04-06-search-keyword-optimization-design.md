# 搜索关键词优化设计

## Context

当前搜索关键词系统 (`litemall_keyword` 表) 是通用电商平台的设计，包含独立的关键词管理页面、手动配置热门/默认关键词等功能。对于单店主精品服装店场景来说：

- 店主不会专门维护独立的关键词库
- `url` 字段从未使用，`sortOrder` 用户侧不生效，`isDefault` 仅做 placeholder
- 关键词管理与商品上架是割裂的两套操作

**目标**：简化关键词系统，让热门搜索自动基于用户真实搜索行为生成，搜索建议基于商品 keywords 字段，移除不必要的管理页面。

## 设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 热门关键词来源 | 搜索历史聚合 | 反映真实用户行为，完全自动 |
| 搜索建议来源 | 商品 keywords 字段 | 店主上架时自然配置，无需额外维护 |
| defaultKeyword | 热门第 1 条 / 固定文案 | 无搜索历史时显示"搜索商品" |
| keyword 表处理 | 保留不删 | 避免迁移风险，后续可清理 |
| 改动策略 | 后端改接口 + 前端精简适配 | 彻底清理无用代码 |

## 改动清单

### 后端改动

#### 1. LitemallSearchHistoryService — 新增热门查询方法

文件：`clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/LitemallSearchHistoryService.java`

新增方法：
```java
public List<Map<String, Object>> queryHotKeywords(int limit)
```

对应 SQL（在 Mapper XML 中新增）：
```sql
SELECT keyword, COUNT(*) as cnt
FROM litemall_search_history
WHERE deleted = 0
  AND add_time >= #{since}
GROUP BY keyword
ORDER BY cnt DESC
LIMIT #{limit}
```

- 加 30 天窗口，避免过季关键词长期占位
- 返回 `List<Map<String, Object>>`，每项包含 `keyword` 和 `cnt`

#### 2. LitemallGoodsMapper — 新增关键词模糊查询方法

文件：`clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/LitemallGoodsMapper.xml`

新增方法：
```java
List<String> selectDistinctKeywords(@Param("keyword") String keyword, @Param("limit") int limit)
```

对应 SQL：
```sql
SELECT DISTINCT keywords
FROM litemall_goods
WHERE deleted = 0
  AND status = 'published'
  AND keywords IS NOT NULL
  AND keywords != ''
  AND keywords LIKE concat('%', #{keyword}, '%')
LIMIT #{limit}
```

在 Service 层拆分逗号、去重后返回。

#### 3. WxSearchController — 改造 2 个接口

文件：`clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxSearchController.java`

**`GET /wx/search/index`**：
- `hotKeywordList`：改为调用 `searchHistoryService.queryHotKeywords(10)`，包装为 `[{keyword: "xxx"}]` 格式保持前端兼容
- `defaultKeyword`：取热门第 1 条包装为 `{keyword: "xxx"}`，无搜索历史时用固定值 `{keyword: "搜索商品"}`
- 移除对 `keywordsService.queryDefault()` 和 `keywordsService.queryHots()` 的调用

**`GET /wx/search/helper`**：
- 改为调用商品 keywords 查询，拆分逗号去重后返回字符串数组
- 移除对 `keywordsService.queryByKeyword()` 的调用

#### 4. 删除小程序端关键词管理控制器

删除文件：`clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxManagerKeywordController.java`

### 前端改动

#### 5. 搜索页模板调整

文件：`clothing-mall-wx/pages/search/search.wxml`

- 热门搜索标签：移除 `item.is_hot === 1` 条件判断，所有热门标签统一使用粉色高亮样式
- 点击行为不变

#### 6. 删除小程序端关键词管理页面

删除目录：`clothing-mall-wx/pages/manager/keywordManage/`

修改文件：
- `clothing-mall-wx/app.json` — 移除 keywordManage 页面注册
- `clothing-mall-wx/config/api.js` — 移除 ManagerKeyword 相关 API 定义
- 管理端 tab 入口（如有指向 keywordManage 的入口需移除）

### 不动的部分

- `litemall_keyword` 表 — 保留，避免迁移风险
- `LitemallKeywordService` — 保留但搜索流程不再调用
- `AdminKeywordController` — 管理后台 Vue 端暂保留
- 商品搜索核心 SQL（`g.keywords LIKE` + `g.name LIKE`）— 完全不动

## 数据流变更

### 改动前

```
管理员手动配置 litemall_keyword 表
    │
    ├─ is_hot=true ──→ 热门搜索标签
    ├─ is_default=true ──→ 搜索框 placeholder
    └─ 全部 ──→ 搜索建议补全 (helper)

商品上架时配置 goods.keywords ──→ 商品搜索匹配（完全独立）
```

### 改动后

```
店主上架时配置 goods.keywords ──→ 商品搜索匹配（不变）
                                   └─→ 搜索建议补全 (helper)

用户搜索行为 ──→ litemall_search_history
                   └─→ 按频次聚合 ──→ 热门搜索标签
                                      └─→ 搜索框 placeholder（取第1条）
```

## 验证方式

1. **热门搜索**：在搜索历史表中手动插入多条记录，访问搜索页验证热门标签按频次排列
2. **搜索建议**：确保商品 keywords 包含的词在输入时能被建议出来
3. **无数据降级**：清空搜索历史后，热门区域不显示，placeholder 显示"搜索商品"
4. **商品搜索**：确认搜索商品的核心功能不受影响（输入关键词能搜到对应商品）
5. **删除确认**：确认 keywordManage 页面已从 app.json 移除，无法访问
