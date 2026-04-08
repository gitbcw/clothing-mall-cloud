# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

服装店线上渠道扩展系统，基于 Spring Boot 后端 + Vue 管理前端 + 微信小程序用户前端的多模块电商项目。

## 重要文档

| 文档 | 用途 |
|------|------|
| [docs/README.md](docs/README.md) | 文档导航入口 |
| [docs/guides/开发环境指南.md](docs/guides/开发环境指南.md) | 本地开发环境配置、Docker 一键启动 |
| [docs/guides/阿里云部署指南.md](docs/guides/阿里云部署指南.md) | 服务器部署流程、一键部署命令 |
| [docs/current/INDEX.md](docs/current/INDEX.md) | 当前开发进度与任务 |
| [docker/README.md](docker/README.md) | Docker 详细配置说明 |

**快速导航**：
- 本地开发 → `./scripts/docker-start.sh deploy`
- 服务器部署 → `./scripts/docker-start.sh deploy-prod`
- 文档入口 → `docs/README.md`

## 常用命令

### Docker 一键管理（推荐）

```bash
# 查看所有命令
./scripts/docker-start.sh --help

# 本地开发
./scripts/docker-start.sh deploy          # 一键部署本地环境
./scripts/docker-start.sh start           # 启动服务
./scripts/docker-start.sh stop            # 停止服务
./scripts/docker-start.sh restart         # 重启服务
./scripts/docker-start.sh status          # 查看状态
./scripts/docker-start.sh logs app        # 查看应用日志

# 生产部署
./scripts/docker-start.sh deploy-prod     # 一键部署到生产服务器
./scripts/docker-start.sh sync-db         # 从服务器同步数据库

# 打包
./scripts/docker-start.sh pack            # 打包后端 JAR
./scripts/docker-start.sh pack-admin      # 打包管理前端
```

### 后端 (Maven)

```bash
# 构建所有模块
mvn clean install

# 构建并打包
mvn clean package

# 启动聚合服务 (端口 8080)
java -Dfile.encoding=UTF-8 -jar clothing-mall-all/target/clothing-mall-all-0.1.0-exec.jar

# 启动管理后台 API (端口 8083)
java -jar clothing-mall-admin-api/target/clothing-mall-admin-api-0.1.0-exec.jar

# 启动小程序 API (端口 8082)
java -jar clothing-mall-wx-api/target/clothing-mall-wx-api-0.1.0-exec.jar
```

### 管理后台前端 (Vue 2 + Element UI)

```bash
cd clothing-mall-admin
npm install
# 开发模式启动 (端口 9527，代理到 localhost:8080)
npm run dev
# 生产构建
npm run build
# 代码检查
npm run lint
# 单元测试
npm run test:unit
```

### H5 移动端前端 (Vue 2 + Vant)

```bash
cd clothing-mall-vue
npm install
npm run dev
npm run build
```

## 模块架构

```
clothing-mall (Maven 根)
├── clothing-mall-core       # 公共组件：Web 配置、存储、短信、微信 SDKall-db
├── clothing-m # 数据库层：MyBatis Mapper、领域模型
├── clothing-mall-admin-api  # 管理后台后端 (依赖: db, core)
├── clothing-mall-wx-api     # 小程序后端 (依赖: db, core)
├── clothing-mall-all        # 聚合服务 (依赖: admin-api, wx-api)
└── clothing-mall-all-war    # WAR 包部署
```

前端模块：
- `clothing-mall-admin` - Web 管理端 (Vue 2 + Element UI)
- `clothing-mall-wx` - 微信小程序
- `clothing-mall-vue` - H5/移动端 (Vue 2 + Vant)

## 技术栈

- 后端：Spring Boot 2.1.5、MyBatis、PageHelper、Shiro (管理端)、JWT (小程序端)、Druid、Swagger
- 前端：Vue 2、Element UI、Vant、微信小程序
- 数据库：MySQL 8.0

## 认证机制

- 管理端：Shiro + Session，请求头 `X-Litemall-Admin-Token`
- 小程序端：JWT Token，请求头 `X-Litemall-Token`

## 关键约束

- 使用 JDK 1.8
- Vue 2 + webpack4 与新版 Node 兼容问题：Windows 下需设置 `NODE_OPTIONS=--openssl-legacy-provider`
- 本地联调优先使用 `127.0.0.1` 而非 `localhost`

## 工作协议（每次任务必须遵守）

1. 任务开始前：读 docs/current/INDEX.md 了解当前进度
2. 执行前：说明你的计划和将使用的工具，等确认
3. 任务完成后：更新 docs/current/INDEX.md 的状态
4. 遇到不确定的地方：标注「待确认」，不要自行假设


## 已知技术债与注意事项
- **编号唯一性问题**：`LitemallOrderService` 和 `LitemallAftersaleService` 中的订单号/售后编号生成逻辑存在重复可能（见 `TODO` 注释）
- **通知功能未完善**：订单状态变更时的邮件/短信通知标记为 `TODO`，采用异步发送但未实现
- **Dashboard 统计**：`dashboard/index.vue` 中的销售统计 API 标记为 `TODO`，目前使用模拟数据
- **字体依赖**：`QCodeService.java:164` 生成的二维码依赖服务器安装的字体，部署时需确认
- **gallery JSON 格式**：MySQL 中 gallery 字段必须为合法 JSON 数组格式 `["url1","url2"]`，字符串必须用双引号包裹
- **Docker 部署**：
  - 部署后必须重建镜像：`docker compose build app && docker compose up -d app`
