-- 分类尺码开关：控制该分类下的商品是否显示尺码选择器
ALTER TABLE litemall_category ADD COLUMN enable_size TINYINT(1) DEFAULT 1 COMMENT '是否启用尺码选择(0=否,1=是)';
