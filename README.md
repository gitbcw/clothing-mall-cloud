# Clothing Mall

服装店线上渠道扩展系统。

基于 Spring Boot 后端 + Vue 管理员前端 + 微信小程序用户前端。

## 项目定位

帮助线下服装店打通线上渠道，实现：
- 线上商品展示与销售
- 多渠道推广（微信小程序、H5）
- 线上线下库存同步
- 会员管理与营销

## 技术栈

- Spring Boot 2.1.5
- Vue + Element UI
- 微信小程序
- MySQL 8.0

## 模块说明

| 模块 | 说明 |
|------|------|
| clothing-mall-core | 核心业务模块 |
| clothing-mall-db | 数据库访问层 |
| clothing-mall-admin-api | 管理后台 API |
| clothing-mall-wx-api | 微信小程序 API |
| clothing-mall-all | 整合部署模块 |
| clothing-mall-admin | 管理后台前端 |
| clothing-mall-wx | 微信小程序前端 |
| clothing-mall-vue | H5 移动端前端 |

## 快速启动

1. 创建数据库：
```sql
CREATE DATABASE clothing_mall DEFAULT CHARACTER SET utf8mb4;
```

2. 导入数据库脚本（clothing-mall-db/sql 目录）

3. 修改数据库配置（clothing-mall-db/src/main/resources/application-db.yml）

4. 启动后端服务：
```bash
mvn install
mvn clean package
java -Dfile.encoding=UTF-8 -jar clothing-mall-all/target/clothing-mall-all-0.1.0-exec.jar
```

5. 启动管理后台前端：
```bash
cd clothing-mall-admin
npm install
npm run dev
```

6. 微信开发者工具导入 clothing-mall-wx 项目

## License

MIT
