# Clothing Mall

服装店线上渠道扩展系统，基于**微信小程序云开发**的全栈电商项目。

## 项目定位

帮助线下服装店打通线上渠道，实现：

- 线上商品展示与销售
- 多渠道推广（微信小程序）
- 线上线下库存同步
- 会员管理与营销
- 穿搭场景推荐
- 企业微信消息推送

## 技术栈

- **后端**：微信小程序云函数（Node.js） + 共享层
- **数据库**：云开发 MySQL
- **存储**：云开发云存储
- **管理后台**：Vue 2 + Element UI（静态托管在云环境）
- **小程序前端**：微信小程序原生框架

## 项目结构

```
clothing-mall-cloud/
├── cloudfunctions/           # 云函数（后端 API）
│   ├── layers/               # 共享层（layer-base, layer-auth, layer-wechat）
│   ├── admin-*               # 管理后台 API
│   ├── wx-*                  # 小程序端 API
│   └── task-*                # 定时任务
├── clothing-mall-admin/      # 管理后台前端（Vue 2 + Element UI）
├── clothing-mall-wx/         # 微信小程序前端
├── docker/db/                # 数据库初始化 SQL
└── docs/                     # 项目文档
```

## 开发指南

### 管理后台

```bash
cd clothing-mall-admin
npm install
npm run dev          # 开发模式，端口 9527
npm run build        # 生产构建
```

### 小程序

使用微信开发者工具打开 `clothing-mall-wx/` 目录。

### 云函数

使用微信开发者工具或 CloudBase MCP 工具部署。

## 文档

- [开发进度与需求总览](docs/current/INDEX.md)
- [文档导航](docs/README.md)

## License

MIT
