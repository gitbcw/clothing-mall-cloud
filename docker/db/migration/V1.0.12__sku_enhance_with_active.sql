-- =====================================================
-- SKU 管理增强（合并 V1.0.1 + V1.0.11）
-- 补充独立 SKU 库字段，status 默认值为 active
-- =====================================================

-- 1. 修改 goods_id 允许为空（支持独立 SKU）
ALTER TABLE `clothing_goods_sku`
    MODIFY COLUMN `goods_id` int(11) DEFAULT NULL COMMENT '商品ID（未上架时为空）';

-- 2. 添加增强字段（逐列添加，忽略 Duplicate column 错误）
SET @dbname = DATABASE();
SET @tablename = 'clothing_goods_sku';

-- status
SET @colname = 'status';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `status` varchar(20) DEFAULT ''active'' COMMENT ''状态：active(可用)/inactive(停用)'' AFTER `goods_id`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- category_id
SET @colname = 'category_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `category_id` int(11) DEFAULT NULL COMMENT ''分类ID'' AFTER `status`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- brand
SET @colname = 'brand';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `brand` varchar(50) DEFAULT NULL COMMENT ''品牌'' AFTER `category_id`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- name
SET @colname = 'name';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `name` varchar(127) DEFAULT NULL COMMENT ''SKU名称（AI识别结果）'' AFTER `brand`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- brief
SET @colname = 'brief';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `brief` varchar(255) DEFAULT NULL COMMENT ''简介'' AFTER `name`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- material
SET @colname = 'material';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `material` varchar(100) DEFAULT NULL COMMENT ''材质'' AFTER `brief`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- season
SET @colname = 'season';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `season` varchar(20) DEFAULT NULL COMMENT ''季节：spring/summer/autumn/winter/all_season'' AFTER `material`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- style
SET @colname = 'style';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `style` varchar(50) DEFAULT NULL COMMENT ''风格标签'' AFTER `season`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ai_recognized
SET @colname = 'ai_recognized';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `ai_recognized` tinyint(1) DEFAULT 0 COMMENT ''是否AI识别录入'' AFTER `style`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ai_confidence
SET @colname = 'ai_confidence';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `ai_confidence` decimal(3,2) DEFAULT NULL COMMENT ''AI识别置信度'' AFTER `ai_recognized`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- source_image
SET @colname = 'source_image';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) > 0,
  'SELECT 1',
  'ALTER TABLE clothing_goods_sku ADD COLUMN `source_image` varchar(255) DEFAULT NULL COMMENT ''源图片（拍照图片）'' AFTER `ai_confidence`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. 确保现有 SKU 状态为 active
UPDATE clothing_goods_sku SET status = 'active' WHERE status IS NULL OR status = '' OR status = 'draft';
