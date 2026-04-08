-- 为商品表添加场景标签和商品参数字段
ALTER TABLE litemall_goods ADD COLUMN scene_tags TEXT COMMENT '场景标签JSON数组，如["日常通勤","约会聚餐"]';
ALTER TABLE litemall_goods ADD COLUMN goods_params TEXT COMMENT '商品参数JSON数组，如[{"key":"面料","value":"棉麻"}]';
