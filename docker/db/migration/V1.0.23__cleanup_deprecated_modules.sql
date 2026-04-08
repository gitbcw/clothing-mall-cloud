-- V1.0.23 清理废弃模块
-- 移除团购、评论、会员等级、用户身材、秒杀、满减相关的数据库表和字段

-- 1. 删除团购相关表
DROP TABLE IF EXISTS litemall_groupon_rules;
DROP TABLE IF EXISTS litemall_groupon;

-- 2. 删除会员等级表
DROP TABLE IF EXISTS clothing_member_level;

-- 3. 删除用户身材表
DROP TABLE IF EXISTS clothing_user_body;

-- 4. 删除评论表（可能已在 M1 中删除，保险起见再执行一次）
DROP TABLE IF EXISTS litemall_comment;

-- 5. 删除秒杀/限时特卖表
DROP TABLE IF EXISTS litemall_flash_sale;

-- 6. 删除满减活动表
DROP TABLE IF EXISTS litemall_full_reduction;

-- 7. 移除订单表中的废弃字段
ALTER TABLE litemall_order DROP COLUMN IF EXISTS groupon_price;
ALTER TABLE litemall_order DROP COLUMN IF EXISTS comments;
ALTER TABLE litemall_order_goods DROP COLUMN IF EXISTS comment;
