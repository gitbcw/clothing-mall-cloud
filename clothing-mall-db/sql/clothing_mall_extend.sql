-- =====================================================
-- Clothing Mall 增量表结构
-- 基于原有 litemall 表结构扩展服装店特有功能
-- =====================================================

USE clothing_mall;

-- =====================================================
-- 1. 商品 SKU 管理
-- =====================================================

-- 商品 SKU 表（颜色+尺码组合）
CREATE TABLE IF NOT EXISTS `clothing_goods_sku` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `goods_id` int(11) NOT NULL COMMENT '商品ID',
    `sku_code` varchar(50) DEFAULT NULL COMMENT 'SKU编码',
    `color` varchar(50) NOT NULL COMMENT '颜色',
    `color_image` varchar(255) DEFAULT NULL COMMENT '颜色图片',
    `size` varchar(20) NOT NULL COMMENT '尺码：S/M/L/XL/XXL',
    `price` decimal(10,2) NOT NULL COMMENT 'SKU价格',
    `stock` int(11) DEFAULT 0 COMMENT '库存',
    `image_url` varchar(255) DEFAULT NULL COMMENT 'SKU图片',
    `bar_code` varchar(50) DEFAULT NULL COMMENT '条形码',
    `is_default` tinyint(1) DEFAULT 0 COMMENT '是否默认SKU',
    `deleted` tinyint(1) DEFAULT 0 COMMENT '逻辑删除',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_goods_color_size` (`goods_id`, `color`, `size`),
    KEY `idx_goods_id` (`goods_id`),
    KEY `idx_bar_code` (`bar_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品SKU表';

-- 尺码表（系统级配置）
CREATE TABLE IF NOT EXISTS `clothing_size` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(20) NOT NULL COMMENT '尺码名称：S/M/L/XL/XXL',
    `display_name` varchar(50) DEFAULT NULL COMMENT '显示名称：小码/中码/大码',
    `sort_order` int(11) DEFAULT 0 COMMENT '排序',
    `enabled` tinyint(1) DEFAULT 1 COMMENT '是否启用',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='尺码配置表';

-- 颜色表（系统级配置）
CREATE TABLE IF NOT EXISTS `clothing_color` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(50) NOT NULL COMMENT '颜色名称',
    `color_code` varchar(20) DEFAULT NULL COMMENT '颜色代码（HEX）',
    `sort_order` int(11) DEFAULT 0 COMMENT '排序',
    `enabled` tinyint(1) DEFAULT 1 COMMENT '是否启用',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='颜色配置表';

-- 商品表增加字段
ALTER TABLE `litemall_goods`
    ADD COLUMN `season` varchar(20) DEFAULT NULL COMMENT '季节：spring/summer/autumn/winter/all_season' AFTER `gallery`,
    ADD COLUMN `style` varchar(50) DEFAULT NULL COMMENT '风格标签' AFTER `season`,
    ADD COLUMN `material` varchar(100) DEFAULT NULL COMMENT '材质' AFTER `style`,
    ADD COLUMN `size_table` text DEFAULT NULL COMMENT '尺码表JSON' AFTER `material`;

-- =====================================================
-- 2. 会员体系增强
-- =====================================================

-- 会员等级表
CREATE TABLE IF NOT EXISTS `clothing_member_level` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(50) NOT NULL COMMENT '等级名称',
    `min_points` int(11) DEFAULT 0 COMMENT '最低积分',
    `max_points` int(11) DEFAULT NULL COMMENT '最高积分（NULL表示无上限）',
    `discount_rate` decimal(3,2) DEFAULT 1.00 COMMENT '折扣率（0.95表示95折）',
    `points_rate` decimal(3,2) DEFAULT 1.00 COMMENT '积分倍率',
    `icon_url` varchar(255) DEFAULT NULL COMMENT '等级图标',
    `description` varchar(255) DEFAULT NULL COMMENT '等级说明',
    `sort_order` int(11) DEFAULT 0 COMMENT '排序',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员等级表';

-- 导购表
CREATE TABLE IF NOT EXISTS `clothing_guide` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(50) NOT NULL COMMENT '导购姓名',
    `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
    `avatar` varchar(255) DEFAULT NULL COMMENT '头像',
    `store_id` int(11) DEFAULT NULL COMMENT '门店ID',
    `qrcode_url` varchar(255) DEFAULT NULL COMMENT '专属二维码',
    `commission_rate` decimal(3,2) DEFAULT 0.01 COMMENT '提成比例',
    `status` tinyint(1) DEFAULT 1 COMMENT '状态：0离职 1在职',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint(1) DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_phone` (`phone`),
    KEY `idx_store_id` (`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导购表';

-- 门店表
CREATE TABLE IF NOT EXISTS `clothing_store` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL COMMENT '门店名称',
    `address` varchar(255) DEFAULT NULL COMMENT '地址',
    `phone` varchar(20) DEFAULT NULL COMMENT '电话',
    `business_hours` varchar(100) DEFAULT NULL COMMENT '营业时间',
    `longitude` decimal(10,6) DEFAULT NULL COMMENT '经度',
    `latitude` decimal(10,6) DEFAULT NULL COMMENT '纬度',
    `image_url` varchar(255) DEFAULT NULL COMMENT '门店图片',
    `status` tinyint(1) DEFAULT 1 COMMENT '状态：0关闭 1营业',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint(1) DEFAULT 0,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='门店表';

-- 会员积分流水表
CREATE TABLE IF NOT EXISTS `clothing_points_log` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL COMMENT '用户ID',
    `points` int(11) NOT NULL COMMENT '积分变动（正数增加，负数减少）',
    `type` varchar(20) NOT NULL COMMENT '类型：order_buy/order_comment/exchange/expire',
    `order_id` int(11) DEFAULT NULL COMMENT '关联订单ID',
    `remark` varchar(255) DEFAULT NULL COMMENT '备注',
    `balance_after` int(11) DEFAULT NULL COMMENT '变动后积分余额',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_add_time` (`add_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分流水表';

-- 用户表增加字段
ALTER TABLE `litemall_user`
    ADD COLUMN `level_id` int(11) DEFAULT NULL COMMENT '会员等级ID' AFTER `mobile`,
    ADD COLUMN `total_points` int(11) DEFAULT 0 COMMENT '累计积分' AFTER `level_id`,
    ADD COLUMN `available_points` int(11) DEFAULT 0 COMMENT '可用积分' AFTER `total_points`,
    ADD COLUMN `guide_id` int(11) DEFAULT NULL COMMENT '绑定导购ID' AFTER `available_points`,
    ADD COLUMN `store_id` int(11) DEFAULT NULL COMMENT '归属门店ID' AFTER `guide_id`;

-- =====================================================
-- 3. 订单增强（到店自提）
-- =====================================================

-- 订单表增加字段
ALTER TABLE `litemall_order`
    ADD COLUMN `delivery_type` varchar(20) DEFAULT 'express' COMMENT '配送方式：express快递/pickup自提' AFTER `freight_price`,
    ADD COLUMN `pickup_store_id` int(11) DEFAULT NULL COMMENT '自提门店ID' AFTER `delivery_type`,
    ADD COLUMN `pickup_contact` varchar(50) DEFAULT NULL COMMENT '自提联系人' AFTER `pickup_store_id`,
    ADD COLUMN `pickup_phone` varchar(20) DEFAULT NULL COMMENT '自提联系电话' AFTER `pickup_contact`,
    ADD COLUMN `pickup_time` datetime DEFAULT NULL COMMENT '预约自提时间' AFTER `pickup_phone`,
    ADD COLUMN `pickup_code` varchar(20) DEFAULT NULL COMMENT '取货码' AFTER `pickup_time`,
    ADD COLUMN `pickup_status` tinyint(1) DEFAULT 0 COMMENT '自提状态：0待自提 1已自提' AFTER `pickup_code`,
    ADD COLUMN `guide_id` int(11) DEFAULT NULL COMMENT '导购ID（业绩归属）' AFTER `pickup_status`;

-- 订单商品增加SKU信息
ALTER TABLE `litemall_order_goods`
    ADD COLUMN `sku_id` int(11) DEFAULT NULL COMMENT 'SKU ID' AFTER `product_id`,
    ADD COLUMN `color` varchar(50) DEFAULT NULL COMMENT '颜色' AFTER `sku_id`,
    ADD COLUMN `size` varchar(20) DEFAULT NULL COMMENT '尺码' AFTER `color`;

-- 购物车增加SKU信息
ALTER TABLE `litemall_cart`
    ADD COLUMN `sku_id` int(11) DEFAULT NULL COMMENT 'SKU ID' AFTER `product_id`,
    ADD COLUMN `color` varchar(50) DEFAULT NULL COMMENT '颜色' AFTER `sku_id`,
    ADD COLUMN `size` varchar(20) DEFAULT NULL COMMENT '尺码' AFTER `color`;

-- =====================================================
-- 4. 尺码推荐（可选功能）
-- =====================================================

-- 用户身材信息表
CREATE TABLE IF NOT EXISTS `clothing_user_body` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL COMMENT '用户ID',
    `height` int(11) DEFAULT NULL COMMENT '身高(cm)',
    `weight` int(11) DEFAULT NULL COMMENT '体重(kg)',
    `chest` int(11) DEFAULT NULL COMMENT '胸围(cm)',
    `waist` int(11) DEFAULT NULL COMMENT '腰围(cm)',
    `hip` int(11) DEFAULT NULL COMMENT '臀围(cm)',
    `recommended_size` varchar(20) DEFAULT NULL COMMENT '推荐尺码',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户身材信息表';
