# 小程序管理端商品详情富文本编辑器

## 动机

当前小程序管理端（goodsEdit 页面）商品详情使用纯文本 textarea 编辑，最多 500 字，无法插入图片或排版。而展示端使用 `rich-text` 组件渲染 HTML，管理后台（Vue）使用 TinyMCE 输出完整 HTML。小程序端录入的纯文本与管理后台产出的 HTML 存在格式不一致。

需要在小程序管理端支持富文本编辑，让店主可以直接在手机上编辑带格式、带图片的商品详情。

## 方案

使用微信小程序原生 `editor` 组件 + 自定义内联工具栏，替换现有 textarea。

基础库要求 >= 2.7.1，项目当前 3.15.0，满足条件。

## 改动范围

仅改动 `clothing-mall-wx/pages/manager/goodsEdit/` 下的三个文件：

| 文件 | 改动 |
|------|------|
| `goodsEdit.wxml` | textarea 替换为 editor + 工具栏按钮组 |
| `goodsEdit.js` | 新增 editor 初始化、图片插入、内容获取逻辑 |
| `goodsEdit.wxss` | 工具栏和编辑区样式 |

不改后端、不改数据库、不改其他页面。

## 工具栏按钮

固定在 editor 上方的按钮组：

| 按钮 | 功能 | API 调用 |
|------|------|----------|
| **B** | 加粗 | `EditorContext.format('bold')` |
| *I* | 斜体 | `EditorContext.format('italic')` |
| H1 | 大标题 | `EditorContext.format('header', 1)` |
| H2 | 小标题 | `EditorContext.format('header', 2)` |
| 有序列表 | 有序列表 | `EditorContext.format('list', 'ordered')` |
| 无序列表 | 无序列表 | `EditorContext.format('list', 'bullet')` |
| 图片 | 插入图片 | `wx.chooseImage` → 上传 OSS → `insertImage` |
| 撤销 | 撤销 | `EditorContext.undo()` |
| 重做 | 重做 | `EditorContext.redo()` |

## 数据流

```
编辑时：
  editor 组件 → onStatusChange 记录编辑器状态
  点击工具栏 → EditorContext.format() / insertImage()
  表单提交时 → EditorContext.getContents() → HTML → goods.detail

回显时：
  goods.detail (HTML) → EditorContext.setContents({ html })
```

## 图片上传

复用现有的 `uploadImage` 方法（走 OSS）：

1. 点击图片按钮 → `wx.chooseImage` 选图
2. 上传到 OSS 获取 URL
3. `EditorContext.insertImage({ src: url })` 插入编辑器

## 字数限制

去掉 500 字限制。数据库 `detail` 字段类型为 TEXT（约 64KB），足够存储富文本 HTML。

## UI 布局

```
┌─────────────────────────────┐
│ 商品详细介绍                 │
├─────────────────────────────┤
│ [B] [I] [H1] [H2]          │
│ [有序] [无序] [📷] [↶] [↷]  │
├─────────────────────────────┤
│                             │
│  editor 编辑区域             │
│  placeholder: 请输入商品详情 │
│                             │
│                             │
└─────────────────────────────┘
```

## 风险与注意事项

1. **数据格式兼容**：editor 输出 HTML，与管理后台 TinyMCE 产出的 HTML 可互相编辑
2. **editor 组件 read-only**：editor 不可与 scroll-view 嵌套使用，需注意页面滚动
3. **图片大小**：editor 中的图片默认宽度 100%，无需额外处理
