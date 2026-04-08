# 消息推送页面简化设计

## 动机

消息推送页面（push.vue）存在两个多余的 UI 元素：
1. "发送给测试组"按钮 — 企微 API 本身有管理员审批机制，不需要单独的测试发送入口
2. "高级选项 > 企微标签"折叠区域 — 嵌在推送目标 form-item 内部，UI 层级不清晰，且功能当前不需要

## 改动范围

仅修改 `clothing-mall-admin/src/views/wework/push.vue`，不涉及后端改动。

### 前端删除项

| 内容 | 位置 |
|------|------|
| "发送给测试组"按钮 | 模板第 93-95 行 |
| "高级选项 > 企微标签"折叠区域 | 模板第 17-28 行（el-collapse-transition + 展开按钮） |
| `handleSendToTest()` 方法 | script 第 281-302 行 |
| `showAdvanced`、`tagGroups`、`tagsLoading` data 属性 | script data() |
| `loadTags()` 方法 | script methods |
| `getTags` import | script import 行 |

### 保留不变

- 推送目标 checkbox-group（从推送组多选）
- 推送内容（小程序卡片 / 纯文本）
- 定时发送
- "立即发送"和"重置"按钮
- `pushForm.targetTagId` 字段（前端不传，后端兼容）

### 后端

不改动。`targetTagId` 在 sendMessage 接口中为可选参数，前端不传不影响逻辑。

## 简化后的 UI 结构

```
推送目标    [✓] 测试组(3人)  [✓] 活跃组(128人)  ...
推送内容    (●) 小程序卡片  ( ) 纯文本简文
卡片标题    [____________]
封面图片    [上传区域]
跳转页面    [下拉选择]
定时发送    [日期时间选择器]
            [立即发送]  [重置]
```
