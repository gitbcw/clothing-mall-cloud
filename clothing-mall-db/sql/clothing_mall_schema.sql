drop database if exists clothing_mall;
drop user if exists 'clothing_mall'@'%';
-- 支持emoji：需要mysql数据库参数： character_set_server=utf8mb4
create database clothing_mall default character set utf8mb4 collate utf8mb4_unicode_ci;
use clothing_mall;
create user 'clothing_mall'@'%' identified by 'clothing123456';
grant all privileges on clothing_mall.* to 'clothing_mall'@'%';
flush privileges;
