-- 给商品表添加状态字段
-- status: draft(草稿), pending(待上架), published(已上架)

ALTER TABLE litemall_goods
ADD COLUMN status VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft/pending/published' AFTER is_on_sale;

-- 初始化现有数据状态
UPDATE litemall_goods SET status = CASE
  WHEN is_on_sale = 1 THEN 'published'
  WHEN deleted = 1 THEN 'draft'
  ELSE 'pending'
END;
