-- M3 阶段数据库迁移脚本
-- 版本: v1.0
-- 日期: 2026-03-10
-- 说明: 活动功能开发

-- 1. 限时特卖表
CREATE TABLE IF NOT EXISTS `litemall_flash_sale` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `goods_id` int(11) NOT NULL COMMENT '商品ID',
  `goods_name` varchar(127) NOT NULL COMMENT '商品名称',
  `original_price` decimal(10,2) NOT NULL COMMENT '原价',
  `flash_price` decimal(10,2) NOT NULL COMMENT '特卖价',
  `flash_stock` int(11) NOT NULL COMMENT '特卖库存',
  `flash_sales` int(11) DEFAULT 0 COMMENT '已售数量',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `status` smallint(6) DEFAULT 0 COMMENT '状态：0未开始，1进行中，2已结束',
  `sort_order` smallint(6) DEFAULT 0 COMMENT '排序',
  `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_goods_id` (`goods_id`),
  KEY `idx_time_range` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='限时特卖';

-- 2. 满减规则表
CREATE TABLE IF NOT EXISTS `litemall_full_reduction` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(63) NOT NULL COMMENT '活动名称',
  `desc` varchar(255) DEFAULT NULL COMMENT '活动描述',
  `threshold` decimal(10,2) NOT NULL COMMENT '满减门槛金额',
  `discount` decimal(10,2) NOT NULL COMMENT '减免金额',
  `status` smallint(6) DEFAULT 0 COMMENT '状态：0禁用，1启用',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `sort_order` smallint(6) DEFAULT 0 COMMENT '排序',
  `add_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='满减规则';

-- 3. 系统配置项
INSERT INTO `litemall_system` (`key_name`, `key_value`) VALUES
('litemall_newuser_first_order_discount', '10'),
('litemall_birthday_coupon_status', '1'),
('litemall_birthday_coupon_id', ''),
('litemall_birthday_coupon_days', '30'),
('litemall_full_reduction_stack_with_coupon', '0'),
('litemall_wework_corp_id', ''),
('litemall_wework_contact_secret', ''),
('litemall_wework_push_target_type', '1'),
('litemall_wework_push_tag_id', ''),
('litemall_wework_sender_id', '')
ON DUPLICATE KEY UPDATE `key_value` = VALUES(`key_value`);
