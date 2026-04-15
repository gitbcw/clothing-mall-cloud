# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

服装店线上渠道扩展系统，基于**微信小程序云开发**的全栈电商项目。后端为云函数，管理后台静态托管在云环境中，小程序端通过 `wx.cloud.callFunction` 直连云函数。

## 重要文档

| 文档 | 用途 |
|------|------|
| [docs/current/INDEX.md](docs/current/INDEX.md) | 当前开发进度、需求总览、关键决策记录 |
| [docs/README.md](docs/README.md) | 文档导航入口 |

## 架构概览

```
clothing-mall-cloud/
├── cloudfunctions/           # 云函数（后端 API）
│   ├── layers/               # 共享层（layer-base, layer-auth, layer-wechat）
│   ├── admin-*               # 管理后台 API（10 个函数）
│   │   ├── admin-auth        # 登录认证
│   │   ├── admin-goods       # 商品管理
│   │   ├── admin-order       # 订单管理
│   │   ├── admin-clothing    # 服装/SKU/门店
│   │   ├── admin-marketing   # 优惠券/促销
│   │   ├── admin-content     # 内容/广告/通用问题
│   │   ├── admin-storage     # 文件上传
│   │   ├── admin-system      # 系统配置/日志
│   │   ├── admin-stat        # 数据统计
│   │   ├── admin-config      # 平台配置
│   │   ├── admin-user        # 用户管理
│   │   └── admin-wework      # 企业微信推送
│   ├── wx-*                  # 小程序端 API（15 个函数）
│   │   ├── wx-auth           # 登录注册
│   │   ├── wx-home           # 首页数据
│   │   ├── wx-goods          # 商品/分类/搜索
│   │   ├── wx-cart           # 购物车
│   │   ├── wx-order          # 订单/售后
│   │   ├── wx-user           # 用户中心
│   │   ├── wx-coupon         # 优惠券
│   │   ├── wx-clothing       # 服装 SKU/门店
│   │   ├── wx-scene          # 场景/穿搭
│   │   ├── wx-storage        # 文件上传
│   │   ├── wx-express        # 物流查询
│   │   ├── wx-region         # 地区数据
│   │   ├── wx-tracker        # 行为追踪
│   │   ├── wx-ai             # AI 识别（Mock）
│   │   ├── wx-manager-order  # 小程序管理端-订单
│   │   ├── wx-manager-shelf  # 小程序管理端-上架
│   │   ├── wx-manager-content # 小程序管理端-内容
│   │   └── wx-manager-wework # 小程序管理端-企微推送
│   └── task-*                # 定时任务
│       ├── task-order        # 订单超时处理
│       ├── task-coupon       # 优惠券过期
│       └── task-push         # 定时推送
├── clothing-mall-wx/         # 微信小程序前端
├── clothing-mall-admin/      # 管理后台前端（Vue 2 + Element UI）
└── (legacy)/                 # 已废弃的 Java 后端模块，仅作参考
    ├── clothing-mall-core/
    ├── clothing-mall-db/
    ├── clothing-mall-admin-api/
    ├── clothing-mall-wx-api/
    ├── clothing-mall-all/
    └── clothing-mall-all-war/
```

## 技术栈

- **后端**：微信小程序云函数（Node.js），共享层 layer-base / layer-auth / layer-wechat
- **管理后台前端**：Vue 2 + Element UI，通过 CloudBase JS SDK 调用云函数，静态托管在云环境
- **小程序前端**：微信小程序原生框架，通过 `wx.cloud.callFunction` 调用云函数
- **数据库**：云开发 MySQL（通过 layer-base 的 db.query 访问）
- **存储**：云开发云存储（wx.cloud.uploadFile）

## API 调用机制

### 小程序端
`clothing-mall-wx/utils/util.js` 中的 `ROUTE_MAP` 将 REST 路径映射为云函数调用：
```
'order/detail' → wx.cloud.callFunction({ name: 'wx-order', data: { action: 'detail', data: {...} } })
```

### 管理后台前端
`clothing-mall-admin/src/utils/request.js` 中的 `ROUTE_MAP` 将 axios 请求映射为 CloudBase callFunction：
```
'goods/list' → app.callFunction({ name: 'admin-goods', data: { action: 'list', data: {...} } })
```

### 认证机制
- 管理后台：用户名密码登录 → admin-auth 云函数 → Token 存储
- 小程序端：微信登录 → wx-auth 云函数 → openid 鉴权
- 管理后台请求头 `X-Litemall-Admin-Token`，小程序请求头 `X-Litemall-Token`

## 常用命令

### 管理后台前端
```bash
cd clothing-mall-admin
npm install
npm run dev          # 开发模式 (端口 9527)
NODE_OPTIONS=--openssl-legacy-provider npm run build  # 生产构建
```

### 管理后台部署（构建产物 → 静态托管）
使用 CloudBase CLI 部署，**禁止逐文件上传**：
```bash
cd clothing-mall-admin
NODE_OPTIONS=--openssl-legacy-provider npm run build
cloudbase hosting deploy dist/ -e clo-test-4g8ukdond34672de
```
注意：MCP `uploadFiles` 的根路径上传有 bug，不要依赖它部署前端。

### 小程序
使用微信开发者工具打开 `clothing-mall-wx/` 目录，云函数在 `cloudfunctions/` 目录下。

### 云函数部署
使用 CloudBase MCP 工具部署，**修改云函数后立即部署，不需要用户确认**：
```
manageFunctions(action=updateFunctionCode, functionName=xxx, functionRootPath=cloudfunctions/)
```

## 云环境

- 环境 ID：`clo-test-4g8ukdond34672de`
- 管理后台静态托管在云环境

## 关键约束

- 云函数入口格式：`exports.main = async (event, context) => { ... }`，通过 `event.action` 路由
- 数据库操作通过 `layer-base` 的 `db.query(sql, params)` 方法，返回数组
- 响应格式统一：`response.ok(data)` / `response.fail(errno, errmsg)` / `response.badArgument()`
- Vue 2 + webpack4 与新版 Node 兼容问题：需设置 `NODE_OPTIONS=--openssl-legacy-provider`

## 工作协议（每次任务必须遵守）

1. 任务开始前：读 docs/current/INDEX.md 了解当前进度
2. 执行前：说明你的计划和将使用的工具，等确认
3. 任务完成后：更新 docs/current/INDEX.md 的状态
4. 遇到不确定的地方：标注「待确认」，不要自行假设
5. 修改云函数后立即部署，不需要确认

## 云函数层（Layer）部署规范

层内容解压到 `/opt/`，`require('模块名')` 查找 `/opt/node_modules/模块名/`。因此：

- **层的 zip 根目录必须是 `node_modules/模块名/`**
- 源码在 `cloudfunctions/layers/层名/nodejs/` 下，但打包时需要放到 `node_modules/层名/` 结构中
- 正确做法：先构建临时目录 `node_modules/layer-xxx/`（从 `nodejs/` 复制），再用 `contentPath` 指向该临时目录创建层版本
- `updateFunctionCode` 不会更新层，层需要单独 `createLayerVersion` + `updateFunctionLayers`
- **不要修改 layer-base 共享层**（v4 稳定版），新功能用本地副本

## 已知技术债与注意事项

- **AI 识别**：当前为 Mock 实现，需付费 API Key 才能接入真实服务
- **打印快递单**：需硬件设备支持，当前手动输入单号
- **编号唯一性**：售后编号生成存在重复可能（时间戳+随机数方案）
- **gallery JSON 格式**：MySQL 中 gallery 字段必须为合法 JSON 数组格式，字符串必须用双引号包裹
