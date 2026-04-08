-- 为 litemall_user 表添加 role_ids 字段
-- 支持会员管理页面角色配置功能

ALTER TABLE litemall_user ADD COLUMN IF NOT EXISTS role_ids VARCHAR(255) DEFAULT NULL COMMENT '角色ID列表(JSON数组)' AFTER role;
