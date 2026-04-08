-- V1.0.30: 将 OSS 完整 URL 转为纯 key
-- 背景：统一存储到阿里云 OSS，DB 只存 key，前端拼接 OSS 地址
-- V1.0.29 已处理本地存储 URL，本脚本处理 OSS URL
-- 回滚方式：需从备份恢复此脚本影响的列

-- ============================================================
-- 1. litemall_storage: url 字段改为与 key 相同
-- ============================================================
UPDATE litemall_storage SET url = `key` WHERE url LIKE '%clothing-mall-2026.oss-cn-shenzhen%';

-- ============================================================
-- 2. 单 URL 字段：提取最后一段作为 key
-- ============================================================

-- 商品主图
UPDATE litemall_goods SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%clothing-mall-2026%';

-- 商品分享图
UPDATE litemall_goods SET share_url = SUBSTRING_INDEX(share_url, '/', -1) WHERE share_url LIKE '%clothing-mall-2026%';

-- 商品规格图
UPDATE litemall_goods_specification SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%clothing-mall-2026%';

-- 商品货品图
UPDATE litemall_goods_product SET url = SUBSTRING_INDEX(url, '/', -1) WHERE url LIKE '%clothing-mall-2026%';

-- 广告图
UPDATE litemall_ad SET url = SUBSTRING_INDEX(url, '/', -1) WHERE url LIKE '%clothing-mall-2026%';

-- 穿搭封面
UPDATE litemall_outfit SET cover_pic = SUBSTRING_INDEX(cover_pic, '/', -1) WHERE cover_pic LIKE '%clothing-mall-2026%';

-- 场景图标和海报
UPDATE clothing_scene SET icon = SUBSTRING_INDEX(icon, '/', -1) WHERE icon LIKE '%clothing-mall-2026%';
UPDATE clothing_scene SET poster_url = SUBSTRING_INDEX(poster_url, '/', -1) WHERE poster_url LIKE '%clothing-mall-2026%';

-- 订单商品图
UPDATE litemall_order_goods SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%clothing-mall-2026%';

-- 购物车商品图
UPDATE litemall_cart SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%clothing-mall-2026%';

-- ============================================================
-- 3. JSON 数组字段：用 REPLACE 去除 OSS 前缀
-- ============================================================

-- 商品相册 gallery（公网 + 内网两种 endpoint）
UPDATE litemall_goods SET gallery = REPLACE(gallery, 'https://clothing-mall-2026.oss-cn-shenzhen.aliyuncs.com/', '') WHERE gallery LIKE '%clothing-mall-2026.oss-cn-shenzhen.aliyuncs.com%';
UPDATE litemall_goods SET gallery = REPLACE(gallery, 'https://clothing-mall-2026.oss-cn-shenzhen-internal.aliyuncs.com/', '') WHERE gallery LIKE '%clothing-mall-2026.oss-cn-shenzhen-internal.aliyuncs.com%';

-- 售后图片 pictures
UPDATE litemall_aftersale SET pictures = REPLACE(pictures, 'https://clothing-mall-2026.oss-cn-shenzhen.aliyuncs.com/', '') WHERE pictures LIKE '%clothing-mall-2026.oss-cn-shenzhen.aliyuncs.com%';
UPDATE litemall_aftersale SET pictures = REPLACE(pictures, 'https://clothing-mall-2026.oss-cn-shenzhen-internal.aliyuncs.com/', '') WHERE pictures LIKE '%clothing-mall-2026.oss-cn-shenzhen-internal.aliyuncs.com%';

-- 反馈图片 pic_urls
UPDATE litemall_feedback SET pic_urls = REPLACE(pic_urls, 'https://clothing-mall-2026.oss-cn-shenzhen.aliyuncs.com/', '') WHERE pic_urls LIKE '%clothing-mall-2026.oss-cn-shenzhen.aliyuncs.com%';
UPDATE litemall_feedback SET pic_urls = REPLACE(pic_urls, 'https://clothing-mall-2026.oss-cn-shenzhen-internal.aliyuncs.com/', '') WHERE pic_urls LIKE '%clothing-mall-2026.oss-cn-shenzhen-internal.aliyuncs.com%';
