# 移除 SKU 管理模块 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 外科手术式移除管理后台中的 SKU 管理功能（页面、路由、API、控制器），不影响小程序端。

**Architecture:** 只移除 admin 管理层的 SKU 代码。db 层（Entity/Mapper/Service）保留，因为 wx-api 依赖它们。前端删除 SKU 管理页、OCR 页，清理路由和菜单。

**Tech Stack:** Vue 2 + Element UI（前端）、Spring Boot + MyBatis（后端）

**重要约束：**
- db 层文件（ClothingGoodsSku.java、ClothingGoodsSkuMapper、ClothingGoodsSkuService）**不删**，wx-api 依赖它们
- goods_product 规格体系不动
- 订单流程、购物车、小程序端不动
- 数据库表 clothing_goods_sku 不删

---

### Task 1: 移除前端 SKU 管理页面和 OCR 页面

**Files:**
- Delete: `clothing-mall-admin/src/views/mall/sku.vue`
- Delete: `clothing-mall-admin/src/views/goods/ocr.vue`

- [ ] **Step 1: 删除 SKU 管理页面**

```bash
rm clothing-mall-admin/src/views/mall/sku.vue
```

- [ ] **Step 2: 删除 OCR 页面**

```bash
rm clothing-mall-admin/src/views/goods/ocr.vue
```

- [ ] **Step 3: 验证文件已删除**

```bash
ls clothing-mall-admin/src/views/mall/sku.vue clothing-mall-admin/src/views/goods/ocr.vue 2>&1
```

Expected: "No such file or directory"

---

### Task 2: 清理前端路由

**Files:**
- Modify: `clothing-mall-admin/src/router/index.js`

- [ ] **Step 1: 移除 SKU 路由（第 154-163 行）**

将这段代码删除：

```javascript
      {
        path: 'sku',
        component: () => import('@/views/mall/sku'),
        name: 'goodsSku',
        meta: {
          perms: ['GET /admin/clothing/sku/list', 'POST /admin/clothing/sku/create', 'POST /admin/clothing/sku/update', 'POST /admin/clothing/sku/delete'],
          title: 'app.menu.goods_sku',
          noCache: true
        }
      },
```

- [ ] **Step 2: 移除 OCR 路由（第 175-184 行）**

将这段代码删除：

```javascript
      {
        path: 'ocr',
        component: () => import('@/views/goods/ocr'),
        name: 'goodsOcr',
        meta: {
          perms: ['POST /admin/ocr/recognize', 'POST /admin/ocr/updateStock'],
          title: 'app.menu.goods_ocr',
          noCache: true
        },
        hidden: true
      },
```

- [ ] **Step 3: 验证路由文件语法正确**

在浏览器中刷新管理后台，确认左侧菜单不再显示「SKU管理」和「OCR识别」。

---

### Task 3: 清理前端 API 文件

**Files:**
- Modify: `clothing-mall-admin/src/api/sku.js`

- [ ] **Step 1: 删除 SKU 相关的 5 个 API 函数**

删除 `sku.js` 第 1-41 行（从 `import request` 到 `updateStock` 函数的闭合括号 `}`）：

```javascript
// 删除以下全部内容：
import request from '@/utils/request'

export function listSku(query) {
  return request({
    url: '/clothing/sku/list',
    method: 'get',
    params: query
  })
}

export function createSku(data) {
  return request({
    url: '/clothing/sku/create',
    method: 'post',
    data
  })
}

export function updateSku(data) {
  return request({
    url: '/clothing/sku/update',
    method: 'post',
    data
  })
}

export function deleteSku(data) {
  return request({
    url: '/clothing/sku/delete',
    method: 'post',
    data
  })
}

export function updateStock(data) {
  return request({
    url: '/clothing/sku/stock',
    method: 'post',
    data
  })
}
```

保留第 43 行往后的 `listStore`、`createStore`、`updateStore`、`deleteStore`、`listGuide` 等函数，但需要在文件最顶部重新添加 import：

```javascript
import request from '@/utils/request'

export function listStore(query) {
```

即：删除 SKU 函数，保留 store/guide/memberLevel 函数，重新加上 import。

---

### Task 4: 移除商品创建页中的 SKU 选择器

**Files:**
- Modify: `clothing-mall-admin/src/views/goods/create.vue`

- [ ] **Step 1: 移除 SKU 相关 import（第 267 行）**

删除：
```javascript
import { listSku } from '@/api/sku'
```

- [ ] **Step 2: 移除 data 中的 SKU 字段（第 293-295 行）**

删除：
```javascript
      skuList: [],
      selectedSkuIds: [],
      selectAllSku: true,
```

- [ ] **Step 3: 移除模板中的 SKU 选择卡片（第 131-162 行）**

删除整个 SKU 选择卡片区块：
```html
    <!-- SKU 选择卡片（查询成功后显示） -->
    <el-card v-if="skuList.length > 0" class="box-card">
      ...（整个 el-card 块）
    </el-card>
```

- [ ] **Step 4: 移除 methods 中的 SKU 相关方法**

删除以下方法：
- `loadSkuList()` （约第 392 行）
- `handleSelectAll()` 中 SKU 相关部分
- `handleSkuSelectionChange()` 方法

- [ ] **Step 5: 移除 loadGoods 成功回调中的 SKU 加载（第 375-376 行）**

删除：
```javascript
        // 加载 SKU
        this.loadSkuList()
```

- [ ] **Step 6: 移除 resetForm 中的 SKU 重置（第 386-387 行）**

删除：
```javascript
        this.skuList = []
        this.selectedSkuIds = []
```

- [ ] **Step 7: 移除 handleCreate 中 SKU 校验（第 430-431 行）**

删除：
```javascript
      if (this.selectedSkuIds.length === 0) {
        this.$message.warning('请至少选择一个 SKU')
```
以及对应的闭合括号。

- [ ] **Step 8: 移除提交数据中的 skuIds（第 461 行）**

删除：
```javascript
        skuIds: this.selectedSkuIds,
```

- [ ] **Step 9: 移除 resetGoods 中 SKU 重置（第 483-484 行）**

删除：
```javascript
      this.skuList = []
      this.selectedSkuIds = []
```

---

### Task 5: 移除商品编辑页中的 SKU 选择器

**Files:**
- Modify: `clothing-mall-admin/src/views/goods/edit.vue`

- [ ] **Step 1: 移除 SKU 相关 import（第 239 行）**

删除：
```javascript
import { listSku } from '@/api/sku'
```

- [ ] **Step 2: 移除 data 中的 SKU 字段（第 261-263 行）**

删除：
```javascript
      skuList: [],
      selectedSkuIds: [],
      selectAllSku: true,
```

- [ ] **Step 3: 移除模板中的 SKU 选择卡片（第 107-138 行）**

删除整个 SKU 选择卡片区块。

- [ ] **Step 4: 移除 methods 中的 SKU 相关方法**

删除：
- `loadSkuList()` 方法
- `handleSelectAll()` 方法中 SKU 相关部分
- `handleSkuSelectionChange()` 方法

- [ ] **Step 5: 移除 init 中 SKU 加载调用（第 368-369 行）**

删除：
```javascript
        // 加载 SKU
        this.loadSkuList()
```

- [ ] **Step 6: 移除提交数据中的 skuIds（第 458 行）**

删除：
```javascript
          skuIds: this.selectedSkuIds,
```

---

### Task 6: 清理菜单翻译

**Files:**
- Modify: `clothing-mall-admin/src/locales/zh-Hans.js`

- [ ] **Step 1: 移除 SKU 和 OCR 菜单翻译（第 27-28 行）**

删除：
```javascript
      goods_ocr: 'OCR识别',
      goods_sku: 'SKU管理',
```

---

### Task 7: 移除后端 AdminClothingSkuController

**Files:**
- Delete: `clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/web/AdminClothingSkuController.java`

- [ ] **Step 1: 删除控制器文件**

```bash
rm clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/web/AdminClothingSkuController.java
```

- [ ] **Step 2: 确认文件已删除**

```bash
ls clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/web/AdminClothingSkuController.java 2>&1
```

Expected: "No such file or directory"

---

### Task 8: 移除后端 AdminOcrController

**Files:**
- Delete: `clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/web/AdminOcrController.java`

- [ ] **Step 1: 删除 OCR 控制器文件**

```bash
rm clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/web/AdminOcrController.java
```

**注意：** AdminOcrController 是管理后台的 OCR 功能，与小程序端的 WxOcrController 是不同的文件。只删 admin 端的。

---

### Task 9: 移除 GoodsAllinone DTO 中的 skuIds

**Files:**
- Modify: `clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/dto/GoodsAllinone.java`

- [ ] **Step 1: 移除 skuIds 字段和 getter/setter（第 15、50-56 行）**

删除字段声明：
```java
    List<Integer> skuIds; // 关联的 SKU ID 列表
```

删除 getter/setter：
```java
    public List<Integer> getSkuIds() {
        return skuIds;
    }

    public void setSkuIds(List<Integer> skuIds) {
        this.skuIds = skuIds;
    }
```

---

### Task 10: 移除 AdminGoodsService 中的 SKU 依赖

**Files:**
- Modify: `clothing-mall-admin-api/src/main/java/org/linlinjava/litemall/admin/service/AdminGoodsService.java`

- [ ] **Step 1: 移除 ClothingGoodsSkuService 注入（第 46-47 行）**

删除：
```java
    @Autowired
    private ClothingGoodsSkuService clothingGoodsSkuService;
```

- [ ] **Step 2: 移除 update 方法中的 SKU 关联逻辑（第 210-217 行）**

删除：
```java
        // 更新 SKU 关联（服装店扩展功能）
        List<Integer> skuIds = goodsAllinone.getSkuIds();
        if (skuIds != null) {
            clothingGoodsSkuService.unbindByGoodsId(gid);
            if (!skuIds.isEmpty()) {
                clothingGoodsSkuService.bindGoodsBatch(skuIds, gid);
            }
        }
```

- [ ] **Step 3: 移除 create 方法中的 SKU 关联逻辑（第 300-306 行）**

删除：
```java
        // 关联 SKU（服装店扩展功能）
        List<Integer> skuIds = goodsAllinone.getSkuIds();
        if (skuIds != null && !skuIds.isEmpty()) {
            // 批量关联商品
            clothingGoodsSkuService.bindGoodsBatch(skuIds, goods.getId());
            // 注意：SKU 的 active/inactive 状态是独立的，不随商品上架而改变
        }
```

---

### Task 11: 编译验证

- [ ] **Step 1: 后端编译验证**

```bash
cd /Users/combo/MyFile/projects/clothing-mall && mvn clean compile -q
```

Expected: BUILD SUCCESS

如果编译失败，根据报错信息修复遗漏的 SKU 引用。

- [ ] **Step 2: 前端编译验证**

前端 dev server 应该已经在运行（端口 9527），检查浏览器控制台是否有 SKU 相关的报错。

如果 dev server 未运行：
```bash
cd clothing-mall-admin && npm run dev
```

- [ ] **Step 3: 功能验证清单**

- [ ] 管理后台左侧菜单无「SKU管理」和「OCR识别」入口
- [ ] 商品列表页正常加载
- [ ] 商品创建页正常显示（无 SKU 选择器）
- [ ] 商品编辑页正常显示（无 SKU 选择器）
- [ ] 订单列表页正常加载

---

### Task 12: 提交

- [ ] **Step 1: 提交所有改动**

```bash
git add -A
git status
```

检查暂存文件列表，确认只有预期的删除和修改。

```bash
git commit -m "refactor: 移除管理后台 SKU 管理和 OCR 识别模块

- 删除 SKU 管理页面和 OCR 识别页面
- 移除商品创建/编辑中的 SKU 关联选择器
- 移除 AdminClothingSkuController 和 AdminOcrController
- 移除 GoodsAllinone.skuIds 字段和相关绑定逻辑
- 保留 db 层 SKU 代码，小程序端不受影响"
```

---

## 不动的文件（确认清单）

| 文件 | 原因 |
|------|------|
| `ClothingGoodsSku.java` | wx-api 依赖 |
| `ClothingGoodsSkuMapper.java` + `.xml` | wx-api 依赖 |
| `ClothingGoodsSkuService.java` | wx-api 依赖 |
| `WxClothingSkuController.java` | 小程序端 SKU 查询 |
| `WxCartController.java` | 小程序端购物车 |
| `WxManagerGoodsController.java` | 店主后台 SKU 管理 |
| `WxOcrController.java` | 小程序端 OCR |
| `LitemallCart.java` (skuId 字段) | 兼容旧数据 |
| `LitemallOrderGoods.java` (skuId 字段) | 兼容旧数据 |
| 数据库 `clothing_goods_sku` 表 | 避免迁移风险 |
