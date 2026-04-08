-- clothing_goods_sku.goods_id 改为必填
-- SKU 不再独立存在，必须关联商品

-- 1. 将无关联的 SKU 标记为停用（如果有）
UPDATE clothing_goods_sku
SET status = 'inactive', update_time = NOW()
WHERE (goods_id IS NULL OR goods_id = 0) AND status = 'active';

-- 2. 修改字段约束
ALTER TABLE clothing_goods_sku
  MODIFY COLUMN goods_id INT NOT NULL COMMENT '商品ID';
