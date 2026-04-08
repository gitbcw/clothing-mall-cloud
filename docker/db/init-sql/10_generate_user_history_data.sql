-- 生成历史用户数据（过去90天）
-- 用于增长视图和日活统计的数据展示

-- 清除已有的测试用户（以 'test_user_' 开头的用户）
DELETE FROM litemall_user WHERE username LIKE 'test_user_%';

-- 插入历史用户数据
-- 过去90天，每天生成 15-50 个新用户
-- 每个用户会有1-5次登录记录

INSERT INTO litemall_user (username, password, gender, nickname, mobile, avatar, user_level, status, add_time, last_login_time, last_login_ip, update_time, deleted)
SELECT
    CONCAT('test_user_', seq) as username,
    '$2a$10$9y9Qx5vZ8K6wJ3mX7nL2hO4eR5tY6uI8pA1sD2fG3hJ4kL5mN6oP7q' as password,
    FLOOR(RAND() * 3) as gender,
    CONCAT('用户', seq) as nickname,
    CONCAT('138', LPAD(FLOOR(RAND() * 100000000), 8, '0')) as mobile,
    '' as avatar,
    0 as user_level,
    0 as status,
    -- add_time: 过去90天内随机分布
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 90) DAY) as add_time,
    -- last_login_time: 注册后1-30天内随机登录
    CASE
        WHEN RAND() > 0.3 THEN
            DATE_ADD(
                DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 90) DAY),
                INTERVAL FLOOR(RAND() * 30) DAY
            )
        ELSE NULL
    END as last_login_time,
    CONCAT('192.168.', FLOOR(RAND() * 255), '.', FLOOR(RAND() * 255)) as last_login_ip,
    NOW() as update_time,
    0 as deleted
FROM (
    -- 生成约 2500 个用户
    SELECT (t1.n + t2.n * 10 + t3.n * 100 + 1) as seq
    FROM
        (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t1,
        (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t2,
        (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) t3
    WHERE (t1.n + t2.n * 10 + t3.n * 100 + 1) <= 2500
) numbers;

-- 验证数据
SELECT
    '用户总数' as metric,
    COUNT(*) as value
FROM litemall_user WHERE deleted = 0

UNION ALL

SELECT
    '有登录记录的用户数' as metric,
    COUNT(*) as value
FROM litemall_user WHERE deleted = 0 AND last_login_time IS NOT NULL

UNION ALL

SELECT
    '最早注册时间' as metric,
    MIN(add_time) as value
FROM litemall_user WHERE deleted = 0

UNION ALL

SELECT
    '最近注册时间' as metric,
    MAX(add_time) as value
FROM litemall_user WHERE deleted = 0;

-- 查看每日新增用户分布
SELECT
    DATE(add_time) as day,
    COUNT(*) as new_users
FROM litemall_user
WHERE deleted = 0
GROUP BY DATE(add_time)
ORDER BY day DESC
LIMIT 30;
