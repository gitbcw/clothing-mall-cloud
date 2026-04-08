-- ========================================
-- 阶段四功能增强 - 推送组管理
-- 版本: V1.0.4
-- 日期: 2026-03-24
-- 说明: 创建推送组表、推送日志表，系统配置增加活跃/潜水判定天数
-- ========================================

-- 1. 创建推送组表
CREATE TABLE IF NOT EXISTS `litemall_push_group` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
    `name` varchar(64) NOT NULL COMMENT '组名',
    `type` varchar(32) NOT NULL COMMENT '组类型：test-测试组，active-活跃组，dormant-潜水组，salvage-打捞组',
    `description` varchar(255) DEFAULT NULL COMMENT '描述',
    `member_count` int(11) DEFAULT 0 COMMENT '成员数量',
    `user_ids` text DEFAULT NULL COMMENT '手动添加的用户ID列表（测试组用，逗号分隔）',
    `last_updated` datetime DEFAULT NULL COMMENT '最后更新时间',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` tinyint(1) DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    KEY `idx_type` (`type`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推送组';

-- 2. 创建推送日志表
CREATE TABLE IF NOT EXISTS `litemall_push_log` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
    `push_type` varchar(32) NOT NULL COMMENT '推送类型：activity-活动，goods-商品',
    `title` varchar(128) NOT NULL COMMENT '推送标题',
    `content` varchar(512) DEFAULT NULL COMMENT '推送内容',
    `target_type` varchar(32) DEFAULT 'all' COMMENT '目标类型：all-全部，group-分组，tag-标签',
    `target_group_id` int(11) DEFAULT NULL COMMENT '目标组ID（target_type=group时）',
    `target_tag_id` varchar(64) DEFAULT NULL COMMENT '目标标签ID（target_type=tag时）',
    `total_count` int(11) DEFAULT 0 COMMENT '推送总数',
    `success_count` int(11) DEFAULT 0 COMMENT '成功数',
    `fail_count` int(11) DEFAULT 0 COMMENT '失败数',
    `scheduled_at` datetime DEFAULT NULL COMMENT '定时发送时间',
    `sent_at` datetime DEFAULT NULL COMMENT '实际发送时间',
    `status` varchar(32) DEFAULT 'pending' COMMENT '状态：pending-待发送，sending-发送中，sent-已发送，failed-失败',
    `error_msg` varchar(512) DEFAULT NULL COMMENT '错误信息',
    `add_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` tinyint(1) DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    KEY `idx_scheduled_at` (`scheduled_at`),
    KEY `idx_target_group_id` (`target_group_id`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推送日志';

-- 3. 系统配置增加活跃/潜水判定天数
INSERT INTO `litemall_system` (`key_name`, `key_value`, `remark`)
VALUES
    ('litemall_push_active_days', '3', '活跃用户判定天数（N天内有浏览记录视为活跃）'),
    ('litemall_push_dormant_days', '30', '潜水用户判定天数（超过N天未活跃视为潜水）')
ON DUPLICATE KEY UPDATE `remark` = VALUES(`remark`);

-- 4. 初始化默认推送组
INSERT INTO `litemall_push_group` (`name`, `type`, `description`, `member_count`)
VALUES
    ('测试组', 'test', '用于测试推送的内部组', 0),
    ('活跃组', 'active', '近N天有浏览记录的用户（自动判定）', 0),
    ('潜水组', 'dormant', '超过N天未活跃的用户（自动判定）', 0),
    ('打捞组', 'salvage', '每次推送从潜水组随机抽取20人', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
