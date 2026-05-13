-- 分类启用开关：小程序分类页和管理后台分类管理依赖该字段。
-- 注意：CloudBase MySQL 当前不兼容 ALTER TABLE ADD COLUMN IF NOT EXISTS。
-- 已上线环境执行前需先查 information_schema.columns，确认缺列后再执行本脚本。
ALTER TABLE litemall_category ADD COLUMN enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用(0=否,1=是)';
UPDATE litemall_category SET enabled = 1 WHERE enabled IS NULL;
