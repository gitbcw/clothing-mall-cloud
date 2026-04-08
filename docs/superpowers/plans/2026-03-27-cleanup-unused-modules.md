# 清理不生效营销模块 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除管理后台中专题管理和广告管理的页面/路由/菜单，清理小程序端未使用的 API 定义和死代码，优化后端首页聚合接口的冗余查询。

**Architecture:** 纯清理任务。管理后台前端删除页面文件和路由；小程序端清理 api.js 未使用定义和 services/activity.js；后端 WxHomeController 移除 6 个冗余并发查询。后端 Controller 和数据库层不动。

**Tech Stack:** Vue 2 (管理后台)、微信小程序 (原生)、Spring Boot (后端)

---

## 文件变更清单

### 删除的文件
| 文件 | 原因 |
|------|------|
| `clothing-mall-admin/src/views/promotion/topic.vue` | 专题列表页 |
| `clothing-mall-admin/src/views/promotion/topicCreate.vue` | 专题创建页 |
| `clothing-mall-admin/src/views/promotion/topicEdit.vue` | 专题编辑页 |
| `clothing-mall-admin/src/api/topic.js` | 专题 API 封装 |
| `clothing-mall-admin/src/views/promotion/ad.vue` | 广告管理页 |
| `clothing-mall-admin/src/api/ad.js` | 广告 API 封装 |
| `clothing-mall-wx/services/activity.js` | 限时特卖死代码 |

### 修改的文件
| 文件 | 改动 |
|------|------|
| `clothing-mall-admin/src/router/index.js` | 移除 topic/ad 路由 (第 545-587 行) |
| `clothing-mall-admin/src/locales/zh-Hans.js` | 移除 topic/ad 菜单文案和页面文案 |
| `clothing-mall-wx/config/api.js` | 移除 Topic 和 FlashSale 相关定义 |
| `clothing-mall-wx-api/.../WxHomeController.java` | 移除 6 个冗余查询 |

---

### Task 1: 移除管理后台专题管理路由

**Files:**
- Modify: `clothing-mall-admin/src/router/index.js:545-587`

- [ ] **Step 1: 移除 topic 相关路由**

在 `clothing-mall-admin/src/router/index.js` 中，删除 promotion children 数组里的三个 topic 路由块：

删除第 556-565 行（topic 列表路由）:
```js
// 删除这整个对象
{
  path: 'topic',
  component: () => import('@/views/promotion/topic'),
  name: 'topic',
  meta: {
    perms: ['GET /admin/topic/list', 'POST /admin/topic/create', 'GET /admin/topic/read', 'POST /admin/topic/update', 'POST /admin/topic/delete'],
    title: 'app.menu.promotion_topic',
    noCache: true
  }
},
```

删除第 566-576 行（topic-create 路由）:
```js
// 删除这整个对象
{
  path: 'topic-create',
  component: () => import('@/views/promotion/topicCreate'),
  name: 'topicCreate',
  meta: {
    perms: ['POST /admin/topic/create'],
    title: 'app.menu.promotion_topic_create',
    noCache: true
  },
  hidden: true
},
```

删除第 577-587 行（topic-edit 路由）:
```js
// 删除这整个对象
{
  path: 'topic-edit',
  component: () => import('@/views/promotion/topicEdit'),
  name: 'topicEdit',
  meta: {
    perms: ['GET /admin/topic/read', 'POST /admin/topic/update'],
    title: 'app.menu.promotion_topic_edit',
    noCache: true
  },
  hidden: true
},
```

- [ ] **Step 2: 验证路由文件语法**

Run: `cd clothing-mall-admin && npx eslint src/router/index.js --no-eslintrc --parser-options=ecmaVersion:2020 --env es6 2>&1 | head -20`
Expected: 无致命语法错误

---

### Task 2: 移除管理后台广告管理路由

**Files:**
- Modify: `clothing-mall-admin/src/router/index.js:545-555`

- [ ] **Step 1: 移除 ad 路由**

在 `clothing-mall-admin/src/router/index.js` 中，删除 promotion children 数组里的 ad 路由块：

删除第 545-555 行（ad 路由）:
```js
// 删除这整个对象
{
  path: 'ad',
  component: () => import('@/views/promotion/ad'),
  name: 'ad',
  meta: {
    perms: ['GET /admin/ad/list', 'POST /admin/ad/create', 'GET /admin/ad/read', 'POST /admin/ad/update', 'POST /admin/ad/delete'],
    title: 'app.menu.promotion_ad',
    noCache: true
  },
  hidden: true
},
```

- [ ] **Step 2: 验证路由文件语法**

Run: `cd clothing-mall-admin && npx eslint src/router/index.js --no-eslintrc --parser-options=ecmaVersion:2020 --env es6 2>&1 | head -20`
Expected: 无致命语法错误

---

### Task 3: 删除管理后台专题和广告页面文件

**Files:**
- Delete: `clothing-mall-admin/src/views/promotion/topic.vue`
- Delete: `clothing-mall-admin/src/views/promotion/topicCreate.vue`
- Delete: `clothing-mall-admin/src/views/promotion/topicEdit.vue`
- Delete: `clothing-mall-admin/src/api/topic.js`
- Delete: `clothing-mall-admin/src/views/promotion/ad.vue`
- Delete: `clothing-mall-admin/src/api/ad.js`

- [ ] **Step 1: 删除专题相关文件**

Run:
```bash
rm clothing-mall-admin/src/views/promotion/topic.vue
rm clothing-mall-admin/src/views/promotion/topicCreate.vue
rm clothing-mall-admin/src/views/promotion/topicEdit.vue
rm clothing-mall-admin/src/api/topic.js
```

- [ ] **Step 2: 删除广告相关文件**

Run:
```bash
rm clothing-mall-admin/src/views/promotion/ad.vue
rm clothing-mall-admin/src/api/ad.js
```

- [ ] **Step 3: 验证文件已删除**

Run: `ls clothing-mall-admin/src/views/promotion/ && ls clothing-mall-admin/src/api/`
Expected: promotion 目录中不再有 topic.vue、topicCreate.vue、topicEdit.vue、ad.vue；api 目录中不再有 topic.js、ad.js

---

### Task 4: 清理国际化文案

**Files:**
- Modify: `clothing-mall-admin/src/locales/zh-Hans.js`

- [ ] **Step 1: 移除菜单级别的 topic/ad 文案**

在 `zh-Hans.js` 的 `app.menu` 对象中，删除以下 key（约第 36-41 行）:

```js
// 删除这些行:
promotion_ad: '广告管理',
promotion_topic: '专题管理',
promotion_topic_create: '专题创建',
promotion_topic_edit: '专题编辑',
```

保留 `promotion_coupon`、`promotion_coupon_detail`、`promotion_flashSale`、`promotion_fullReduction` 等其他条目。

- [ ] **Step 2: 移除页面级别的 promotion_ad 文案**

在 `zh-Hans.js` 中找到 `promotion_ad` 页面级文案块（约第 671-704 行），删除整个 `promotion_ad` 对象。

- [ ] **Step 3: 移除页面级别的 promotion_topic 文案**

在 `zh-Hans.js` 中找到 `promotion_topic` 页面级文案块（约第 793-811 行），删除整个 `promotion_topic` 对象。

- [ ] **Step 4: 移除页面级别的 promotion_topic_edit 文案**

在 `zh-Hans.js` 中找到 `promotion_topic_edit` 页面级文案块（约第 812-842 行），删除整个 `promotion_topic_edit` 对象。

- [ ] **Step 5: 验证文件语法**

Run: `node -e "require('./clothing-mall-admin/src/locales/zh-Hans.js')" 2>&1 | head -5`
Expected: 无模块解析错误（或有 import 报错但无 JSON 语法错误）

---

### Task 5: 清理小程序端未使用 API 定义

**Files:**
- Modify: `clothing-mall-wx/config/api.js`
- Delete: `clothing-mall-wx/services/activity.js`

- [ ] **Step 1: 移除 Topic 相关 API 定义**

在 `clothing-mall-wx/config/api.js` 中，删除第 52-54 行：

```js
// 删除这三行:
TopicList: WxApiRoot + 'topic/list', //专题列表
TopicDetail: WxApiRoot + 'topic/detail', //专题详情
TopicRelated: WxApiRoot + 'topic/related', //相关专题
```

- [ ] **Step 2: 移除 FlashSale 相关 API 定义**

在 `clothing-mall-wx/config/api.js` 中，删除第 116-119 行：

```js
// 删除这四行（包括注释）:
// 限时特卖相关接口
FlashSaleList: WxApiRoot + 'flashSale/list', // 特卖列表
FlashSaleDetail: WxApiRoot + 'flashSale/detail', // 特卖详情
FlashSaleGoods: WxApiRoot + 'flashSale/goods', // 商品特卖信息
```

注意：`FlashSaleGoods` 在商品详情页 `goods_detail.js` 中仍有使用，需保留。只删除 `FlashSaleList` 和 `FlashSaleDetail`。

修正：删除以下两行：
```js
FlashSaleList: WxApiRoot + 'flashSale/list', // 特卖列表
FlashSaleDetail: WxApiRoot + 'flashSale/detail', // 特卖详情
```

保留 `FlashSaleGoods`（商品详情页仍在使用）。

- [ ] **Step 3: 删除 services/activity.js**

Run: `rm clothing-mall-wx/services/activity.js`

- [ ] **Step 4: 验证无引用断裂**

Run: `grep -r "activity.js\|FlashSaleList\|FlashSaleDetail\|TopicList\|TopicDetail\|TopicRelated" clothing-mall-wx/pages/ clothing-mall-wx/services/ clothing-mall-wx/config/ 2>/dev/null`
Expected: 只有 `FlashSaleGoods` 在 `goods_detail.js` 中的引用和 `config/api.js` 中的定义，其他应无匹配。

---

### Task 6: 优化后端首页聚合接口

**Files:**
- Modify: `clothing-mall-wx-api/src/main/java/org/linlinjava/litemall/wx/web/WxHomeController.java`

- [ ] **Step 1: 移除不再使用的 Service 注入**

删除以下 `@Autowired` 字段（因为这些 Service 在瘦身后的 index() 中不再使用）：

```java
// 删除第 36-37 行
@Autowired
private LitemallAdService adService;

// 删除第 42-43 行
@Autowired
private LitemallBrandService brandService;

// 删除第 45-46 行
@Autowired
private LitemallTopicService topicService;

// 删除第 48-49 行
@Autowired
private LitemallCategoryService categoryService;

// 删除第 51-52 行
@Autowired
private LitemallCouponService couponService;
```

注意：`categoryService` 仍在 `getCategoryList()` 中使用，但 `getCategoryList()` 方法本身也要删除，所以 `categoryService` 也可以移除。

- [ ] **Step 2: 移除冗余的 Callable 和 FutureTask 定义**

在 `index()` 方法中，删除以下 Callable 定义（第 97-117 行）：
```java
// 删除 bannerListCallable
Callable<List> bannerListCallable = () -> adService.queryIndex();

// 删除 channelListCallable
Callable<List> channelListCallable = () -> categoryService.queryChannel();

// 删除 couponListCallable（包括 if/else 逻辑）
Callable<List> couponListCallable;
if(userId == null){
    couponListCallable = () -> couponService.queryList(0, 3);
} else {
    couponListCallable = () -> couponService.queryAvailableList(userId,0, 3);
}

// 删除 brandListCallable
Callable<List> brandListCallable = () -> brandService.query(0, SystemConfig.getBrandLimit());

// 删除 topicListCallable
Callable<List> topicListCallable = () -> topicService.queryList(0, SystemConfig.getTopicLimit());

// 删除 floorGoodsListCallable
Callable<List> floorGoodsListCallable = this::getCategoryList;
```

保留：`newGoodsListCallable`、`hotGoodsListCallable`、`outfitListCallable`。

删除对应的 FutureTask 创建和 executorService.submit：
```java
// 删除这些 FutureTask 创建
FutureTask<List> bannerTask = new FutureTask<>(bannerListCallable);
FutureTask<List> channelTask = new FutureTask<>(channelListCallable);
FutureTask<List> couponListTask = new FutureTask<>(couponListCallable);
FutureTask<List> brandListTask = new FutureTask<>(brandListCallable);
FutureTask<List> topicListTask = new FutureTask<>(topicListCallable);
FutureTask<List> floorGoodsListTask = new FutureTask<>(floorGoodsListCallable);

// 删除这些 submit 调用
executorService.submit(bannerTask);
executorService.submit(channelTask);
executorService.submit(couponListTask);
executorService.submit(brandListTask);
executorService.submit(topicListTask);
executorService.submit(floorGoodsListTask);
```

- [ ] **Step 3: 移除 entity.put 中的冗余字段**

在 `index()` 方法的 entity 构建块中，删除以下行：
```java
// 删除这些 put 调用
entity.put("banner", bannerTask.get());
entity.put("channel", channelTask.get());
entity.put("couponList", couponListTask.get());
entity.put("brandList", brandListTask.get());
entity.put("topicList", topicListTask.get());
entity.put("grouponList", new ArrayList<>());
entity.put("floorGoodsList", floorGoodsListTask.get());
```

保留：`newGoodsList`、`hotGoodsList`、`outfitList`、`homeActivity`。

- [ ] **Step 4: 删除 getCategoryList() 方法**

删除整个 `getCategoryList()` 私有方法（第 254-278 行），因为它只被已删除的 `floorGoodsListCallable` 调用。

- [ ] **Step 5: 调整线程池大小**

将线程池大小从 9 调整为 3（现在只有 3 个并发任务）：

```java
// 原来:
private final static ArrayBlockingQueue<Runnable> WORK_QUEUE = new ArrayBlockingQueue<>(9);
private static ThreadPoolExecutor executorService = new ThreadPoolExecutor(9, 9, 1000, TimeUnit.MILLISECONDS, WORK_QUEUE, HANDLER);

// 改为:
private final static ArrayBlockingQueue<Runnable> WORK_QUEUE = new ArrayBlockingQueue<>(3);
private static ThreadPoolExecutor executorService = new ThreadPoolExecutor(3, 3, 1000, TimeUnit.MILLISECONDS, WORK_QUEUE, HANDLER);
```

- [ ] **Step 6: 移除不再使用的 import**

检查并移除不再使用的 import（`LitemallCategory` 等如果不再被引用）。

- [ ] **Step 7: 编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -pl clothing-mall-wx-api -am -q 2>&1 | tail -20`
Expected: BUILD SUCCESS

---

### Task 7: 验证与提交

- [ ] **Step 1: 管理后台编译验证**

Run: `cd clothing-mall-admin && npm run build 2>&1 | tail -10`
Expected: 构建成功，无模块找不到的错误

- [ ] **Step 2: 后端编译验证**

Run: `cd /Users/combo/MyFile/projects/clothing-mall && mvn compile -q 2>&1 | tail -10`
Expected: BUILD SUCCESS

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: 清理不生效的专题管理和广告管理模块

- 移除管理后台专题管理页面(topic/topicCreate/topicEdit)和广告管理页面(ad)
- 移除管理后台专题和广告的路由、API封装、国际化文案
- 清理小程序端未使用的Topic API定义和services/activity.js死代码
- 优化首页聚合接口，移除6个冗余并发查询(banner/channel/couponList/brandList/topicList/floorGoodsList)
- 调整线程池大小从9降至3
- 后端Controller和数据库层保留不动，安全可逆"
```
