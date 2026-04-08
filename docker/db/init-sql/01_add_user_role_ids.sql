-- =====================================================
-- 小程序用户权限视图功能 - 数据库变更
-- 执行时间: 2026-03-18
-- 说明: 为小程序用户添加角色权限支持
-- =====================================================

-- 1. litemall_user 表添加 role_ids 字段
ALTER TABLE `litemall_user`
ADD COLUMN `role_ids` varchar(127) DEFAULT '[]' COMMENT '角色ID列表(JSON数组)'
AFTER `status`;

-- 2. 创建小程序素材管理员角色
-- 注意: 需要根据实际数据库中的角色ID调整权限插入语句中的 role_id
INSERT INTO `litemall_role` (`name`, `desc`, `mobile`, `enabled`, `add_time`, `update_time`, `deleted`)
VALUES ('小程序素材管理员', '小程序端可上传素材', '', 1, NOW(), NOW(), 0);

-- 3. 获取新创建的角色ID并添加权限
-- 使用变量存储新角色ID
SET @new_role_id = LAST_INSERT_ID();

-- 4. 添加权限
INSERT INTO `litemall_permission` (`role_id`, `permission`, `add_time`, `update_time`, `deleted`)
VALUES (@new_role_id, 'wx:storage:upload', NOW(), NOW(), 0);

-- 5. 验证插入结果
SELECT r.id, r.name, p.permission
FROM litemall_role r
LEFT JOIN litemall_permission p ON r.id = p.role_id AND p.deleted = 0
WHERE r.name = '小程序素材管理员' AND r.deleted = 0;
