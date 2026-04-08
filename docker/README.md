# Docker 部署指南

## 快速开始

### 一键启动（推荐）

```bash
# 在项目根目录执行
./scripts/docker-start.sh deploy
```

这将自动完成：
1. 初始化配置文件
2. 打包后端 JAR
3. 打包管理前端
4. 启动所有服务

### 常用命令

```bash
./scripts/docker-start.sh start       # 启动服务
./scripts/docker-start.sh stop        # 停止服务
./scripts/docker-start.sh restart     # 重启服务
./scripts/docker-start.sh status      # 查看状态
./scripts/docker-start.sh logs        # 查看日志
./scripts/docker-start.sh logs app    # 查看应用日志
./scripts/docker-start.sh --help      # 查看所有命令
```

### 启用代理模式（国内网络）

```bash
./scripts/docker-start.sh start --proxy
```

---

## 访问地址

| 服务 | 地址 |
|------|------|
| 管理后台 | http://localhost |
| 后端 API | http://localhost:8088 |
| MySQL | localhost:3306 |

**默认账号**：
- 管理后台：admin / admin123
- MySQL：clothing_mall / clothing123456

---

## 配置文件

| 文件 | 用途 |
|------|------|
| `.env` | 环境变量配置（从 `.env.example` 复制） |
| `litemall/application.local.yml` | 后端应用配置 |
| `nginx/conf.d/local.conf` | Nginx 配置 |
| `maven/settings.xml` | Maven 镜像配置 |

### 修改配置

1. 复制并编辑 `.env` 文件：
   ```bash
   cp docker/.env.example docker/.env
   # 编辑 docker/.env
   ```

2. 重启服务使配置生效：
   ```bash
   ./scripts/docker-start.sh restart
   ```

---

## 目录结构

```
docker/
├── docker-compose.local.yml   # 本地开发环境配置
├── docker-compose.yml         # 生产环境配置
├── .env.example               # 环境变量模板
├── .env                       # 环境变量（需创建）
├── litemall/
│   ├── Dockerfile             # 生产环境 Dockerfile
│   ├── Dockerfile.local       # 本地开发 Dockerfile
│   ├── application.yml        # 生产环境配置
│   ├── application.local.yml  # 本地开发配置
│   └── litemall.jar           # 后端 JAR 文件
├── nginx/
│   └── conf.d/
│       ├── default.conf       # 生产环境 Nginx 配置
│       └── local.conf         # 本地开发 Nginx 配置
├── db/
│   ├── init-sql/              # 数据库初始化脚本
│   └── conf.d/                # MySQL 配置
├── maven/
│   └── settings.xml           # Maven 阿里云镜像配置
└── admin-dist/                # 管理前端构建产物
```

---

## 手动操作

### 单独打包

```bash
# 打包后端
./scripts/docker-start.sh pack

# 打包管理前端
./scripts/docker-start.sh pack-admin
```

### 直接使用 Docker Compose

```bash
cd docker

# 启动
docker compose -f docker-compose.local.yml up -d

# 停止
docker compose -f docker-compose.local.yml down

# 查看日志
docker compose -f docker-compose.local.yml logs -f

# 重建
docker compose -f docker-compose.local.yml up -d --build
```

---

## 生产环境部署

### 1. 准备工作

```bash
# 复制环境配置
cp docker/.env.example docker/.env

# 编辑生产环境配置
# 修改 ENV=production
# 修改数据库密码
# 修改微信配置等
```

### 2. 打包

```bash
# 打包后端
mvn clean package -DskipTests -s docker/maven/settings.xml
cp clothing-mall-all/target/clothing-mall-all-0.1.0-exec.jar docker/litemall/litemall.jar

# 打包前端
cd clothing-mall-admin
npm install --registry=https://registry.npmmirror.com
npm run build:prod
cp -r dist ../docker/admin-dist
```

### 3. 上传到服务器

```bash
# 上传 docker 目录到服务器
scp -r docker admin@47.107.151.70:/home/admin/clothing-mall/
```

### 4. 服务器启动

```bash
ssh admin@47.107.151.70
cd /home/admin/clothing-mall/docker
docker compose -f docker-compose.yml up -d
```

---

## 故障排查

### 容器无法启动

```bash
# 查看容器状态
docker compose -f docker-compose.local.yml ps

# 查看容器日志
docker compose -f docker-compose.local.yml logs app
```

### 数据库连接失败

1. 确认 MySQL 容器已启动并健康：
   ```bash
   docker compose -f docker-compose.local.yml ps mysql
   ```

2. 检查数据库连接配置：
   ```bash
   cat docker/.env | grep MYSQL
   ```

### 镜像拉取失败（国内网络）

1. 启用代理模式：
   ```bash
   ./scripts/docker-start.sh start --proxy
   ```

2. 或配置 Docker 镜像加速器（阿里云）：
   ```json
   // ~/.docker/daemon.json
   {
     "registry-mirrors": [
       "https://mirror.ccs.tencentyun.com",
       "https://docker.mirrors.ustc.edu.cn"
     ]
   }
   ```

### 重置环境

```bash
# 危险：删除所有数据
./scripts/docker-start.sh clean
```

---

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | Nginx | HTTP 入口 |
| 3306 | MySQL | 数据库 |
| 8088 | Java App | 后端 API（宿主机端口） |

如需修改端口，编辑 `docker/.env` 文件：

```bash
NGINX_HTTP_PORT=8080
MYSQL_PORT=13306
APP_EXTERNAL_PORT=18088
```
