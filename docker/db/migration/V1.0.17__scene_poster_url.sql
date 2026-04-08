-- 场景表新增海报图字段
ALTER TABLE clothing_scene ADD COLUMN poster_url VARCHAR(255) DEFAULT NULL COMMENT '场景海报图' AFTER icon;
