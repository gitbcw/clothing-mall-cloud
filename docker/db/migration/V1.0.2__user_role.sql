-- V1.0.2 用户角色字段
-- 为 litemall_user 表添加 role 字段，支持 user/owner/guide 三种角色

ALTER TABLE litemall_user
ADD COLUMN `role` VARCHAR(20) DEFAULT 'user' COMMENT '用户角色：user-普通用户，owner-店主，guide-导购' AFTER `store_id`;

-- 为已有用户设置默认角色
UPDATE litemall_user SET role = 'user' WHERE role IS NULL;
