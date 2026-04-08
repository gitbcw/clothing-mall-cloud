-- 广告位优先级迁移
-- 为广告表添加优先级字段，实现节假日 > 特价 > 新品的展示优先级

-- 添加优先级字段（数字越大优先级越高：1=普通, 2=新品, 3=特价, 4=节假日）
ALTER TABLE litemall_ad ADD COLUMN IF NOT EXISTS priority TINYINT DEFAULT 1 COMMENT '优先级：1=普通, 2=新品, 3=特价, 4=节假日';

-- 添加广告类型字段
ALTER TABLE litemall_ad ADD COLUMN IF NOT EXISTS ad_type VARCHAR(32) DEFAULT 'normal' COMMENT '广告类型：normal/seasonal/hot/new';

-- 为现有广告设置默认优先级
UPDATE litemall_ad SET priority = 1 WHERE priority IS NULL;
UPDATE litemall_ad SET ad_type = 'normal' WHERE ad_type IS NULL;
