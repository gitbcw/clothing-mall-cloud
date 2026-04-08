-- 用户表增加企业微信外部联系人ID字段，售后表增加退货物流字段
-- 创建时间: 2026-03-19

DROP PROCEDURE IF EXISTS add_wework_and_ship_fields;

DELIMITER //

CREATE PROCEDURE add_wework_and_ship_fields()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'litemall_user' AND COLUMN_NAME = 'we_work_external_user_id') THEN
        ALTER TABLE litemall_user ADD COLUMN we_work_external_user_id VARCHAR(127) DEFAULT NULL COMMENT '企业微信外部联系人ID' AFTER store_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'litemall_aftersale' AND COLUMN_NAME = 'ship_channel') THEN
        ALTER TABLE litemall_aftersale ADD COLUMN ship_channel VARCHAR(63) DEFAULT NULL COMMENT '退货物流公司' AFTER update_time;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'litemall_aftersale' AND COLUMN_NAME = 'ship_sn') THEN
        ALTER TABLE litemall_aftersale ADD COLUMN ship_sn VARCHAR(127) DEFAULT NULL COMMENT '退货物流单号' AFTER ship_channel;
    END IF;
END //

DELIMITER ;

CALL add_wework_and_ship_fields();
DROP PROCEDURE IF EXISTS add_wework_and_ship_fields;
