-- 穿搭悬浮商品栏位置配置
-- 默认靠左，与当前硬编码行为一致
ALTER TABLE litemall_outfit ADD COLUMN float_position VARCHAR(20) NOT NULL DEFAULT 'left'
  COMMENT '悬浮商品栏位置: left, right' AFTER brand_position;
