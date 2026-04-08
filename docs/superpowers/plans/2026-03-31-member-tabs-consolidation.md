# 会员管理 Tab 整合实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将会员管理、商品收藏、浏览足迹、搜索历史、收货地址 5 个页面整合到一个 el-tabs 容器中。

**Architecture:** 新建 `views/user/index.vue` 作为 Tab 容器，复用 `platform/config.vue` 的懒加载模式。路由层面将 `/platform/user` 指向新容器，旧路由重定向兼容。

**Tech Stack:** Vue 2, Element UI (el-tabs)

---

## File Structure

| 文件 | 职责 |
|------|------|
| `clothing-mall-admin/src/views/user/index.vue` | **新建** — Tab 容器，import 5 个子组件 |
| `clothing-mall-admin/src/router/index.js` | **修改** — 更新 user 路由 + 旧路由重定向 |

---

### Task 1: 创建 Tab 容器页面

**Files:**
- Create: `clothing-mall-admin/src/views/user/index.vue`

- [ ] **Step 1: 创建 `views/user/index.vue`**

参照 `clothing-mall-admin/src/views/platform/config.vue` 的模式，创建 Tab 容器：

```vue
<template>
  <div class="app-container member-center">
    <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
      <el-tab-pane label="会员管理" name="user">
        <user-list v-if="loadedTabs.user" />
      </el-tab-pane>
      <el-tab-pane label="商品收藏" name="collect">
        <collect-list v-if="loadedTabs.collect" />
      </el-tab-pane>
      <el-tab-pane label="浏览足迹" name="footprint">
        <footprint-list v-if="loadedTabs.footprint" />
      </el-tab-pane>
      <el-tab-pane label="搜索历史" name="history">
        <history-list v-if="loadedTabs.history" />
      </el-tab-pane>
      <el-tab-pane label="收货地址" name="address">
        <address-list v-if="loadedTabs.address" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import UserList from './user'
import CollectList from './collect'
import FootprintList from './footprint'
import HistoryList from './history'
import AddressList from './address'

export default {
  name: 'MemberCenter',
  components: { UserList, CollectList, FootprintList, HistoryList, AddressList },
  data() {
    return {
      activeTab: 'user',
      loadedTabs: { user: true, collect: false, footprint: false, history: false, address: false }
    }
  },
  methods: {
    handleTabClick(tab) {
      this.$set(this.loadedTabs, tab.name, true)
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.member-center {
  ::v-deep .el-tabs__content { padding: 0; }
  ::v-deep .app-container { padding: 20px 0 0 0; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add clothing-mall-admin/src/views/user/index.vue
git commit -m "feat(admin): 创建会员管理 Tab 容器页面"
```

---

### Task 2: 更新路由配置

**Files:**
- Modify: `clothing-mall-admin/src/router/index.js:256-310`

- [ ] **Step 1: 更新 `/platform/user` 路由指向新容器**

将 `router/index.js` 中第 258-259 行：

```js
// 会员管理
{
  path: 'user',
  component: () => import('@/views/user/user'),
  name: 'platformUser',
```

改为：

```js
// 会员管理（Tab 容器）
{
  path: 'user',
  component: () => import('@/views/user/index'),
  name: 'platformUser',
```

- [ ] **Step 2: 将旧路由改为重定向**

将 address、collect、footprint、history 四个路由（约 267-310 行）的 component 替换为重定向。每个路由改为：

```js
// 商品收藏（已合并至会员管理 Tab）
{
  path: 'collect',
  component: { render: h => h('div') },
  name: 'platformCollect',
  beforeEnter(to, from, next) { next('/platform/user?tab=collect') },
  meta: {
    perms: ['GET /admin/collect/list'],
    title: 'app.menu.user_collect',
    noCache: true
  },
  hidden: true
},
```

对 footprint、history、address 做同样处理（path 和 query.tab 对应修改）。

- [ ] **Step 3: Commit**

```bash
git add clothing-mall-admin/src/router/index.js
git commit -m "feat(admin): 路由指向会员管理 Tab 容器，旧路由重定向兼容"
```

---

### Task 3: 验证

- [ ] **Step 1: 启动开发服务器**

```bash
cd clothing-mall-admin && npm run dev
```

- [ ] **Step 2: 验证检查项**

1. 访问 `/platform/user`，应显示 5 个 Tab，默认选中「会员管理」
2. 点击每个 Tab，对应内容正常加载
3. 刷新页面，回到默认 Tab（会员管理）
4. 访问旧路由 `/platform/collect`，应重定向到 `/platform/user?tab=collect`
5. 意见反馈 `/platform/feedback` 仍可正常访问
