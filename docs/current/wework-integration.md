# 企业微信消息推送集成调研

## 一、背景

项目需要通过企业微信（WeWork）向外部联系人（客户）发送小程序卡片和文本消息，用于营销推广、订单通知等场景。

## 二、核心 API

### 2.1 群发消息接口 `add_msg_template`

**用途**：向企业微信外部联系人（客户）创建群发消息任务。

**注意**：此 API 创建的是「群发任务」，需要企微员工在手机端确认后才会实际发送，不是直接发送。

| 项目 | 说明 |
|------|------|
| 接口地址 | `POST https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_msg_template` |
| 所需权限 | 客户联系 -> 群发消息给客户 |
| 所需 token | 通讯录管理 secret 对应的 access_token |
| 频率限制 | 同一员工同一客户每天只能发 1 条；单次群发上限 20,000 客户 |

**请求体结构**：

```json
{
  "chat_type": "single",           // single=单聊, group=群聊
  "sender": "企业微信员工UserID",    // 发送者
  "external_userid": ["客户ID"],    // 指定客户（与 filter 二选一）
  "filter": {                       // 按标签筛选（与 external_userid 二选一）
    "tag_list": ["标签ID"]
  },
  "text": { "content": "文本内容" },
  "miniprogram": {
    "title": "卡片标题",
    "thumb_media_id": "素材ID",
    "appid": "小程序AppID",
    "page": "pages/index/index"
  }
}
```

### 2.2 素材上传接口 `media/upload`

| 项目 | 说明 |
|------|------|
| 接口地址 | `POST https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=TOKEN&type=image` |
| 用途 | 上传图片获取 thumb_media_id |
| 格式 | multipart/form-data，字段名 `media` |
| 限制 | 图片 2MB 以内，支持 jpg/png |

### 2.3 标签管理接口 `get_corp_tag_list`

| 项目 | 说明 |
|------|------|
| 接口地址 | `POST https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_corp_tag_list` |
| 用途 | 获取企业客户标签列表，用于按标签群发 |

## 三、现有代码分析

### 3.1 共享层 `layer-wechat/lib/wework.js`（已正确实现）

提供以下功能：
- `getAccessToken()` — 获取 access_token（带缓存）
- `sendMiniProgramCard(externalUserId, title, mediaId, page, appid)` — 单发小程序卡片
- `sendMiniProgramCardByTag(tagId, title, mediaId, page, appid)` — 按标签群发小程序卡片
- `sendShipNotification()` / `sendBirthdayGreeting()` — 订单/生日文本通知
- `getCorpTagList()` — 获取标签列表

内部 `postMessageTemplate()` 正确调用 `add_msg_template`。

### 3.2 管理后台 `admin-wework`（需要修复）

| 函数 | 状态 | 问题 |
|------|------|------|
| `tags()` | 可用 | 查数据库返回配置信息，建议改用 layer-wechat |
| `pages()` | 可用 | 返回默认页面 + 活动页面 |
| `uploadMedia()` | 占位 | 返回"请使用前端上传接口" |
| `sendCard()` | **TODO** | 只有参数校验，未调用 API |
| `pushGroups()` | 可用 | 查推送组列表 |
| `sendMessage()` | 基本可用 | 插入推送日志，但未实际调用企微 API |

### 3.3 小程序管理端 `wx-manager-wework`（需要修复）

| 函数 | 状态 | 问题 |
|------|------|------|
| `sendCard()` | **用错 API** | 调用了 `send_welcome_msg`（欢迎语接口），应该用 `add_msg_template` |
| `sendMessage()` | 部分正确 | 部分分支用对了 API，但逻辑不够清晰 |
| 其他函数 | 可用 | tags/pages/uploadMedia/pushGroups 正常 |

## 四、系统配置项

存储在 `litemall_system` 表中：

| 配置键 | 说明 |
|--------|------|
| `litemall_wework_corp_id` | 企业微信 CorpID |
| `litemall_wework_agent_id` | 应用 AgentID |
| `litemall_wework_agent_secret` | 应用 Secret |
| `litemall_wework_contact_secret` | 通讯录管理 Secret（用于群发 API） |
| `litemall_wework_sender_id` | 发送者员工 UserID |
| `litemall_wework_miniprogram_appid` | 关联小程序 AppID |
| `litemall_wework_push_target_type` | 推送目标类型 |
| `litemall_wework_push_tag_id` | 默认推送标签 |
| `litemall_wework_activity_pages` | 活动页面配置 JSON |

## 五、工作清单

### P0 — 必须修复

- [ ] **修复 `admin-wework` 的 `sendCard`**：调用 `layer-wechat` 的 `sendMiniProgramCardByTag`
- [ ] **修复 `wx-manager-wework` 的 `sendCard`**：改为调用 `layer-wechat` 的 `sendMiniProgramCardByTag`，替换错误的 `send_welcome_msg` 调用
- [ ] **修复 `wx-manager-wework` 的 `sendMessage`**：整合到 `add_msg_template` 模式

### P1 — 建议优化

- [ ] `admin-wework` 的 `tags()` 改用 `layer-wechat.getCorpTagList()`，获取真实标签
- [ ] `admin-wework` 的 `sendMessage()` 增加实际企微 API 调用
- [ ] `wx-manager-wework` 的 `tags()` 同样改用 `layer-wechat.getCorpTagList()`
- [ ] `uploadMedia` 在两个云函数中都需要实现对 `media/upload` 的调用

### P2 — 体验优化

- [ ] 前端展示群发任务的发送状态（需查询 `get_group_msg_send_result`）
- [ ] 推送日志表增加 `msg_id` 字段，关联企微群发任务
- [ ] 定时推送任务 `task-push` 对接真实的群发 API

## 六、依赖关系

```
sendCard 修复
├── layer-wechat (已完成 ✓)
│   ├── getAccessToken() — 获取 token
│   └── sendMiniProgramCardByTag() — 群发卡片
├── admin-wework (待修复)
│   └── sendCard → 调用 layer-wechat
└── wx-manager-wework (待修复)
    └── sendCard → 调用 layer-wechat
```

## 七、注意事项

1. **不是直接发送**：`add_msg_template` 创建群发任务，员工需要在企微手机端确认
2. **Secret 区分**：群发 API 需要通讯录管理 secret（`WEWORK_CONTACT_SECRET`），不是应用 secret
3. **小程序关联**：企微后台需要关联小程序，否则卡片无法打开
4. **素材有效期**：临时素材 3 天过期，推送前需确认素材有效
5. **发送者必须是企微员工**：`sender` 字段的 UserID 必须是有客户联系权限的员工
