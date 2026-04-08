-- V1.0.29: 图片 URL 架构变更 - 从完整 URL 改为只存 key
-- 背景：域名可能变更，DB 只存 key，前端负责拼接
-- 回滚方式：需从备份恢复此脚本影响的列

-- ============================================================
-- 1. litemall_storage: url 字段改为与 key 相同
-- ============================================================
UPDATE litemall_storage SET url = `key` WHERE url LIKE 'http%';

-- ============================================================
-- 2. 单 URL 字段：提取最后一段作为 key
--    只处理包含 /wx/storage/fetch/ 的存储 URL
-- ============================================================

-- 商品主图
UPDATE litemall_goods SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%/wx/storage/fetch/%';

-- 商品规格图
UPDATE litemall_goods_specification SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%/wx/storage/fetch/%';

-- 商品货品图
UPDATE litemall_goods_product SET url = SUBSTRING_INDEX(url, '/', -1) WHERE url LIKE '%/wx/storage/fetch/%';

-- 商品分享图
UPDATE litemall_goods SET share_url = SUBSTRING_INDEX(share_url, '/', -1) WHERE share_url LIKE '%/wx/storage/fetch/%';

-- 分类图标和图片
UPDATE litemall_category SET icon_url = SUBSTRING_INDEX(icon_url, '/', -1) WHERE icon_url LIKE '%/wx/storage/fetch/%';
UPDATE litemall_category SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%/wx/storage/fetch/%';

-- 品牌图
UPDATE litemall_brand SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%/wx/storage/fetch/%';

-- 穿搭封面
UPDATE litemall_outfit SET cover_pic = SUBSTRING_INDEX(cover_pic, '/', -1) WHERE cover_pic LIKE '%/wx/storage/fetch/%';

-- 场景图标和海报
UPDATE clothing_scene SET icon = SUBSTRING_INDEX(icon, '/', -1) WHERE icon LIKE '%/wx/storage/fetch/%';
UPDATE clothing_scene SET poster_url = SUBSTRING_INDEX(poster_url, '/', -1) WHERE poster_url LIKE '%/wx/storage/fetch/%';

-- 门店图片
UPDATE clothing_store SET image_url = SUBSTRING_INDEX(image_url, '/', -1) WHERE image_url LIKE '%/wx/storage/fetch/%';

-- 导购头像和二维码
UPDATE clothing_guide SET avatar = SUBSTRING_INDEX(avatar, '/', -1) WHERE avatar LIKE '%/wx/storage/fetch/%';
UPDATE clothing_guide SET qrcode_url = SUBSTRING_INDEX(qrcode_url, '/', -1) WHERE qrcode_url LIKE '%/wx/storage/fetch/%';

-- 专题图
UPDATE litemall_topic SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%/wx/storage/fetch/%';

-- 订单商品图
UPDATE litemall_order_goods SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%/wx/storage/fetch/%';

-- 购物车商品图
UPDATE litemall_cart SET pic_url = SUBSTRING_INDEX(pic_url, '/', -1) WHERE pic_url LIKE '%/wx/storage/fetch/%';

-- 用户头像
UPDATE litemall_user SET avatar = SUBSTRING_INDEX(avatar, '/', -1) WHERE avatar LIKE '%/wx/storage/fetch/%';

-- 管理员头像
UPDATE litemall_admin SET avatar = SUBSTRING_INDEX(avatar, '/', -1) WHERE avatar LIKE '%/wx/storage/fetch/%';

-- ============================================================
-- 3. JSON 数组字段：用 REPLACE 去除已知前缀
-- ============================================================

-- 商品相册 gallery
UPDATE litemall_goods SET gallery = REPLACE(gallery, 'https://www.transmute.cn/wx/storage/fetch/', '') WHERE gallery LIKE '%https://www.transmute.cn/wx/storage/fetch/%';
UPDATE litemall_goods SET gallery = REPLACE(gallery, 'http://47.107.151.70:8088/wx/storage/fetch/', '') WHERE gallery LIKE '%http://47.107.151.70:8088/wx/storage/fetch/%';
UPDATE litemall_goods SET gallery = REPLACE(gallery, 'http://localhost:8080/wx/storage/fetch/', '') WHERE gallery LIKE '%http://localhost:8080/wx/storage/fetch/%';
UPDATE litemall_goods SET gallery = REPLACE(gallery, 'http://localhost:8088/wx/storage/fetch/', '') WHERE gallery LIKE '%http://localhost:8088/wx/storage/fetch/%';

-- 售后图片 pictures
UPDATE litemall_aftersale SET pictures = REPLACE(pictures, 'https://www.transmute.cn/wx/storage/fetch/', '') WHERE pictures LIKE '%https://www.transmute.cn/wx/storage/fetch/%';
UPDATE litemall_aftersale SET pictures = REPLACE(pictures, 'http://47.107.151.70:8088/wx/storage/fetch/', '') WHERE pictures LIKE '%http://47.107.151.70:8088/wx/storage/fetch/%';
UPDATE litemall_aftersale SET pictures = REPLACE(pictures, 'http://localhost:8080/wx/storage/fetch/', '') WHERE pictures LIKE '%http://localhost:8080/wx/storage/fetch/%';
UPDATE litemall_aftersale SET pictures = REPLACE(pictures, 'http://localhost:8088/wx/storage/fetch/', '') WHERE pictures LIKE '%http://localhost:8088/wx/storage/fetch/%';

-- 反馈图片 pic_urls
UPDATE litemall_feedback SET pic_urls = REPLACE(pic_urls, 'https://www.transmute.cn/wx/storage/fetch/', '') WHERE pic_urls LIKE '%https://www.transmute.cn/wx/storage/fetch/%';
UPDATE litemall_feedback SET pic_urls = REPLACE(pic_urls, 'http://47.107.151.70:8088/wx/storage/fetch/', '') WHERE pic_urls LIKE '%http://47.107.151.70:8088/wx/storage/fetch/%';
UPDATE litemall_feedback SET pic_urls = REPLACE(pic_urls, 'http://localhost:8080/wx/storage/fetch/', '') WHERE pic_urls LIKE '%http://localhost:8080/wx/storage/fetch/%';
UPDATE litemall_feedback SET pic_urls = REPLACE(pic_urls, 'http://localhost:8088/wx/storage/fetch/', '') WHERE pic_urls LIKE '%http://localhost:8088/wx/storage/fetch/%';
