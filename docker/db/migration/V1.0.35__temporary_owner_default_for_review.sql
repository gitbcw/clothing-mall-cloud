-- 审核临时配置：新注册/新静默登录用户默认授予小程序管理端 owner 权限。
-- 注意：该迁移只修改字段默认值，不批量更新已有用户。
-- 审核通过后应新增反向迁移，将默认值改回 'user'。

ALTER TABLE litemall_user
  MODIFY COLUMN role VARCHAR(63) DEFAULT 'owner' COMMENT '用户角色：user-普通用户，owner-店主，guide-导购';
