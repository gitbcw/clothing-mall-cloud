# 小程序搜索优化设计

## 动机

当前搜索页仅有历史记录 + 热门搜索 + 关键字联想，不支持按分类/场景快速筛选；排序只有综合(name desc)、价格、分类下拉，体验不够完善。需要增强搜索首页的预选能力，并优化搜索结果页的排序体验。

## 改动范围

### 搜索首页（search.wxml / search.js / search.wxss）

**布局调整**：未输入时展示四个区块（从上到下）：

1. **历史记录** — 保持现有行为，展示用户搜索历史，支持清空
2. **热门搜索** — 保持现有行为，展示后台配置的热门关键词
3. **分类** — 新增，横向滚动展示所有 L1 分类标签，点击以 categoryId 进入搜索结果
4. **场景** — 新增，横向滚动展示所有启用的场景标签，点击以 sceneId 进入搜索结果

**交互规则**：
- 未输入文字：显示历史记录 + 热门搜索 + 分类标签 + 场景标签
- 输入文字时：显示联想列表（保持现有行为不变）

### 搜索结果页排序栏（search.wxml / search.js）

**排序 Tab**：综合 | 价格 | 上新

| Tab | 排序逻辑 | 交互 |
|-----|---------|------|
| 综合（默认） | CASE 关键词相关度打分 DESC → sort_order DESC → add_time DESC | 点击激活 |
| 价格 | retail_price 升序/降序切换 | 点击切换方向 |
| 上新 | add_time DESC | 点击激活 |

**移除**：现有「分类」下拉筛选面板

**点击分类/场景标签进入时**：同样显示排序栏，默认综合排序

### 综合排序 CASE 打分规则

当搜索关键词非空时，在 SQL 中按匹配精度打分：

| 匹配规则 | 分数 |
|----------|------|
| 商品名完全等于关键词 | 100 |
| 商品名以关键词开头 | 80 |
| 商品名包含关键词 | 50 |
| 关键字字段以关键词开头 | 30 |
| 关键字字段包含关键词 | 10 |

最终排序：`score DESC, sort_order DESC, add_time DESC`

当搜索关键词为空时（如通过分类/场景标签进入）：`sort_order DESC, add_time DESC`

### 后端改动

#### 1. `/wx/search/index` 接口增强

返回数据新增：
- `categoryList`：所有 L1 分类（id, name, iconUrl），调用现有 `LitemallCategoryService.queryL1()`
- `sceneList`：所有启用的场景（id, name, icon），调用现有 `ClothingSceneService`

#### 2. `/wx/goods/list` 接口增强

- 新增 `sceneId`（Integer，可选）参数
- 筛选逻辑：通过 `clothing_goods_scene` 关联表 JOIN 筛选
- 综合排序：在 MyBatis XML 中用 CASE WHEN 打分替代现有的 `name desc`

#### 3. sort 参数处理

- `@Sort` 注解的 accepts 保持 `{add_time, retail_price, name}` 不变
- 前端传 `sort=default` 或不传 sort 参数时，后端走 CASE 打分逻辑
- `sort=add_time` 时走现有 add_time 排序（上新 Tab 使用）

### 涉及文件

**前端**：
- `clothing-mall-wx/pages/search/search.wxml` — 布局改造
- `clothing-mall-wx/pages/search/search.js` — 新增分类/场景数据、sceneId 参数、排序逻辑
- `clothing-mall-wx/pages/search/search.wxss` — 分类/场景标签样式

**后端**：
- `WxSearchController.java` — index 接口增加返回 categoryList、sceneList
- `WxGoodsController.java` — list 接口增加 sceneId 参数
- `LitemallGoodsService.java` — querySelective 增加 sceneId 参数和综合排序逻辑
- `LitemallGoodsMapper.xml` — SQL 增加 sceneId JOIN 和 CASE 打分

**不新增表、不新增接口**，仅扩展现有接口。

## 回滚方式

- 前端：git revert 搜索页相关改动
- 后端：git revert 后端改动，重建 JAR 镜像
- 数据库：无变更，无需回滚
