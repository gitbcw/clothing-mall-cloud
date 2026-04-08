-- ============================================
-- 演示数据 Part 2 - clothing-mall
-- 跳过已存在的用户数据
-- ============================================

-- 2. 用户地址 (10个)
INSERT INTO litemall_address (name, user_id, province, city, county, address_detail, area_code, postal_code, tel, is_default, add_time, update_time, deleted) VALUES
('张三', 1, '北京市', '北京市', '朝阳区', '建国路88号SOHO现代城A座1001', '110105', '100022', '13800138001', 1, NOW(), NOW(), 0),
('李四', 2, '上海市', '上海市', '浦东新区', '陆家嘴环路1000号恒生银行大厦', '310115', '200120', '13800138002', 1, NOW(), NOW(), 0),
('王芳', 3, '广东省', '深圳市', '南山区', '科技园南区高新南一道008号', '440305', '518057', '13800138003', 1, NOW(), NOW(), 0),
('赵六', 4, '浙江省', '杭州市', '西湖区', '文三路398号东信大厦', '330106', '310013', '13800138004', 1, NOW(), NOW(), 0),
('孙丽', 5, '江苏省', '南京市', '鼓楼区', '中山北路88号', '320106', '210008', '13800138005', 1, NOW(), NOW(), 0),
('周杰', 6, '四川省', '成都市', '武侯区', '天府大道中段500号', '510107', '610041', '13800138006', 1, NOW(), NOW(), 0),
('吴敏', 7, '湖北省', '武汉市', '洪山区', '光谷大道77号', '420111', '430074', '13800138007', 1, NOW(), NOW(), 0),
('郑伟', 8, '山东省', '青岛市', '市南区', '香港中路100号', '370202', '266071', '13800138008', 1, NOW(), NOW(), 0),
('陈静', 9, '福建省', '厦门市', '思明区', '软件园二期望海路10号', '350203', '361008', '13800138009', 1, NOW(), NOW(), 0),
('刘洋', 10, '陕西省', '西安市', '雁塔区', '高新路52号', '610113', '710075', '13800138010', 1, NOW(), NOW(), 0);

-- 3. 商品货品/SKU (为每个商品添加规格)
INSERT INTO litemall_goods_product (goods_id, specifications, price, number, url, add_time, update_time, deleted) VALUES
-- T恤 (goods_id=1181004)
(1181004, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', 99.00, 50, '', NOW(), NOW(), 0),
(1181004, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"L"}]', 99.00, 30, '', NOW(), NOW(), 0),
(1181004, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"M"}]', 99.00, 45, '', NOW(), NOW(), 0),
(1181004, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"L"}]', 99.00, 35, '', NOW(), NOW(), 0),
-- 牛仔裤 (goods_id=1181005)
(1181005, '[{"specification":"颜色","value":"深蓝"},{"specification":"尺码","value":"28"}]', 199.00, 20, '', NOW(), NOW(), 0),
(1181005, '[{"specification":"颜色","value":"深蓝"},{"specification":"尺码","value":"30"}]', 199.00, 25, '', NOW(), NOW(), 0),
(1181005, '[{"specification":"颜色","value":"浅蓝"},{"specification":"尺码","value":"28"}]', 199.00, 18, '', NOW(), NOW(), 0),
(1181005, '[{"specification":"颜色","value":"浅蓝"},{"specification":"尺码","value":"30"}]', 199.00, 22, '', NOW(), NOW(), 0),
-- 羽绒服 (goods_id=1181006)
(1181006, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"M"}]', 499.00, 15, '', NOW(), NOW(), 0),
(1181006, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"L"}]', 499.00, 12, '', NOW(), NOW(), 0),
(1181006, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', 499.00, 10, '', NOW(), NOW(), 0),
-- 衬衫 (goods_id=1181007)
(1181007, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', 159.00, 40, '', NOW(), NOW(), 0),
(1181007, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"L"}]', 159.00, 35, '', NOW(), NOW(), 0),
(1181007, '[{"specification":"颜色","value":"蓝色"},{"specification":"尺码","value":"M"}]', 159.00, 30, '', NOW(), NOW(), 0),
-- 风衣 (goods_id=1181008)
(1181008, '[{"specification":"颜色","value":"卡其色"},{"specification":"尺码","value":"M"}]', 399.00, 20, '', NOW(), NOW(), 0),
(1181008, '[{"specification":"颜色","value":"卡其色"},{"specification":"尺码","value":"L"}]', 399.00, 18, '', NOW(), NOW(), 0),
(1181008, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"M"}]', 399.00, 15, '', NOW(), NOW(), 0);

-- 4. 订单数据 (15个不同状态)
-- 订单状态: 101=未付款, 102=用户取消, 103=系统取消, 201=已付款, 202=申请退款, 203=已退款, 301=已发货, 401=用户收货, 402=系统收货
INSERT INTO litemall_order (user_id, order_sn, order_status, aftersale_status, consignee, mobile, address, message, goods_price, freight_price, delivery_type, pickup_store_id, guide_id, coupon_price, integral_price, order_price, actual_price, pay_id, pay_time, ship_sn, ship_channel, ship_time, refund_amount, refund_type, refund_content, refund_time, confirm_time, comments, end_time, add_time, update_time, deleted) VALUES
-- 已完成订单
(1, '202602270001', 401, 0, '张三', '13800138001', '北京市朝阳区建国路88号SOHO现代城A座1001', '尽快发货', 298.00, 0.00, 'express', NULL, 1, 0.00, 0.00, 0.00, 298.00, 'PAY202602270001', DATE_SUB(NOW(), INTERVAL 10 DAY), 'SF1234567890', '顺丰速运', DATE_SUB(NOW(), INTERVAL 9 DAY), NULL, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 7 DAY), 0, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), 0),
(2, '202602270002', 401, 0, '李四', '13800138002', '上海市浦东新区陆家嘴环路1000号', '', 199.00, 0.00, 'express', NULL, 1, 0.00, 0.00, 0.00, 199.00, 'PAY202602270002', DATE_SUB(NOW(), INTERVAL 8 DAY), 'SF1234567891', '顺丰速运', DATE_SUB(NOW(), INTERVAL 7 DAY), NULL, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), 0, DATE_SUB(NOW(), INTERVAL 5 DAY), 0),
(3, '202602270003', 401, 0, '王芳', '13800138003', '广东省深圳市南山区科技园南区高新南一道008号', '周末配送', 498.00, 0.00, 'express', NULL, 2, 10.00, 0.00, 0.00, 488.00, 'PAY202602270003', DATE_SUB(NOW(), INTERVAL 6 DAY), 'YT9876543210', '圆通快递', DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), 0, DATE_SUB(NOW(), INTERVAL 3 DAY), 0),
-- 已发货订单
(4, '202602270004', 301, 0, '赵六', '13800138004', '浙江省杭州市西湖区文三路398号东信大厦', '', 159.00, 0.00, 'express', NULL, NULL, 0.00, 0.00, 0.00, 159.00, 'PAY202602270004', DATE_SUB(NOW(), INTERVAL 3 DAY), 'ZTO1122334455', '中通快递', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
(5, '202602270005', 301, 0, '孙丽', '13800138005', '江苏省南京市鼓楼区中山北路88号', '易碎物品轻拿轻放', 399.00, 10.00, 'express', NULL, 1, 20.00, 0.00, 0.00, 389.00, 'PAY202602270005', DATE_SUB(NOW(), INTERVAL 2 DAY), 'JD5566778899', '京东快递', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
-- 已付款待发货
(6, '202602270006', 201, 0, '周杰', '13800138006', '四川省成都市武侯区天府大道中段500号', '', 658.00, 0.00, 'express', NULL, 2, 0.00, 50.00, 0.00, 608.00, 'PAY202602270006', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
(7, '202602270007', 201, 0, '吴敏', '13800138007', '湖北省武汉市洪山区光谷大道77号', '', 99.00, 10.00, 'express', NULL, NULL, 0.00, 0.00, 0.00, 109.00, 'PAY202602270007', NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
-- 待付款
(8, '202602270008', 101, 0, '郑伟', '13800138008', '山东省青岛市市南区香港中路100号', '', 558.00, 0.00, 'express', NULL, 1, 0.00, 0.00, 0.00, 558.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
(9, '202602270009', 101, 0, '陈静', '13800138009', '福建省厦门市思明区软件园二期望海路10号', '送人用，包装精美点', 199.00, 0.00, 'express', NULL, 2, 0.00, 0.00, 0.00, 199.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
-- 用户取消
(10, '202602270010', 102, 0, '刘洋', '13800138010', '陕西省西安市雁塔区高新路52号', '', 499.00, 0.00, 'express', NULL, 1, 0.00, 0.00, 0.00, 499.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
-- 自提订单
(1, '202602270011', 401, 0, '张三', '13800138001', '北京市朝阳区建国路88号', '', 99.00, 0.00, 'pickup', 3, 1, 0.00, 0.00, 0.00, 99.00, 'PAY202602270011', DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL, NULL, NULL, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 4 DAY), 0, DATE_SUB(NOW(), INTERVAL 4 DAY), 0),
(3, '202602270012', 301, 0, '王芳', '13800138003', '广东省深圳市南山区', '', 199.00, 0.00, 'pickup', 3, 2, 0.00, 0.00, 0.00, 199.00, 'PAY202602270012', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 0),
-- 更多已完成订单
(5, '202602270013', 401, 0, '孙丽', '13800138005', '江苏省南京市鼓楼区中山北路88号', '', 258.00, 0.00, 'express', NULL, 1, 0.00, 0.00, 0.00, 258.00, 'PAY202602270013', DATE_SUB(NOW(), INTERVAL 15 DAY), 'SF9988776655', '顺丰速运', DATE_SUB(NOW(), INTERVAL 14 DAY), NULL, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 12 DAY), 0, DATE_SUB(NOW(), INTERVAL 12 DAY), 0),
(6, '202602270014', 401, 0, '周杰', '13800138006', '四川省成都市武侯区天府大道中段500号', '', 499.00, 0.00, 'express', NULL, 2, 0.00, 0.00, 0.00, 499.00, 'PAY202602270014', DATE_SUB(NOW(), INTERVAL 20 DAY), 'EMS112233445', 'EMS', DATE_SUB(NOW(), INTERVAL 18 DAY), NULL, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 15 DAY), 0, DATE_SUB(NOW(), INTERVAL 15 DAY), 0),
(8, '202602270015', 401, 0, '郑伟', '13800138008', '山东省青岛市市南区香港中路100号', '', 399.00, 0.00, 'express', NULL, 1, 0.00, 0.00, 0.00, 399.00, 'PAY202602270015', DATE_SUB(NOW(), INTERVAL 12 DAY), 'YD5544332211', '韵达快递', DATE_SUB(NOW(), INTERVAL 11 DAY), NULL, NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 8 DAY), 0, DATE_SUB(NOW(), INTERVAL 8 DAY), 0);

-- 5. 订单商品
INSERT INTO litemall_order_goods (order_id, goods_id, goods_name, goods_sn, product_id, number, price, specifications, pic_url, comment, add_time, update_time, deleted) VALUES
-- 订单1
(1, 1181004, '简约纯色T恤', 'TSHIRT001', 1, 1, 99.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', '', 1, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW(), 0),
(1, 1181005, '休闲牛仔裤', 'JEANS001', 5, 1, 199.00, '[{"specification":"颜色","value":"深蓝"},{"specification":"尺码","value":"28"}]', '', 0, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW(), 0),
-- 订单2
(2, 1181005, '休闲牛仔裤', 'JEANS001', 6, 1, 199.00, '[{"specification":"颜色","value":"深蓝"},{"specification":"尺码","value":"30"}]', '', 1, DATE_SUB(NOW(), INTERVAL 8 DAY), NOW(), 0),
-- 订单3
(3, 1181006, '轻薄羽绒服', 'JACKET001', 9, 1, 499.00, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"M"}]', '', 1, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW(), 0),
-- 订单4
(4, 1181007, '商务休闲衬衫', 'SHIRT001', 13, 1, 159.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', '', 0, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), 0),
-- 订单5
(5, 1181008, '经典风衣外套', 'COAT001', 16, 1, 399.00, '[{"specification":"颜色","value":"卡其色"},{"specification":"尺码","value":"M"}]', '', 0, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), 0),
-- 订单6
(6, 1181006, '轻薄羽绒服', 'JACKET001', 10, 1, 499.00, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"L"}]', '', 0, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
(6, 1181004, '简约纯色T恤', 'TSHIRT001', 2, 2, 99.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"L"}]', '', 0, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
-- 订单7
(7, 1181004, '简约纯色T恤', 'TSHIRT001', 3, 1, 99.00, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"M"}]', '', 0, NOW(), NOW(), 0),
-- 订单8
(8, 1181008, '经典风衣外套', 'COAT001', 16, 1, 399.00, '[{"specification":"颜色","value":"卡其色"},{"specification":"尺码","value":"M"}]', '', 0, NOW(), NOW(), 0),
(8, 1181007, '商务休闲衬衫', 'SHIRT001', 14, 1, 159.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"L"}]', '', 0, NOW(), NOW(), 0),
-- 订单9
(9, 1181005, '休闲牛仔裤', 'JEANS001', 7, 1, 199.00, '[{"specification":"颜色","value":"浅蓝"},{"specification":"尺码","value":"28"}]', '', 0, NOW(), NOW(), 0),
-- 订单10
(10, 1181006, '轻薄羽绒服', 'JACKET001', 11, 1, 499.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', '', 0, NOW(), NOW(), 0),
-- 订单11
(11, 1181004, '简约纯色T恤', 'TSHIRT001', 1, 1, 99.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', '', 1, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), 0),
-- 订单12
(12, 1181005, '休闲牛仔裤', 'JEANS001', 8, 1, 199.00, '[{"specification":"颜色","value":"浅蓝"},{"specification":"尺码","value":"30"}]', '', 0, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
-- 订单13
(13, 1181007, '商务休闲衬衫', 'SHIRT001', 13, 1, 159.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"M"}]', '', 1, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW(), 0),
(13, 1181004, '简约纯色T恤', 'TSHIRT001', 2, 1, 99.00, '[{"specification":"颜色","value":"白色"},{"specification":"尺码","value":"L"}]', '', 0, DATE_SUB(NOW(), INTERVAL 15 DAY), NOW(), 0),
-- 订单14
(14, 1181006, '轻薄羽绒服', 'JACKET001', 9, 1, 499.00, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"M"}]', '', 1, DATE_SUB(NOW(), INTERVAL 20 DAY), NOW(), 0),
-- 订单15
(15, 1181008, '经典风衣外套', 'COAT001', 17, 1, 399.00, '[{"specification":"颜色","value":"黑色"},{"specification":"尺码","value":"M"}]', '', 1, DATE_SUB(NOW(), INTERVAL 12 DAY), NOW(), 0);

-- 6. 商品评论
INSERT INTO litemall_comment (value_id, type, content, admin_content, user_id, has_picture, pic_urls, star, add_time, update_time, deleted) VALUES
(1181004, 0, '质量很好，面料舒适，穿着很舒服，推荐购买！', '感谢您的支持与认可，我们会继续努力！', 1, 0, NULL, 5, DATE_SUB(NOW(), INTERVAL 7 DAY), NOW(), 0),
(1181004, 0, '颜色和图片一样，没有色差，尺码标准。', '', 2, 0, NULL, 4, DATE_SUB(NOW(), INTERVAL 6 DAY), NOW(), 0),
(1181005, 0, '牛仔裤版型很好，显瘦，做工精细。', '感谢您的认可，欢迎再次光临！', 3, 0, NULL, 5, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), 0),
(1181005, 0, '面料有点硬，洗过之后好一些了。', '您好，牛仔面料新衣会稍硬，洗涤后会变软，感谢您的反馈！', 4, 0, NULL, 3, DATE_SUB(NOW(), INTERVAL 4 DAY), NOW(), 0),
(1181006, 0, '羽绒服很轻便，保暖效果不错，冬天穿正合适。', '感谢您的支持，祝您冬日温暖！', 5, 0, NULL, 5, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), 0),
(1181006, 0, '颜色比图片深一点，不过也很好看。', '', 6, 0, NULL, 4, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), 0),
(1181007, 0, '衬衫面料很舒服，透气性好，夏天穿很凉快。', '感谢您的评价，祝您穿着愉快！', 7, 0, NULL, 5, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), 0),
(1181007, 0, '尺码偏小，建议买大一号。', '感谢您的反馈，我们会优化尺码建议！', 8, 0, NULL, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
(1181008, 0, '风衣版型很好看，穿上很有气质，质量也很好。', '', 9, 0, NULL, 5, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
(1181008, 0, '卡其色很百搭，适合各种场合穿。', '感谢您的认可，祝您每天都有好心情！', 10, 0, NULL, 5, NOW(), NOW(), 0);

-- 8. 专题/文章
INSERT INTO litemall_topic (title, subtitle, content, price, read_count, pic_url, sort_order, goods, add_time, update_time, deleted) VALUES
('2026春季穿搭指南', '最新流行趋势，让你成为街头焦点', '<p>春天来了，是时候更新你的衣橱了！本季流行元素包括：柔和的色调、宽松的剪裁、舒适的面料...</p><p>推荐搭配：简约T恤+牛仔裤+轻薄外套</p>', 0.00, '2.3k', 'https://img.alicdn.com/imgextra/i2/2215304656488/O1CN01XYZ7891h6CmG5hI6j_!!2215304656488.jpg', 100, '[1181004,1181005,1181008]', NOW(), NOW(), 0),
('职场穿搭攻略', '穿出专业范儿，提升职场形象', '<p>职场穿搭讲究得体、专业、有品味。一件好的衬衫，一条合身的裤子，能让你在职场中更加自信...</p><p>本期推荐：商务衬衫、休闲风衣</p>', 0.00, '1.8k', 'https://img.alicdn.com/imgextra/i3/2215304656488/O1CN01DEF4561h6CmH6iJ7k_!!2215304656488.jpg', 90, '[1181007,1181008]', NOW(), NOW(), 0),
('冬季保暖必备', '轻薄羽绒服，温暖整个冬天', '<p>羽绒服是冬季必备单品，轻薄便携，保暖效果出众。我们的羽绒服采用优质鸭绒填充，含绒量高达90%...</p>', 0.00, '3.5k', 'https://img.alicdn.com/imgextra/i4/2215304656488/O1CN01GHI7891h6CmI7jK8l_!!2215304656488.jpg', 80, '[1181006]', NOW(), NOW(), 0);

-- 9. 常见问题
INSERT INTO litemall_issue (question, answer, add_time, update_time, deleted) VALUES
('如何选择合适的尺码？', '建议您参考商品详情页的尺码表，根据您的身高体重选择合适的尺码。如有疑问，可联系客服咨询。', NOW(), NOW(), 0),
('支持哪些支付方式？', '我们支持微信支付、支付宝、银联卡等多种支付方式，您可以选择最方便的方式进行支付。', NOW(), NOW(), 0),
('发货后多久能收到？', '一般订单发货后1-3个工作日可送达，偏远地区可能需要3-5个工作日。您可以在订单详情页查看物流信息。', NOW(), NOW(), 0),
('如何申请退换货？', '请登录账户，在"我的订单"中找到需要售后的订单，点击"申请售后"，按照提示操作即可。退换货周期为7天。', NOW(), NOW(), 0),
('会员有什么优惠？', '会员可享受专属折扣、积分抵现、优先发货等特权。不同等级会员享受不同优惠力度，详情请查看会员中心。', NOW(), NOW(), 0);

-- 10. 用户反馈
INSERT INTO litemall_feedback (user_id, username, mobile, feed_type, content, status, has_picture, pic_urls, add_time, update_time, deleted) VALUES
(1, '张三', '13800138001', '功能建议', '希望增加商品收藏夹分类功能，方便管理收藏的商品。', 0, 0, NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), 0),
(3, '王芳', '13800138003', '问题反馈', 'APP偶尔会闪退，特别是在浏览商品图片的时候。', 0, 0, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(), 0),
(5, '孙丽', '13800138005', '投诉', '订单发货太慢了，等了3天才发货，体验不好。', 1, 0, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), 0),
(7, '吴敏', '13800138007', '功能建议', '建议增加夜间模式，保护眼睛。', 0, 0, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
(9, '陈静', '13800138009', '表扬', '客服服务态度很好，问题处理得很及时，给个赞！', 1, 0, NULL, NOW(), NOW(), 0);

-- 11. 用户收藏
INSERT INTO litemall_collect (user_id, value_id, type, add_time, update_time, deleted) VALUES
(1, 1181006, 0, NOW(), NOW(), 0),
(1, 1181008, 0, NOW(), NOW(), 0),
(2, 1181005, 0, NOW(), NOW(), 0),
(3, 1181004, 0, NOW(), NOW(), 0),
(3, 1181007, 0, NOW(), NOW(), 0),
(4, 1181006, 0, NOW(), NOW(), 0),
(5, 1181008, 0, NOW(), NOW(), 0),
(6, 1181005, 0, NOW(), NOW(), 0),
(7, 1181004, 0, NOW(), NOW(), 0),
(8, 1181007, 0, NOW(), NOW(), 0);

-- 12. 用户足迹
INSERT INTO litemall_footprint (user_id, goods_id, add_time, update_time, deleted) VALUES
(1, 1181004, NOW(), NOW(), 0),
(1, 1181005, NOW(), NOW(), 0),
(1, 1181006, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
(2, 1181005, NOW(), NOW(), 0),
(2, 1181007, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
(3, 1181006, NOW(), NOW(), 0),
(3, 1181008, NOW(), NOW(), 0),
(4, 1181004, NOW(), NOW(), 0),
(5, 1181008, NOW(), NOW(), 0),
(6, 1181005, NOW(), NOW(), 0);
