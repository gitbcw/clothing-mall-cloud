-- 创建测试账号（密码 123456 的 BCrypt 哈希）
INSERT INTO litemall_user (username, password, nickname, avatar, mobile, gender, user_level, status, last_login_time, add_time, update_time, deleted)
VALUES ('test', '$2a$12$9470VKhC7ufFq.ieFOtFBO0z/pmwSk7MSDmZqyhZ3LIVEcvgUHom6', '测试用户', 'https://yanxuan.nosdn.127.net/80841d741d7fa3073e0ae27bf487339f.jpg', '13800138000', 0, 0, 0, NOW(), NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE password = VALUES(password), mobile = VALUES(mobile);
