-- 穿搭推荐：品牌水印颜色（white / coffee）
ALTER TABLE litemall_outfit ADD COLUMN brand_color VARCHAR(20) NOT NULL DEFAULT 'white' COMMENT '品牌水印颜色: white, coffee' AFTER tags;
