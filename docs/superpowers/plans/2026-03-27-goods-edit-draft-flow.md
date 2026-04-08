# 商品编辑页草稿商品流程重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构商品编辑页，移除页面内查询模块，根据商品状态区分操作按钮（已上架仅编辑，草稿/待上架支持暂存草稿/转为待上架/直接上架）

**Architecture:** 纯前端改造，后端不变。移除 edit.vue 中的「商品信息查询」卡片，通过路由参数 `?id=xxx` 统一入口加载商品。根据商品 `status` 字段动态渲染不同的操作按钮组合。新增「转为待上架」按钮调用现有 `updateGoods('pending')` 逻辑。上架操作需要同步设置 `isOnSale=true`。

**Tech Stack:** Vue 2, Element UI

---

## 状态流转图

```
                  ┌─────────────────────────────────────────┐
                  │           商品列表 (list.vue)            │
                  │                                         │
                  │  草稿商品 ──点击编辑──► edit.vue?id=xxx  │
                  │  待上架商品 ──点击编辑──► edit.vue?id=xxx │
                  │  已上架商品 ──点击编辑──► edit.vue?id=xxx │
                  └─────────────────────────────────────────┘

  edit.vue 按钮配置：

  ┌──────────────────────────────────────────────────────────┐
  │  status = 'draft' (草稿)                                 │
  │  [取消]  [暂存草稿]  [转为待上架]  [直接上架]              │
  │                                                          │
  │  status = 'pending' (待上架)                             │
  │  [取消]  [暂存草稿]  [转为待上架]  [直接上架]              │
  │                                                          │
  │  status = 'published' (已上架)                           │
  │  [取消]  [保存修改]                                       │
  └──────────────────────────────────────────────────────────┘

  状态流转：
  draft  ──暂存草稿──► draft
  draft  ──转为待上架──► pending
  draft  ──直接上架──► published (isOnSale=true)
  pending ──暂存草稿──► draft
  pending ──转为待上架──► pending
  pending ──直接上架──► published (isOnSale=true)
  published ──保存修改──► published (isOnSale不变)
```

---

## 文件变更清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `clothing-mall-admin/src/views/goods/edit.vue` | 修改 | 移除查询模块、按钮按状态区分、新增 pending 保存逻辑、修复 isOnSale 同步 |

> 不涉及后端改动、不涉及路由改动、不涉及列表页改动。

---

### Task 1: 移除「商品信息查询」模块

**Files:**
- Modify: `clothing-mall-admin/src/views/goods/edit.vue:4-16` (模板移除)
- Modify: `clothing-mall-admin/src/views/goods/edit.vue:261-263` (data 移除)
- Modify: `clothing-mall-admin/src/views/goods/edit.vue:382-388` (loadGoodsById 清理)
- Modify: `clothing-mall-admin/src/views/goods/edit.vue:392-424` (handleSearch 移除)
- Modify: `clothing-mall-admin/src/views/goods/edit.vue:246` (import 清理 findByGoodsSn)

- [ ] **Step 1: 移除模板中的「商品信息查询」卡片**

删除 `edit.vue` 第 4-16 行的整个 `el-card`：

```html
<!-- 删除这段 -->
    <!-- 商品查询卡片 -->
    <el-card class="box-card">
      <h3>商品信息</h3>
      <el-row :gutter="20" type="flex" align="middle">
        <el-col :span="6">
          <el-input v-model="searchGoodsSn" placeholder="输入商品款号查询" clearable @keyup.enter.native="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-col>
      </el-row>
      <el-alert v-if="searchMsg" :title="searchMsg" :type="searchType" show-icon style="margin-top:15px" />
    </el-card>
```

- [ ] **Step 2: 移除 data 中的查询相关字段**

删除以下三个字段（第 261-263 行）：

```javascript
// 删除这三个字段
      searchGoodsSn: '',
      searchMsg: '',
      searchType: 'info',
```

- [ ] **Step 3: 移除 import 中的 findByGoodsSn**

将第 246 行：
```javascript
import { detailGoods, editGoods, findByGoodsSn, listCatAndBrand } from '@/api/goods'
```
改为：
```javascript
import { detailGoods, editGoods, listCatAndBrand } from '@/api/goods'
```

- [ ] **Step 4: 清理 loadGoodsById 方法**

移除 `loadGoodsById` 方法中设置查询款号和显示状态的代码（第 382-388 行）：

```javascript
// 删除这三行
        // 设置查询款号
        this.searchGoodsSn = this.goods.goodsSn

        // 显示状态
        const statusText = { draft: '草稿', pending: '待上架', published: '已上架' }
        this.searchMsg = `商品：${this.goods.name} - ${statusText[this.goods.status] || '未知'}`
        this.searchType = 'success'
```

- [ ] **Step 5: 移除 handleSearch 方法**

删除整个 `handleSearch` 方法（第 392-424 行）。

- [ ] **Step 6: 验证页面正常加载**

Run: `cd clothing-mall-admin && npm run dev`

访问 `/goods/edit?id=1`，确认：
- 页面无报错
- 商品详情正常加载
- 无「商品信息查询」卡片
- 控制台无 `searchGoodsSn is not defined` 等错误

- [ ] **Step 7: Commit**

```bash
git add clothing-mall-admin/src/views/goods/edit.vue
git commit -m "refactor(goods): 移除编辑页商品信息查询模块"
```

---

### Task 2: 按商品状态区分操作按钮

**Files:**
- Modify: `clothing-mall-admin/src/views/goods/edit.vue:188-193` (操作按钮区域)

- [ ] **Step 1: 重写操作按钮模板**

将第 188-193 行的操作按钮区域：

```html
    <!-- 操作按钮 -->
    <div v-if="goods.id" class="op-container">
      <el-button @click="handleCancel">{{ $t('app.button.cancel') }}</el-button>
      <el-button type="success" @click="handleSaveDraft">暂存草稿</el-button>
      <el-button type="primary" @click="handlePublish">上架</el-button>
    </div>
```

替换为：

```html
    <!-- 操作按钮 -->
    <div v-if="goods.id" class="op-container">
      <el-button @click="handleCancel">{{ $t('app.button.cancel') }}</el-button>
      <!-- 已上架商品：仅保存修改 -->
      <el-button v-if="goods.status === 'published'" type="primary" :loading="saving" @click="handleSave">保存修改</el-button>
      <!-- 草稿/待上架商品：三种操作 -->
      <template v-else>
        <el-button type="info" :loading="saving" @click="handleSaveDraft">暂存草稿</el-button>
        <el-button type="success" :loading="saving" @click="handleSavePending">转为待上架</el-button>
        <el-button type="primary" :loading="saving" @click="handlePublish">直接上架</el-button>
      </template>
    </div>
```

- [ ] **Step 2: 添加 saving 状态变量**

在 `data()` 的 `picFile: null,` 之后添加：

```javascript
      saving: false,
```

- [ ] **Step 3: 添加 handleSavePending 和 handleSave 方法**

在 `handleSaveDraft` 方法后面添加：

```javascript
    // 转为待上架
    async handleSavePending() {
      await this.updateGoods('pending', '已转为待上架')
    },

    // 保存修改（已上架商品）
    async handleSave() {
      await this.updateGoods('published', '保存成功')
    },
```

- [ ] **Step 4: 修改 updateGoods 方法，增加 isOnSale 同步和 loading 状态**

将 `updateGoods` 方法（第 478-517 行）替换为：

```javascript
    // 更新商品
    async updateGoods(status, successMsg) {
      this.saving = true
      try {
        // 如果有待上传的商品图片，先上传
        if (this.picFile) {
          try {
            const formData = new FormData()
            formData.append('file', this.picFile)
            const uploadRes = await createStorage(formData)
            if (uploadRes.data.errno === 0) {
              this.goods.picUrl = uploadRes.data.data.url
            }
          } catch (e) {
            console.warn('图片上传失败:', e)
          }
        }

        const data = {
          goods: {
            ...this.goods,
            status: status,
            isOnSale: status === 'published'
          },
          specifications: [],
          products: [],
          attributes: this.attributes,
          skuIds: this.selectedSkuIds,
          sceneIds: this.selectedSceneIds
        }

        await editGoods(data)
        this.$notify.success({ title: '成功', message: successMsg })
        this.$store.dispatch('tagsView/delView', this.$route)
        this.$router.push('/goods/list')
      } catch (error) {
        const errMsg = error?.response?.data?.errmsg || error?.message || '未知错误'
        MessageBox.alert('操作失败：' + errMsg, '警告', {
          confirmButtonText: '确定',
          type: 'error'
        })
      } finally {
        this.saving = false
      }
    },
```

**关键改动说明：**
- 使用 `async/await` 替代 `.then/.catch`，配合 `try/finally` 控制 `saving` loading 状态
- 新增 `isOnSale: status === 'published'` 确保 `status` 和 `isOnSale` 同步
- `finally` 块确保无论成功失败都会关闭 loading

- [ ] **Step 5: 验证按钮状态切换**

Run: `cd clothing-mall-admin && npm run dev`

验证以下场景：

1. 访问 `/goods/edit?id=<草稿商品ID>` → 显示 [取消] [暂存草稿] [转为待上架] [直接上架]
2. 访问 `/goods/edit?id=<待上架商品ID>` → 显示 [取消] [暂存草稿] [转为待上架] [直接上架]
3. 访问 `/goods/edit?id=<已上架商品ID>` → 显示 [取消] [保存修改]
4. 点击按钮时出现 loading 状态
5. 操作完成后自动跳转回列表页

- [ ] **Step 6: Commit**

```bash
git add clothing-mall-admin/src/views/goods/edit.vue
git commit -m "feat(goods): 编辑页按商品状态区分操作按钮"
```

---

### Task 3: 列表页操作按钮文案优化（可选）

**Files:**
- Modify: `clothing-mall-admin/src/views/goods/list.vue:107-114`

> 需求未要求修改列表页，但为保持一致性，建议将列表页的「编辑」按钮文案也做区分。

- [ ] **Step 1: 评估是否需要修改列表页**

列表页当前逻辑：
- `status !== 'published'` → 显示「上架」按钮
- `status === 'published'` → 显示「下架」按钮
- 所有状态 → 显示「编辑」按钮

当前列表页的操作已经足够清晰（上架/下架在列表页操作，编辑跳转编辑页），**不需要改动列表页**。

- [ ] **Step 2: 确认不改列表页，Task 3 标记为跳过**

列表页保持现状，编辑页已按状态区分按钮，两个页面职责清晰。

---

## 自检清单

**1. Spec 覆盖率检查：**
- [x] 移除页面内「商品信息查询」模块 → Task 1
- [x] 入口统一：仅从商品列表进入 → Task 1（移除查询模块后，只剩 URL 参数入口）
- [x] 已上架商品仅保留「编辑」操作 → Task 2（显示「保存修改」按钮）
- [x] 草稿商品提供三种操作（暂存草稿/转为待上架/直接上架）→ Task 2
- [x] 取消操作返回列表，不保存 → 已有 handleCancel 方法，未改动

**2. Placeholder 扫描：**
- 无 TBD、TODO、"implement later" 等占位符
- 所有代码步骤包含完整代码

**3. 类型一致性检查：**
- status 值：'draft' / 'pending' / 'published' → 与 `LitemallGoods.java` 常量一致
- `isOnSale` 类型 Boolean → 与实体类一致
- `updateGoods(status, successMsg)` 签名在所有调用处一致

**4. 风险点：**
- `isOnSale` 同步：通过在 `updateGoods` 中显式设置 `isOnSale: status === 'published'` 解决
- 按钮文案：「直接上架」而非原来的「上架」，区分于列表页的批量上架操作
- 暂存草稿按钮类型从 `success`(绿色) 改为 `info`(灰色)，层级降低，上架操作用 `primary`(蓝色) 更突出
