# 会员管理 Tab 整合设计

**日期**: 2026-03-31
**状态**: 已确认

## 背景

平台设置下有 1 个可见菜单「会员管理」和 5 个隐藏页面（收货地址、商品收藏、浏览足迹、搜索历史、意见反馈）。用户希望将会员相关页面整合到一个 el-tabs 页面中，方便统一管理。

## 范围

纳入 Tab 的页面（5 个）：
- 会员管理 (`user.vue`)
- 商品收藏 (`collect.vue`)
- 浏览足迹 (`footprint.vue`)
- 搜索历史 (`history.vue`)
- 收货地址 (`address.vue`)

不纳入：意见反馈 (`feedback.vue`) — 保持独立隐藏路由。

## 方案

采用 **单页面内嵌 el-tabs** 方案，与 `platform/config.vue` 模式一致。

### 架构

新建 `views/user/index.vue` 作为 Tab 容器：
- `el-tabs type="card"` + 懒加载（`v-if="loadedTabs[xxx]"`）
- 首个 Tab 默认加载，其余 Tab 点击时才加载
- 5 个现有页面作为子组件直接 import

### Tab 结构

| 顺序 | Tab 名称 | name | 组件 |
|------|----------|------|------|
| 1 | 会员管理 | `user` | `views/user/user.vue` |
| 2 | 商品收藏 | `collect` | `views/user/collect.vue` |
| 3 | 浏览足迹 | `footprint` | `views/user/footprint.vue` |
| 4 | 搜索历史 | `history` | `views/user/history.vue` |
| 5 | 收货地址 | `address` | `views/user/address.vue` |

### 路由变更

- `/platform/user` → 指向新的 `views/user/index.vue`
- `/platform/address`、`/platform/collect`、`/platform/footprint`、`/platform/history` → 保留为隐藏路由，component 重定向到 `/platform/user`（兼容旧链接）
- `/platform/feedback` → 保持隐藏不变

### 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `clothing-mall-admin/src/views/user/index.vue` | Tab 容器 |
| 修改 | `clothing-mall-admin/src/router/index.js` | 更新路由指向 |

### 不需要改动

- 5 个子页面组件本身（复用现有代码）
- 后端 API（零改动）
- 国际化文件（Tab label 直接写中文）
