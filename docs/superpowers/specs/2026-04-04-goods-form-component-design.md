# goods-form 组件化设计规格

**日期**: 2026-04-04
**状态**: Draft
**目标**: 将 tabShelf 上架表单和 goodsEdit 编辑页的重复表单代码抽取为共享组件

---

## 1. 背景与动机

当前 `tabShelf` 的「上架商品」子 tab 和 `goodsEdit` 页面各自维护了一套商品表单，字段重叠约 80%：

- 图片上传、基本信息、价格、分类、场景标签、简介、参数、SKU —— 完全重复
- AI 识别 —— 逻辑完全重复
- 详情编辑器 —— tabShelf 用 textarea，goodsEdit 用富文本 editor
- 关键词 —— 仅 goodsEdit 有

**问题**: 新增/修改字段需改两个地方，容易遗漏导致不一致。

---

## 2. 方案概述

创建 `components/goods-form` 自定义组件，封装所有表单区块和底部操作按钮。

### 文件结构

```
components/goods-form/
├── goods-form.js      — 组件逻辑（表单交互、图片上传、AI 识别、富文本编辑器、验证）
├── goods-form.json    — 组件声明
├── goods-form.wxml    — 表单模板
└── goods-form.wxss    — 表单样式
```

---

## 3. 组件接口

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | Object | `{}` | 表单初始数据，结构见下方 |
| `mode` | String | `'create'` | `'create'` 新建 / `'edit'` 编辑 |
| `features` | Object | `{}` | `{ keywords: true }` 控制关键词区块显示 |
| `loading` | Boolean | `false` | 加载状态 |
| `presetScenes` | Array | `[]` | 预设场景标签列表 |
| `categoryList` | Array | `[]` | 商品分类列表 |
| `goodsStatus` | String | `''` | 商品状态（编辑模式下控制按钮） |
| `isOnSale` | Boolean | `false` | 是否在售（编辑模式下控制下架按钮） |

### value 对象结构

```js
{
  picUrl: '',
  gallery: [],
  name: '',
  brief: '',
  detail: '',
  counterPrice: '',
  retailPrice: '',
  specialPrice: '',
  categoryId: '',
  categoryName: '',
  keywords: '',
  scenes: [],
  params: [],       // [{ key: '', value: '' }]
  skus: []          // [{ id, color, size, price, stock }]
}
```

### Events

| Event | 参数 | 触发时机 |
|-------|------|----------|
| `change` | `{ formData }` | 任一字段变更后触发，回传完整表单快照 |
| `save` | `{ formData }` | 用户点击「暂存草稿」（已通过验证） |
| `publish` | `{ formData }` | 用户点击「上架/保存并上架」（已通过验证） |
| `unpublish` | 无 | 用户点击「下架」 |
| `preview` | `{ formData }` | 用户点击「预览」（已通过验证） |

### 外部方法（通过 selectComponent 调用）

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getFormData()` | 无 | `Promise<Object>` | 从富文本编辑器获取最新 HTML 后返回完整表单数据 |

---

## 4. 组件内部职责

### 组件负责

- **表单渲染**: 所有表单区块（图片、基本信息、价格、分类、场景、简介、详情、关键词、参数）
- **图片上传**: 调用 `util.uploadFile` 上传主图和详情图
- **AI 识别**: 上传主图后调用 `api.AiRecognizeByUrl`，自动填充名称/简介/分类/场景/参数
- **富文本编辑器**: 管理 editor 上下文、工具栏格式、插入图片
- **分类选择器**: van-popup + van-picker
- **场景标签**: 选中/取消逻辑
- **参数管理**: 增删改
- **表单验证**: 名称必填、零售价必填（新建模式）
- **数据收集**: 从编辑器提取最新 HTML，组装提交数据
- **底部操作按钮**: 根据 mode/goodsStatus/isOnSale 控制按钮显示

### 父页面负责

- **数据初始化**: 加载分类列表、场景列表、编辑模式下加载商品详情
- **草稿管理**: 监听 `change` 事件保存到 localStorage（不同 storage key）
- **API 调用**: 监听 `save`/`publish`/`unpublish` 事件，调用后端 API
- **导航**: 返回、跳转预览页
- **成功/失败反馈**: Toast 提示

---

## 5. 底部按钮逻辑

| 条件 | 按钮 |
|------|------|
| `mode === 'create'` | 预览 / 暂存草稿 / 立即上架 |
| `mode === 'edit'` && 非 published | 预览 / 暂存草稿 / 保存并上架 |
| `mode === 'edit'` && published && isOnSale | 预览 / 暂存草稿 / 下架 |

---

## 6. 各页面改造范围

### tabShelf 改造

**保留**:
- 子 tab 切换逻辑（upload / list）
- 商品列表全部功能（搜索、批量操作、分页等）
- 草稿存取（`managerShelfDraft`）
- `onShow` 刷新列表
- TabBar

**替换**:
- upload 子 tab 的 WXML 替换为 `<goods-form value="{{form}}" ...>`
- 移除 upload 相关的 JS 方法（场景/参数/图片/AI 等操作方法约 200 行）
- 移除 upload 相关的 WXSS 样式（表单/图片/参数等约 300 行）

**新增**:
- `onGoodsFormChange` — 监听 change，autoSaveDraft
- `onGoodsFormSave` — 监听 save，调用 ManagerGoodsCreate
- `onGoodsFormPublish` — 监听 publish，调用 Create + Publish
- `onGoodsFormPreview` — 监听 preview，跳转预览页

### goodsEdit 改造

**保留**:
- 自定义导航栏（含返回按钮）
- 编辑模式：getGoodsDetail 加载数据
- 草稿存取（`managerGoodsEditDraft`）
- isEdit / goodsId 判断逻辑

**替换**:
- 表单区块 WXML 替换为 `<goods-form value="{{form}}" ...>`
- 移除重复的 JS 方法（约 200 行）
- 移除重复的 WXSS 样式（约 300 行）

**新增**:
- 与 tabShelf 类似的事件监听方法
- 编辑模式额外的 unpublish 处理

---

## 7. 样式处理

组件样式通过 `options.styleIsolation: 'isolated'` 隔离。

组件内部包含所有表单相关样式（约 400 行），从 `goodsEdit.wxss` 中提取。两个页面各自删除已迁移的样式，仅保留页面特有样式：

- **tabSheld**: 子 tab、商品列表、批量操作、草稿浮窗样式
- **goodsEdit**: 导航栏返回按钮、草稿提示条样式

---

## 8. 风险与回滚

| 风险 | 缓解措施 |
|------|----------|
| 组件内 editor 上下文管理复杂 | editor 的 onEditorReady 在组件 attached 生命周期初始化 |
| 富文本编辑器在 tabShelf 子 tab 切换时可能丢失状态 | 切换 tab 时通过 `getFormData()` 保存最新数据 |
| `change` 事件频繁触发影响性能 | 仅在 change 事件中保存草稿到 localStorage，不调用 setData |
| 回滚 | 保留 git 历史，直接 revert 即可恢复 |

---

## 9. 不在本次范围

- SKU 编辑区块（两个页面目前 WXML 中都没有 SKU UI，只有样式和逻辑预留）
- 表单字段的增减（仅做迁移，不改字段）
- 列表页 UI 变更
