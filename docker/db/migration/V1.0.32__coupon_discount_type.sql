-- 优惠券折扣类型扩展：支持百分比折扣和单品限制
-- 用于生日7折券等场景：折扣按百分比计算，且仅对最高价单品生效

ALTER TABLE `litemall_coupon`
  ADD COLUMN `discount_type` smallint(6) DEFAULT 0 COMMENT '折扣类型：0=固定金额，1=百分比折扣(如30表示打7折)',
  ADD COLUMN `item_limit` smallint(6) DEFAULT 0 COMMENT '商品件数限制：0=全部商品，1=仅最高价单品';
