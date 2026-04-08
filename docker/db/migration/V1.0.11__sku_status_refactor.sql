-- SKU 状态重构
-- 原：draft/pending/published（上架状态）
-- 新：active/inactive（可用状态）
--
-- 业务含义变更：
-- - 上架/下架是「商品」的行为，不是 SKU 的
-- - SKU 的 status 仅表示「该规格是否可售」

-- 迁移现有数据：所有现有 SKU 都设为 active
UPDATE clothing_goods_sku SET status = 'active';

-- 修改字段注释
ALTER TABLE clothing_goods_sku
MODIFY COLUMN status VARCHAR(20) DEFAULT 'active'
COMMENT '状态：active(可用)/inactive(停用)';
