-- 开始事务
START TRANSACTION;

-- ============================================================
-- 1. 新增运费计费类型配置项
-- ============================================================

-- 运费类型:0=固定运费, 1=按件数计费
INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
VALUES ('litemall_express_freight_type', '0', NOW(), now(), 0);

-- 如果不存在则插入，INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
SELECT 'litemall_express_freight_type' FROM `litemall_system` WHERE `key_name` = 'litemall_express_freight_type';

INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
VALUES ('litemall_express_freight_type', '0', NOW(), now(), 0);

-- ============================================================
-- 2. 新增按件数计费配置项
-- ============================================================

-- 首件数量（默认1件）
INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
VALUES ('litemall_express_freight_first_unit', '1', NOW(), now(), 0)
ON DUPLICATE KEY UPDATE `litemall_system` SET `key_value` = '1', `update_time` = NOW() WHERE `key_name` = 'litemall_express_freight_first_unit';

-- 续件数量（默认1件)
INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
VALUES ('litemall_express_freight_additional_unit', '1', NOW(), now(), 0)
ON DUPLICATE KEY UPDATE `litemall_system` SET `key_value` = '1', `update_time` = NOW() WHERE `key_name` = 'litemall_express_freight_additional_unit';

-- 续件运费（默认0元)
INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
VALUES ('litemall_express_freight_additional', '0', NOW(), now(), 0)
ON DUPLICATE KEY UPDATE `litemall_system` SET `key_value` = '0', `update_time` = now() WHERE `key_name` = 'litemall_express_freight_additional';

SELECT 'M2: 已添加运费计费类型和按件数计费配置项' AS message;

-- 提交事务
COMMIT;

SELECT 'M2: 运费配置迁移完成' AS message;
