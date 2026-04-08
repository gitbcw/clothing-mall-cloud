-- 角色表新增 type 字段，区分管理端角色和用户身份标签
ALTER TABLE litemall_role ADD COLUMN `type` VARCHAR(32) NOT NULL DEFAULT 'admin' COMMENT '角色类型：admin-管理端, user-用户身份标签';

-- 现有角色标记为管理端
UPDATE litemall_role SET `type` = 'admin' WHERE `type` = 'admin';

-- 插入用户身份标签角色
INSERT INTO litemall_role (`name`, `desc`, `type`, enabled, add_time, update_time, deleted)
VALUES
('普通用户', '默认用户身份', 'user', 1, NOW(), NOW(), 0),
('导购', '门店导购人员', 'user', 1, NOW(), NOW(), 0),
('店主', '门店店主', 'user', 1, NOW(), NOW(), 0),
('合伙人', '品牌合伙人', 'user', 1, NOW(), NOW(), 0);
