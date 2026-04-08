-- 推送日志表增强：新增内容类型、封面图 media_id、小程序页面路径
ALTER TABLE litemall_push_log ADD COLUMN content_type VARCHAR(32) NOT NULL DEFAULT 'card' COMMENT '内容类型：card-小程序卡片, text-纯文本' AFTER content;
ALTER TABLE litemall_push_log ADD COLUMN media_id VARCHAR(128) DEFAULT NULL COMMENT '封面图 media_id' AFTER content_type;
ALTER TABLE litemall_push_log ADD COLUMN page VARCHAR(255) DEFAULT NULL COMMENT '小程序页面路径' AFTER media_id;
