-- 穿搭推荐：品牌水印位置（top-left / top-right）
ALTER TABLE litemall_outfit ADD COLUMN brand_position VARCHAR(20) NOT NULL DEFAULT 'top-right' COMMENT '品牌水印位置: top-left, top-right' AFTER brand_color;
