-- 推送组测试数据
-- 更新现有推送组的 member_count 和 user_ids

UPDATE litemall_push_group
SET member_count = 3, user_ids = '[1, 2, 3]', last_updated = NOW(), update_time = NOW()
WHERE type = 'test' AND deleted = 0;

UPDATE litemall_push_group
SET member_count = 128, user_ids = '[10, 11, 12, 13, 14, 15, 16, 17, 18, 19]', last_updated = NOW(), update_time = NOW()
WHERE type = 'active' AND deleted = 0;

UPDATE litemall_push_group
SET member_count = 56, user_ids = '[20, 21, 22, 23, 24, 25]', last_updated = NOW(), update_time = NOW()
WHERE type = 'dormant' AND deleted = 0;

UPDATE litemall_push_group
SET member_count = 15, user_ids = '[30, 31, 32, 33, 34]', last_updated = NOW(), update_time = NOW()
WHERE type = 'salvage' AND deleted = 0;

-- 插入推送日志测试数据
INSERT INTO litemall_push_log (push_type, title, content, target_type, target_group_id, target_tag_id, total_count, success_count, fail_count, status, add_time, update_time, deleted)
VALUES
('miniprogram_card', '春季新品上市', '点击查看最新春季穿搭', 'group', 1, NULL, 3, 3, 0, 'sent', NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 2 HOUR, 0),
('miniprogram_card', '限时特卖活动', '全场满300减50', 'group', 2, NULL, 128, 125, 3, 'sent', NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 1 HOUR, 0),
('text', '周末会员日提醒', '本周六会员日，全场8折起', 'group', 2, NULL, 128, 0, 0, 'pending', NOW(), NOW(), 0);
