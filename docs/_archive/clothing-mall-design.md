# Clothing Mall 功能设计方案

## 一、业务背景

线下服装店打通线上渠道：
- 线上展示商品，吸引顾客
- 支持到店自提或快递发货
- 会员管理与精准营销
- 导购业绩追踪

## 二、核心改动

### 2.1 商品 SKU 管理（高优先级）

**现状**：商品只有单一规格
**目标**：支持 颜色 + 尺码 组合的 SKU

**数据库设计**：
```sql
-- 商品表增加字段
ALTER TABLE litemall_goods ADD COLUMN season VARCHAR(20) COMMENT '季节：spring/summer/autumn/winter';
ALTER TABLE litemall_goods ADD COLUMN style VARCHAR(50) COMMENT '风格标签';

-- 商品 SKU 表（新建）
CREATE TABLE clothing_goods_sku (
    id INT PRIMARY KEY AUTO_INCREMENT,
    goods_id INT NOT NULL COMMENT '商品ID',
    sku_code VARCHAR(50) COMMENT 'SKU编码',
    color VARCHAR(50) NOT NULL COMMENT '颜色',
    size VARCHAR(20) NOT NULL COMMENT '尺码：S/M/L/XL/XXL',
    price DECIMAL(10,2) NOT NULL COMMENT 'SKU价格',
    stock INT DEFAULT 0 COMMENT '库存',
    image_url VARCHAR(255) COMMENT 'SKU图片',
    bar_code VARCHAR(50) COMMENT '条形码',
    is_default TINYINT DEFAULT 0 COMMENT '是否默认SKU',
    deleted TINYINT DEFAULT 0,
    add_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_goods_color_size (goods_id, color, size)
);

-- 尺码表（系统级）
CREATE TABLE clothing_size (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL COMMENT '尺码名称：S/M/L/XL',
    sort_order INT DEFAULT 0,
    enabled TINYINT DEFAULT 1
);
```

### 2.2 会员体系增强（中优先级）

**数据库设计**：
```sql
-- 会员等级表
CREATE TABLE clothing_member_level (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '等级名称',
    min_points INT DEFAULT 0 COMMENT '最低积分',
    discount_rate DECIMAL(3,2) DEFAULT 1.00 COMMENT '折扣率',
    description VARCHAR(255) COMMENT '等级说明',
    sort_order INT DEFAULT 0
);

-- 会员表增加字段
ALTER TABLE litemall_user ADD COLUMN level_id INT COMMENT '会员等级ID';
ALTER TABLE litemall_user ADD COLUMN total_points INT DEFAULT 0 COMMENT '累计积分';
ALTER TABLE litemall_user ADD COLUMN guide_id INT COMMENT '绑定导购ID';
ALTER TABLE litemall_user ADD COLUMN store_id INT COMMENT '归属门店ID';

-- 导购表
CREATE TABLE clothing_guide (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '导购姓名',
    phone VARCHAR(20) COMMENT '手机号',
    store_id INT COMMENT '门店ID',
    qrcode_url VARCHAR(255) COMMENT '专属二维码',
    commission_rate DECIMAL(3,2) DEFAULT 0.01 COMMENT '提成比例',
    status TINYINT DEFAULT 1,
    add_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 门店表
CREATE TABLE clothing_store (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '门店名称',
    address VARCHAR(255) COMMENT '地址',
    phone VARCHAR(20) COMMENT '电话',
    business_hours VARCHAR(100) COMMENT '营业时间',
    longitude DECIMAL(10,6) COMMENT '经度',
    latitude DECIMAL(10,6) COMMENT '纬度',
    status TINYINT DEFAULT 1,
    add_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 订单增强（中优先级）

**数据库设计**：
```sql
-- 订单表增加字段
ALTER TABLE litemall_order ADD COLUMN delivery_type VARCHAR(20) DEFAULT 'express' COMMENT '配送方式：express/pickup';
ALTER TABLE litemall_order ADD COLUMN pickup_store_id INT COMMENT '自提门店ID';
ALTER TABLE litemall_order ADD COLUMN pickup_time DATETIME COMMENT '预约自提时间';
ALTER TABLE litemall_order ADD COLUMN pickup_code VARCHAR(20) COMMENT '取货码';

-- 订单商品增加 SKU
ALTER TABLE litemall_order_goods ADD COLUMN sku_id INT COMMENT 'SKU ID';
ALTER TABLE litemall_order_goods ADD COLUMN color VARCHAR(50) COMMENT '颜色';
ALTER TABLE litemall_order_goods ADD COLUMN size VARCHAR(20) COMMENT '尺码';
```

### 2.4 购物车增强

**数据库设计**：
```sql
-- 购物车增加 SKU
ALTER TABLE litemall_cart ADD COLUMN sku_id INT COMMENT 'SKU ID';
ALTER TABLE litemall_cart ADD COLUMN color VARCHAR(50) COMMENT '颜色';
ALTER TABLE litemall_cart ADD COLUMN size VARCHAR(20) COMMENT '尺码';
```

## 三、移除的功能

1. **renard-wx** - 删除整个目录
2. **品牌管理** - 简化为"风格/系列"标签（保留数据结构，前端简化）
3. **复杂团购** - 保留基础拼团功能

## 四、实施阶段

### 阶段1：数据库结构
- 创建新表
- 修改现有表结构
- 初始化基础数据

### 阶段2：后端 API
- SKU 管理接口
- 会员等级接口
- 订单自提接口
- 导购管理接口

### 阶段3：前端改造
- 小程序商品详情页（SKU选择器）
- 购物车适配
- 订单流程适配
- 管理后台 SKU 管理

## 五、保留功能

- 商品基础管理
- 订单管理
- 优惠券
- 基础团购/秒杀
- 评价系统
- 搜索功能

---

## 六、实施进度

### 阶段1：数据库结构 ✅ 已完成

| 任务 | 状态 | 文件 |
|------|------|------|
| Schema 脚本 | ✅ | `clothing-mall-db/sql/clothing_mall_schema.sql` |
| 增量表结构 | ✅ | `clothing-mall-db/sql/clothing_mall_extend.sql` |
| 初始数据 | ✅ | `clothing-mall-db/sql/clothing_mall_data.sql` |

**新增表：**
- `clothing_goods_sku` - 商品 SKU（颜色+尺码）
- `clothing_member_level` - 会员等级
- `clothing_store` - 门店
- `clothing_guide` - 导购
- `clothing_size` - 尺码配置
- `clothing_color` - 颜色配置
- `clothing_points_log` - 积分流水
- `clothing_user_body` - 用户身材信息

**修改表：**
- `litemall_goods` - 增加 season, style, material, size_table 字段
- `litemall_user` - 增加 level_id, total_points, available_points, guide_id, store_id 字段
- `litemall_order` - 增加 delivery_type, pickup_* 等自提相关字段
- `litemall_order_goods` - 增加 sku_id, color, size 字段
- `litemall_cart` - 增加 sku_id, color, size 字段

### 阶段2：后端代码 ✅ 已完成

| 任务 | 状态 | 文件 |
|------|------|------|
| 实体类 | ✅ | `domain/ClothingGoodsSku.java` 等 |
| Mapper 接口 | ✅ | `dao/ClothingGoodsSkuMapper.java` 等 |
| Mapper XML | ✅ | `dao/ClothingGoodsSkuMapper.xml` 等 |
| Service 类 | ✅ | `service/ClothingGoodsSkuService.java` 等 |
| Admin API | ✅ | `AdminClothingSkuController.java` 等 |
| Wx API | ✅ | `WxClothingSkuController.java` 等 |
| LitemallUser 扩展 | ✅ | 添加会员字段 |

### 阶段3：前端改造 ✅ 已完成

| 任务 | 状态 | 文件 |
|------|------|------|
| SKU 选择器组件 | ✅ | `components/sku-picker/*` |
| 商品详情页集成 | ✅ | `pages/goods/goods.*` |
| API 接口配置 | ✅ | `config/api.js` |
| 购物车前端适配 | ✅ | `pages/cart/cart.*` |
| 购物车后端适配 | ✅ | `WxCartController.java`, `LitemallCart.java` |
| 订单流程适配 | ✅ | `pages/checkout/*`, `pages/ucenter/orderDetail/*` |
| 管理后台 SKU 管理 | ✅ | `views/mall/sku.vue` |
| 管理后台门店管理 | ✅ | `views/mall/store.vue` |
| 管理后台导购管理 | ✅ | `views/mall/guide.vue` |
| 管理后台会员等级管理 | ✅ | `views/mall/memberLevel.vue` |

### 其他已完成

| 任务 | 状态 |
|------|------|
| 项目标识修改 | ✅ |
| 删除 renard-wx | ✅ |
| README 更新 | ✅ |

---

*文档版本：v1.2*
*创建时间：2025-02-23*
*更新时间：2025-02-24*
