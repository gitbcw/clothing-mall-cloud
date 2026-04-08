-- 为 litemall_user 表添加 role 字段
-- 修复会员管理页面 "系统内部错误" 问题

ALTER TABLE litemall_user ADD COLUMN IF NOT EXISTS role VARCHAR(63) DEFAULT NULL COMMENT '用户角色' AFTER store_id;
