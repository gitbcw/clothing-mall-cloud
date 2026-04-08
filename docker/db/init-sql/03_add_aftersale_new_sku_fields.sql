-- 换货新规格字段迁移
-- 日期: 2026-03-19
-- 兼容 MySQL 8.0.29 以下版本（使用存储过程检查列是否存在）

-- 先删除旧存储过程（如果存在）
DROP PROCEDURE IF EXISTS add_aftersale_columns;

-- 创建存储过程
DELIMITER //

CREATE PROCEDURE add_aftersale_columns()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'litemall_aftersale' AND COLUMN_NAME = 'new_sku_id') THEN
        ALTER TABLE litemall_aftersale ADD COLUMN new_sku_id INT DEFAULT NULL COMMENT '换货后SKU ID';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'litemall_aftersale' AND COLUMN_NAME = 'new_color') THEN
        ALTER TABLE litemall_aftersale ADD COLUMN new_color VARCHAR(64) DEFAULT NULL COMMENT '换货后颜色';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'litemall_aftersale' AND COLUMN_NAME = 'new_size') THEN
        ALTER TABLE litemall_aftersale ADD COLUMN new_size VARCHAR(64) DEFAULT NULL COMMENT '换货后尺码';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'litemall_aftersale' AND COLUMN_NAME = 'new_specifications') THEN
        ALTER TABLE litemall_aftersale ADD COLUMN new_specifications VARCHAR(512) DEFAULT NULL COMMENT '换货后规格(JSON)';
    END IF;
END //

DELIMITER ;

-- 执行存储过程
CALL add_aftersale_columns();

-- 删除存储过程
DROP PROCEDURE IF EXISTS add_aftersale_columns;
