-- 优惠券首页弹窗标记
-- 注意：CloudBase MySQL 当前不支持 ADD COLUMN IF NOT EXISTS。
-- 执行前如需重复应用，请先查询 information_schema.columns 确认 popup 不存在。

ALTER TABLE `litemall_coupon`
  ADD COLUMN `popup` tinyint(1) DEFAULT 0 COMMENT '是否首页弹窗推荐(0=否,1=是)';

UPDATE `litemall_coupon` SET `popup` = 0 WHERE `popup` IS NULL;
