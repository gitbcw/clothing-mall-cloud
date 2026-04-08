-- ========================================
-- 阶段四功能增强 - 自动预售
-- 版本: V1.0.3
-- 日期: 2026-03-24
-- 说明: 商品表增加预售字段，系统配置增加预售发货天数
-- ========================================

-- 1. 商品表增加预售字段
ALTER TABLE `litemall_goods`
    ADD COLUMN IF NOT EXISTS `is_presale` tinyint(1) DEFAULT 0 COMMENT '是否预售：0-否，1-是' AFTER `is_hot`;

-- 2. 系统配置增加预售发货天数
INSERT INTO `litemall_system` (`key_name`, `key_value`, `remark`)
VALUES ('litemall_presale_ship_days', '2', '预售发货周期（天），库存为0时商品自动标记为预售，预计发货时间为当前日期+此配置天数')
ON DUPLICATE KEY UPDATE `remark` = VALUES(`remark`);

-- 3. 为已有商品初始化预售状态（库存为0的标记为预售）
-- 注意：这里只更新商品表，实际库存以 litemall_goods_product 为准
-- UPDATE `litemall_goods` SET `is_presale` = 1 WHERE `id` IN (
--     SELECT DISTINCT `goods_id` FROM `litemall_goods_product` WHERE `number` = 0 AND `deleted` = 0
-- ) AND `deleted` = 0;

