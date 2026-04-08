#!/bin/bash
# ===========================================
# Clothing Mall Docker 一键启动脚本
# ===========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"

# 打印带颜色的消息
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示帮助
show_help() {
    echo "Clothing Mall Docker 管理脚本"
    echo ""
    echo "用法: $0 <命令> [选项]"
    echo ""
    echo "命令:"
    echo "  start       启动本地开发环境"
    echo "  stop        停止所有服务"
    echo "  restart     重启所有服务"
    echo "  status      查看服务状态"
    echo "  logs        查看日志 (可选: logs app/mysql/nginx)"
    echo "  build       构建镜像"
    echo "  rebuild     重新构建并启动"
    echo "  clean       清理所有容器和数据卷（危险！）"
    echo "  init        初始化环境（复制配置文件）"
    echo "  pack        打包 JAR 文件"
    echo "  pack-admin  打包管理前端"
    echo "  sync-db     从服务器同步数据库"
    echo "  deploy      完整部署（打包 + 启动本地环境）"
    echo "  deploy-prod 部署到生产服务器"
    echo ""
    echo "选项:"
    echo "  --proxy     启用代理模式"
    echo "  -h, --help  显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 start              # 启动本地开发环境"
    echo "  $0 start --proxy      # 使用代理启动"
    echo "  $0 logs app           # 查看应用日志"
    echo "  $0 deploy             # 完整部署本地环境"
    echo "  $0 deploy-prod        # 一键部署到生产服务器"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker 未运行，请先启动 Docker"
        exit 1
    fi
}

# 检查配置文件
check_config() {
    if [ ! -f "$DOCKER_DIR/.env" ]; then
        log_warn ".env 文件不存在，正在从模板创建..."
        cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
        log_success ".env 文件已创建，请根据需要修改配置"
    fi
}

# 检查 JAR 文件
check_jar() {
    if [ ! -f "$DOCKER_DIR/litemall/litemall.jar" ]; then
        log_error "litemall.jar 不存在，请先运行: $0 pack"
        return 1
    fi
    return 0
}

# 检查管理前端
check_admin_dist() {
    if [ ! -d "$DOCKER_DIR/admin-dist" ] || [ ! -f "$DOCKER_DIR/admin-dist/index.html" ]; then
        log_error "管理前端未构建，请先运行: $0 pack-admin"
        return 1
    fi
    return 0
}

# 打包 JAR
pack_jar() {
    log_info "开始打包后端 JAR..."

    cd "$PROJECT_ROOT"

    # 使用 Maven 打包
    log_info "执行 Maven 打包..."
    if [ -f "$DOCKER_DIR/maven/settings.xml" ]; then
        mvn clean package -DskipTests -s "$DOCKER_DIR/maven/settings.xml"
    else
        mvn clean package -DskipTests
    fi

    # 复制 JAR 文件
    log_info "复制 JAR 文件到 Docker 目录..."
    cp -f "$PROJECT_ROOT/clothing-mall-all/target/clothing-mall-all-0.1.0-exec.jar" "$DOCKER_DIR/litemall/litemall.jar"

    log_success "后端 JAR 打包完成！"
}

# 打包管理前端
pack_admin() {
    log_info "开始打包管理前端..."

    cd "$PROJECT_ROOT/clothing-mall-admin"

    # 安装依赖
    log_info "安装 npm 依赖..."
    npm install --registry=https://registry.npmmirror.com

    # 构建
    log_info "执行构建..."
    npm run build:prod

    # 复制到 Docker 目录
    log_info "复制构建产物到 Docker 目录..."
    rm -rf "$DOCKER_DIR/admin-dist"
    cp -r "$PROJECT_ROOT/clothing-mall-admin/dist" "$DOCKER_DIR/admin-dist"

    log_success "管理前端打包完成！"
}

# 启动服务
start_services() {
    local use_proxy=false

    if [ "$1" == "--proxy" ]; then
        use_proxy=true
    fi

    check_docker
    check_config

    if ! check_jar; then
        return 1
    fi

    if ! check_admin_dist; then
        return 1
    fi

    log_info "启动本地开发环境..."

    cd "$DOCKER_DIR"

    if [ "$use_proxy" == true ]; then
        log_info "启用代理模式..."
        export USE_PROXY=true
    fi

    docker compose -f docker-compose.local.yml up -d

    log_success "服务启动完成！"
    echo ""
    echo "访问地址:"
    echo "  管理后台: http://localhost"
    echo "  后端 API: http://localhost:8088"
    echo "  MySQL:    localhost:3306"
    echo ""
    echo "查看日志: $0 logs"
    echo "查看状态: $0 status"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.local.yml down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    stop_services
    start_services "$1"
}

# 查看状态
show_status() {
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.local.yml ps
}

# 查看日志
show_logs() {
    cd "$DOCKER_DIR"
    local service=$1

    if [ -n "$service" ]; then
        docker compose -f docker-compose.local.yml logs -f --tail=100 "$service"
    else
        docker compose -f docker-compose.local.yml logs -f --tail=100
    fi
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    cd "$DOCKER_DIR"
    docker compose -f docker-compose.local.yml build
    log_success "镜像构建完成"
}

# 重新构建并启动
rebuild_services() {
    stop_services
    build_images
    start_services "$1"
}

# 清理
clean_all() {
    log_warn "这将删除所有容器和数据卷！"
    read -p "确定要继续吗？(y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理中..."
        cd "$DOCKER_DIR"
        docker compose -f docker-compose.local.yml down -v --rmi local
        log_success "清理完成"
    else
        log_info "已取消"
    fi
}

# 初始化环境
init_env() {
    log_info "初始化环境..."

    # 复制 .env 文件
    if [ ! -f "$DOCKER_DIR/.env" ]; then
        cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
        log_success ".env 文件已创建"
    else
        log_info ".env 文件已存在，跳过"
    fi

    # 创建必要的目录
    mkdir -p "$DOCKER_DIR/litemall/storage"
    mkdir -p "$DOCKER_DIR/litemall/logs"
    mkdir -p "$DOCKER_DIR/litemall/backup"

    log_success "环境初始化完成！"
    echo ""
    echo "下一步:"
    echo "  1. 编辑 docker/.env 文件配置环境变量"
    echo "  2. 运行 $0 deploy 完整部署"
}

# 从服务器同步数据库
sync_db() {
    log_info "从服务器同步数据库..."

    local server="admin@47.107.151.70"
    local output_file="$DOCKER_DIR/db/init-sql/00_clothing_mall.sql"

    ssh "$server" "docker exec clothing-mall-mysql mysqldump -uroot -proot123456 --single-transaction clothing_mall 2>/dev/null" > "$output_file"

    if [ $? -eq 0 ]; then
        log_success "数据库同步完成！保存到: $output_file"
    else
        log_error "数据库同步失败"
        return 1
    fi
}

# 完整部署
full_deploy() {
    log_info "开始完整部署..."

    init_env
    pack_jar
    pack_admin
    start_services "$1"

    log_success "完整部署完成！"
}

# ===========================================
# 生产环境配置（可修改）
# ===========================================
PROD_SERVER="admin@47.107.151.70"
PROD_REMOTE_DIR="/home/admin/clothing-mall/docker"

# 部署到生产服务器
deploy_prod() {
    log_info "开始部署到生产服务器..."

    # 1. 本地打包
    log_info "步骤 1/5: 本地打包..."
    pack_jar
    pack_admin

    # 2. 同步配置文件（docker-compose.yml + .env + application.yml）
    log_info "步骤 2/5: 同步配置文件到服务器..."
    scp "$DOCKER_DIR/docker-compose.yml" "$PROD_SERVER:$PROD_REMOTE_DIR/"
    scp "$DOCKER_DIR/.env" "$PROD_SERVER:$PROD_REMOTE_DIR/"
    scp "$DOCKER_DIR/litemall/application.yml" "$PROD_SERVER:$PROD_REMOTE_DIR/litemall/"

    # 3. 上传 JAR 文件
    log_info "步骤 3/5: 上传 JAR 文件到服务器..."
    scp "$DOCKER_DIR/litemall/litemall.jar" "$PROD_SERVER:$PROD_REMOTE_DIR/litemall/"

    # 4. 上传前端文件
    log_info "步骤 4/5: 上传前端文件到服务器..."
    ssh "$PROD_SERVER" "rm -rf $PROD_REMOTE_DIR/admin-dist"
    scp -r "$DOCKER_DIR/admin-dist" "$PROD_SERVER:$PROD_REMOTE_DIR/"

    # 5. 远程重建并重启
    log_info "步骤 5/5: 远程重建并重启服务..."
    ssh "$PROD_SERVER" << 'EOF'
cd /home/admin/clothing-mall/docker
echo "重建 App 镜像..."
docker compose build app
echo "重启后端服务..."
docker compose up -d app
echo "重启 Nginx（刷新前端文件）..."
docker compose restart nginx
echo "等待服务启动..."
sleep 10
docker compose ps
EOF

    log_success "生产环境部署完成！"
    echo ""
    echo "访问地址:"
    echo "  管理后台: http://47.107.151.70:8080"
    echo "  后端 API: http://47.107.151.70:8088"
    echo ""
    echo "查看日志: ssh $PROD_SERVER 'cd $PROD_REMOTE_DIR && docker compose logs -f app'"
}

# 主入口
case "$1" in
    start)
        start_services "$2"
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services "$2"
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    build)
        build_images
        ;;
    rebuild)
        rebuild_services "$2"
        ;;
    clean)
        clean_all
        ;;
    init)
        init_env
        ;;
    pack)
        pack_jar
        ;;
    pack-admin)
        pack_admin
        ;;
    sync-db)
        sync_db
        ;;
    deploy)
        full_deploy "$2"
        ;;
    deploy-prod)
        deploy_prod
        ;;
    -h|--help|*)
        show_help
        ;;
esac
