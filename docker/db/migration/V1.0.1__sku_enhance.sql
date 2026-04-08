-- =====================================================
-- SKU 管理增强
-- 支持独立 SKU 库、AI 识别、草稿状态
-- =====================================================

USE clothing_mall;

-- 1. 修改 clothing_goods_sku 表，支持独立 SKU
-- 注意：如果 goods_id 已有 NOT NULL 约束，需要先移除
ALTER TABLE `clothing_goods_sku`
    MODIFY COLUMN `goods_id` int(11) DEFAULT NULL COMMENT '商品ID（未上架时为空）',
    ADD COLUMN `status` varchar(20) DEFAULT 'draft' COMMENT '状态：draft草稿/pending待上架/published已上架' AFTER `goods_id`,
    ADD COLUMN `category_id` int(11) DEFAULT NULL COMMENT '分类ID' AFTER `status`,
    ADD COLUMN `brand` varchar(50) DEFAULT NULL COMMENT '品牌' AFTER `category_id`,
    ADD COLUMN `name` varchar(127) DEFAULT NULL COMMENT 'SKU名称（AI识别结果）' AFTER `brand`,
    ADD COLUMN `brief` varchar(255) DEFAULT NULL COMMENT '简介' AFTER `name`,
    ADD COLUMN `material` varchar(100) DEFAULT NULL COMMENT '材质' AFTER `brief`,
    ADD COLUMN `season` varchar(20) DEFAULT NULL COMMENT '季节：spring/summer/autumn/winter/all_season' AFTER `material`,
    ADD COLUMN `style` varchar(50) DEFAULT NULL COMMENT '风格标签' AFTER `season`,
    ADD COLUMN `ai_recognized` tinyint(1) DEFAULT 0 COMMENT '是否AI识别录入' AFTER `style`,
    ADD COLUMN `ai_confidence` decimal(3,2) DEFAULT NULL COMMENT 'AI识别置信度' AFTER `ai_recognized`,
    ADD COLUMN `source_image` varchar(255) DEFAULT NULL COMMENT '源图片（拍照图片）' AFTER `ai_confidence`;

-- 2. 添加索引
ALTER TABLE `clothing_goods_sku`
    ADD KEY `idx_status` (`status`),
    ADD KEY `idx_category_id` (`category_id`),
    ADD KEY `idx_ai_recognized` (`ai_recognized`);

-- 3. 创建场景标签表
CREATE TABLE IF NOT EXISTS `clothing_scene` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(50) NOT NULL COMMENT '场景名称',
    `icon` varchar(255) DEFAULT NULL COMMENT '场景图标',
    `description` varchar(255) DEFAULT NULL COMMENT '场景描述',
    `sort_order` int(11) DEFAULT 0 COMMENT '排序',
    `enabled` tinyint(1) DEFAULT 1 COMMENT '是否启用',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` tinyint(1) DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场景标签表';

-- 4. 创建商品场景关联表
CREATE TABLE IF NOT EXISTS `clothing_goods_scene` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `goods_id` int(11) NOT NULL COMMENT '商品ID',
    `scene_id` int(11) NOT NULL COMMENT '场景ID',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_goods_scene` (`goods_id`, `scene_id`),
    KEY `idx_goods_id` (`goods_id`),
    KEY `idx_scene_id` (`scene_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品场景关联表';

-- 5. 修改分类表，添加季节开关
ALTER TABLE `litemall_category`
    ADD COLUMN `season_switch` varchar(50) DEFAULT 'all' COMMENT '季节开关：spring/summer/autumn/winter/all（逗号分隔多选）' AFTER `desc`;

-- 6. 初始化场景标签数据
INSERT INTO `clothing_scene` (`name`, `description`, `sort_order`) VALUES
('日常通勤', '适合日常工作和通勤穿着', 1),
('约会', '适合约会和社交场合', 2),
('运动健身', '适合运动和健身活动', 3),
('休闲度假', '适合休闲和度假场合', 4),
('商务正装', '适合商务和正式场合', 5),
('居家休闲', '适合居家和休闲时光', 6)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
