-- 快递公司配置表
CREATE TABLE IF NOT EXISTS `litemall_shipper` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL COMMENT '快递公司编码',
  `name` varchar(63) NOT NULL COMMENT '快递公司名称',
  `enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用: 0禁用 1启用',
  `sort_order` int(11) NOT NULL DEFAULT 0 COMMENT '排序（小的在前）',
  `add_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  `deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递公司配置表';

-- 预设常用快递公司
INSERT INTO `litemall_shipper` (`code`, `name`, `enabled`, `sort_order`, `add_time`, `update_time`) VALUES
('SF', '顺丰速运', 1, 1, NOW(), NOW()),
('ZTO', '中通快递', 1, 2, NOW(), NOW()),
('YTO', '圆通速递', 1, 3, NOW(), NOW()),
('YD', '韵达速递', 1, 4, NOW(), NOW()),
('STO', '申通快递', 1, 5, NOW(), NOW()),
('JTSD', '极兔速递', 1, 6, NOW(), NOW()),
('EMS', 'EMS', 1, 7, NOW(), NOW()),
('JD', '京东快递', 1, 8, NOW(), NOW()),
('DBL', '德邦快递', 1, 9, NOW(), NOW()),
('YZPY', '邮政快递包裹', 1, 10, NOW(), NOW());
