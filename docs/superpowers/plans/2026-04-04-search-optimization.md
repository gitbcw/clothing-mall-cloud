# 搜索优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化小程序搜索页，新增分类/场景预选标签，搜索结果支持综合（CASE 相关度）| 价格 | 上新 三段排序

**Architecture:** 后端新增自定义 SQL 查询方法替代 Example 模式，支持 CASE 打分排序和 sceneId JOIN 筛选；前端搜索页新增分类/场景标签区和三段排序 Tab

**Tech Stack:** Spring Boot + MyBatis (后端), 微信小程序原生框架 (前端)

---

## 文件变更清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/dao/LitemallGoodsMapper.java` | 新增自定义查询方法 |
| 修改 | `clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/LitemallGoodsMapper.xml` | 新增 CASE 打分 + scene JOIN 的 SQL |
| 修改 | `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/LitemallGoodsService.java` | 新增 service 方法 |
| 修改 | `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxGoodsController.java` | list 接口新增 sceneId 参数、sort 支持 default |
| 修改 | `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxSearchController.java` | index 接口新增 categoryList 和 sceneList |
| 修改 | `clothing-mall-wx/pages/search/search.js` | 新增分类/场景数据、sceneId 参数、排序逻辑 |
| 修改 | `clothing-mall-wx/pages/search/search.wxml` | 新增分类/场景标签区、排序栏改造 |
| 修改 | `clothing-mall-wx/pages/search/search.wxss` | 新增标签样式 |

---

### Task 1: 后端 — 新增 Mapper 方法

**Files:**
- Modify: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/dao/LitemallGoodsMapper.java`

- [ ] **Step 1: 在 LitemallGoodsMapper.java 末尾添加自定义查询方法**

在 `logicalDeleteByPrimaryKey` 方法后添加：

```java
/**
 * 搜索商品（支持场景筛选和综合排序）
 */
List<LitemallGoods> selectBySearchCondition(
    @Param("categoryId") Integer categoryId,
    @Param("brandId") Integer brandId,
    @Param("keyword") String keyword,
    @Param("isHot") Boolean isHot,
    @Param("isNew") Boolean isNew,
    @Param("sceneId") Integer sceneId,
    @Param("sort") String sort,
    @Param("order") String order
);
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-db/src/main/java/org/linlinjava/litemall/db/dao/LitemallGoodsMapper.java
git commit -m "feat(search): add custom mapper method for search with scene filter and relevance scoring"
```

---

### Task 2: 后端 — 新增 Mapper XML SQL

**Files:**
- Modify: `clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/LitemallGoodsMapper.xml`

- [ ] **Step 1: 在 `</mapper>` 标签前添加自定义 SQL**

```xml
<!-- 搜索商品（支持场景筛选和综合排序） -->
<select id="selectBySearchCondition" resultMap="BaseResultMap">
  select
  <include refid="Base_Column_List" />
  from litemall_goods g
  <if test="sceneId != null">
    inner join clothing_goods_scene cgs on g.id = cgs.goods_id and cgs.scene_id = #{sceneId}
  </if>
  where g.status = 'published' and g.deleted = 0
  <if test="categoryId != null and categoryId != 0">
    and g.category_id = #{categoryId}
  </if>
  <if test="brandId != null">
    and g.brand_id = #{brandId}
  </if>
  <if test="isHot != null">
    and g.is_hot = #{isHot}
  </if>
  <if test="isNew != null">
    and g.is_new = #{isNew}
  </if>
  <if test="keyword != null and keyword != ''">
    and (g.keywords like concat('%', #{keyword}, '%') or g.name like concat('%', #{keyword}, '%'))
  </if>
  order by
  <choose>
    <when test="sort == 'default' and keyword != null and keyword != ''">
      (case
        when g.name = #{keyword} then 100
        when g.name like concat(#{keyword}, '%') then 80
        when g.name like concat('%', #{keyword}, '%') then 50
        when g.keywords like concat(#{keyword}, '%') then 30
        when g.keywords like concat('%', #{keyword}, '%') then 10
        else 0
      end) desc,
      g.sort_order desc, g.add_time desc
    </when>
    <when test="sort == 'default'">
      g.sort_order desc, g.add_time desc
    </when>
    <otherwise>
      g.${sort} ${order}
    </otherwise>
  </choose>
</select>
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-db/src/main/resources/org/linlinjava/litemall/db/dao/LitemallGoodsMapper.xml
git commit -m "feat(search): add SQL with CASE relevance scoring and scene JOIN"
```

---

### Task 3: 后端 — 新增 Service 方法

**Files:**
- Modify: `clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/LitemallGoodsService.java`

- [ ] **Step 1: 在 `LitemallGoodsService` 类中添加新方法**

在 `querySelectiveForManager` 方法后添加：

```java
/**
 * 搜索商品（支持场景筛选和综合排序）
 */
public List<LitemallGoods> querySelectiveWithScene(Integer categoryId, Integer brandId, String keyword,
        Boolean isHot, Boolean isNew, Integer sceneId, Integer offset, Integer limit, String sort, String order) {
    PageHelper.startPage(offset, limit);
    return goodsMapper.selectBySearchCondition(categoryId, brandId, keyword, isHot, isNew, sceneId, sort, order);
}
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-db/src/main/java/org/linlinjava/litemall/db/service/LitemallGoodsService.java
git commit -m "feat(search): add service method for search with scene and relevance scoring"
```

---

### Task 4: 后端 — 修改 WxGoodsController.list

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxGoodsController.java`

- [ ] **Step 1: 修改 list 方法签名，新增 sceneId 参数，扩展 @Sort accepts**

将 list 方法参数中的 `@Sort` 注解和参数改为：

```java
@GetMapping("list")
public Object list(
    Integer categoryId,
    Integer brandId,
    String keyword,
    Boolean isNew,
    Boolean isHot,
    Integer sceneId,
    @LoginUser Integer userId,
    @RequestParam(defaultValue = "1") Integer page,
    @RequestParam(defaultValue = "10") Integer limit,
    @Sort(accepts = {"add_time", "retail_price", "name", "default"}) @RequestParam(defaultValue = "default") String sort,
    @Order @RequestParam(defaultValue = "desc") String order) {
```

- [ ] **Step 2: 修改商品查询调用，使用新方法**

将原来的：
```java
List<LitemallGoods> goodsList = goodsService.querySelective(categoryId, brandId, keyword, isHot, isNew, page, limit, sort, order);
```

改为：
```java
List<LitemallGoods> goodsList = goodsService.querySelectiveWithScene(categoryId, brandId, keyword, isHot, isNew, sceneId, page, limit, sort, order);
```

- [ ] **Step 3: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxGoodsController.java
git commit -m "feat(search): add sceneId param and default sort to goods list API"
```

---

### Task 5: 后端 — 增强 WxSearchController.index

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxSearchController.java`

- [ ] **Step 1: 添加依赖注入**

在 `WxSearchController` 中添加：

```java
@Autowired
private LitemallCategoryService categoryService;

@Autowired
private ClothingSceneService sceneService;
```

需要新增 import：
```java
import org.linlinjava.litemall.db.domain.LitemallCategory;
import org.linlinjava.litemall.db.domain.ClothingScene;
import org.linlinjava.litemall.db.service.LitemallCategoryService;
import org.linlinjava.litemall.db.service.ClothingSceneService;
```

- [ ] **Step 2: 在 index 方法中添加分类和场景数据**

在 `data.put("hotKeywordList", hotKeywordList);` 之后添加：

```java
// L1 分类列表
List<LitemallCategory> categoryList = categoryService.queryL1();
data.put("categoryList", categoryList);

// 启用的场景列表
List<ClothingScene> sceneList = sceneService.queryEnabled();
data.put("sceneList", sceneList);
```

- [ ] **Step 3: Commit**

```bash
git add clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxSearchController.java
git commit -m "feat(search): return categoryList and sceneList in search index API"
```

---

### Task 6: 前端 — 改造搜索页 JS 逻辑

**Files:**
- Modify: `clothing-mall-wx/pages/search/search.js`

- [ ] **Step 1: 在 data 中新增字段**

在 `data` 对象中添加：

```js
categoryList: [],
sceneList: [],
sceneId: 0,
```

- [ ] **Step 2: 修改 getSearchKeyword 方法，保存分类和场景数据**

将 `getSearchKeyword` 方法改为：

```js
getSearchKeyword() {
  let that = this;
  util.request(api.SearchIndex).then(function(res) {
    if (res.errno === 0) {
      that.setData({
        historyKeyword: res.data.historyKeywordList,
        defaultKeyword: res.data.defaultKeyword,
        hotKeyword: res.data.hotKeywordList,
        categoryList: res.data.categoryList || [],
        sceneList: res.data.sceneList || []
      });
    }
  });
},
```

- [ ] **Step 3: 新增点击分类标签方法**

在 `onKeywordConfirm` 方法后添加：

```js
onCategoryTap: function(e) {
  let categoryId = e.currentTarget.dataset.id;
  this.setData({
    keyword: '',
    page: 1,
    categoryId: categoryId,
    sceneId: 0,
    goodsList: [],
    currentSortType: 'default',
    currentSort: 'default',
    currentSortOrder: 'desc'
  });
  this.getGoodsList();
},

onSceneTap: function(e) {
  let sceneId = e.currentTarget.dataset.id;
  this.setData({
    keyword: '',
    page: 1,
    categoryId: 0,
    sceneId: sceneId,
    goodsList: [],
    currentSortType: 'default',
    currentSort: 'default',
    currentSortOrder: 'desc'
  });
  this.getGoodsList();
},
```

- [ ] **Step 4: 修改 getGoodsList 方法，传递 sceneId 和新排序参数**

将 `getGoodsList` 方法改为：

```js
getGoodsList: function() {
  let that = this;
  util.request(api.GoodsList, {
    keyword: that.data.keyword,
    page: that.data.page,
    limit: that.data.limit,
    sort: that.data.currentSort,
    order: that.data.currentSortOrder,
    categoryId: that.data.categoryId,
    sceneId: that.data.sceneId
  }).then(function(res) {
    if (res.errno === 0) {
      that.setData({
        searchStatus: true,
        categoryFilter: false,
        goodsList: res.data.list,
        filterCategory: res.data.filterCategoryList
      });
      tracker.trackSearch(that.data.keyword, res.data.list ? res.data.list.length : 0);
    }
    that.getSearchKeyword();
  });
},
```

- [ ] **Step 5: 修改 openSortFilter 方法，改为综合|价格|上新**

将 `openSortFilter` 方法改为：

```js
openSortFilter: function(event) {
  let currentId = event.currentTarget.id;
  switch (currentId) {
    case 'priceSort':
      let tmpSortOrder = 'asc';
      if (this.data.currentSortOrder == 'asc') {
        tmpSortOrder = 'desc';
      }
      this.setData({
        currentSortType: 'price',
        currentSort: 'retail_price',
        currentSortOrder: tmpSortOrder,
        categoryFilter: false
      });
      this.getGoodsList();
      break;
    case 'newSort':
      this.setData({
        currentSortType: 'new',
        currentSort: 'add_time',
        currentSortOrder: 'desc',
        categoryFilter: false
      });
      this.getGoodsList();
      break;
    default:
      // 综合排序
      this.setData({
        currentSortType: 'default',
        currentSort: 'default',
        currentSortOrder: 'desc',
        categoryFilter: false
      });
      this.getGoodsList();
  }
},
```

- [ ] **Step 6: 修改 data 初始值**

将 data 中的 `currentSort` 初始值从 `'name'` 改为 `'default'`：

```js
currentSort: 'default',
```

- [ ] **Step 7: Commit**

```bash
git add clothing-mall-wx/pages/search/search.js
git commit -m "feat(search): add category/scene data and new sort logic to search page"
```

---

### Task 7: 前端 — 改造搜索页 WXML 模板

**Files:**
- Modify: `clothing-mall-wx/pages/search/search.wxml`

- [ ] **Step 1: 在热门搜索区块后添加分类和场景标签区**

在 `search-hot` 的 `</view>` 结束标签后、`shelper-list` 的 `<view>` 标签前，插入分类和场景区块：

```xml
    <view class="search-keywords search-category" wx:if="{{!keyword && categoryList.length}}">
      <view class="h">
        <text class="title">分类</text>
      </view>
      <scroll-view class="tag-scroll" scroll-x="true">
        <view class="b">
          <view class="tag-item" hover-class="navigator-hover" bindtap="onCategoryTap" data-id="{{item.id}}" wx:for="{{categoryList}}" wx:key="id">{{item.name}}</view>
        </view>
      </scroll-view>
    </view>
    <view class="search-keywords search-scene" wx:if="{{!keyword && sceneList.length}}">
      <view class="h">
        <text class="title">场景</text>
      </view>
      <scroll-view class="tag-scroll" scroll-x="true">
        <view class="b">
          <view class="tag-item" hover-class="navigator-hover" bindtap="onSceneTap" data-id="{{item.id}}" wx:for="{{sceneList}}" wx:key="id">{{item.name}}</view>
        </view>
      </scroll-view>
    </view>
```

- [ ] **Step 2: 修改排序栏，将「分类」改为「上新」**

将排序栏 `sort-box` 中的内容替换为：

```xml
      <view class="sort-box">
        <view class="item {{currentSortType == 'default' ? 'active' : ''}}" bindtap="openSortFilter" id="defaultSort">
          <text class="txt">综合</text>
        </view>
        <view class="item {{currentSortType == 'price' ? 'active' : ''}}" bindtap="openSortFilter" id="priceSort">
          <text class="txt">价格</text>
          <van-icon name="arrow-up" wx:if="{{ currentSortType == 'price' && currentSortOrder == 'asc' }}" />
          <van-icon name="arrow-down" wx:elif="{{ currentSortType == 'price' && currentSortOrder == 'desc'}}" />
        </view>
        <view class="item {{currentSortType == 'new' ? 'active' : ''}}" bindtap="openSortFilter" id="newSort">
          <text class="txt">上新</text>
        </view>
      </view>
```

- [ ] **Step 3: 移除分类下拉筛选面板**

删除 `sort-box-category` 整个区块：

```xml
      <view class="sort-box-category" wx-if="{{categoryFilter}}">
        <view class="item {{item.checked ? 'active' : ''}}" wx:for="{{filterCategory}}" wx:key="id" data-category-index="{{index}}" bindtap="selectCategory">{{item.name}}</view>
      </view>
```

- [ ] **Step 4: Commit**

```bash
git add clothing-mall-wx/pages/search/search.wxml
git commit -m "feat(search): add category/scene tags and update sort bar to comprehensive/price/new"
```

---

### Task 8: 前端 — 添加分类/场景标签样式

**Files:**
- Modify: `clothing-mall-wx/pages/search/search.wxss`

- [ ] **Step 1: 在文件末尾添加分类和场景标签的横向滚动样式**

```css
.tag-scroll {
  width: 100%;
  white-space: nowrap;
}

.tag-scroll .b {
  display: inline-flex;
  padding: 0 31.25rpx 31.25rpx;
}

.tag-item {
  display: inline-block;
  height: 48rpx;
  line-height: 48rpx;
  padding: 0 15rpx;
  border: 1px solid #999;
  margin-right: 31.25rpx;
  font-size: 24rpx;
  color: #333;
}
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-wx/pages/search/search.wxss
git commit -m "feat(search): add horizontal scroll tag styles for category and scene"
```

---

### Task 9: 编译验证

- [ ] **Step 1: 编译后端**

```bash
cd /Users/combo/MyFile/projects/clothing-mall && mvn clean compile -DskipTests
```

预期：BUILD SUCCESS

- [ ] **Step 2: 修复编译问题（如有）**

如果编译失败，根据错误信息修复后重新编译。

- [ ] **Step 3: Commit all fixes**
