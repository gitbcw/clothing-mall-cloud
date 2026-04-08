-- M4 阶段数据库迁移脚本
-- 版本: v1.1
-- 日期: 2026-03-17
-- 说明: 企业微信小程序卡片推送功能

-- 1. 新增小程序 AppID 配置项
INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
VALUES ('litemall_wework_miniprogram_appid', '', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE `update_time` = NOW();

-- 2. 新增活动页面配置项
INSERT INTO `litemall_system` (`key_name`, `key_value`, `add_time`, `update_time`, `deleted`)
VALUES ('litemall_wework_activity_pages', '', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE `update_time` = NOW();

-- 说明:
-- litemall_wework_miniprogram_appid: 企业微信关联的小程序 AppID，用于发送小程序卡片消息
-- litemall_wework_activity_pages: 活动页面配置（JSON格式），用于推送时选择跳转页面
-- 配置路径: 管理后台 -> 配置管理 -> 促销配置 -> 企业微信推送
