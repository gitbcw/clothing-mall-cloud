-- ============================================
-- 补充演示数据 - 售后
-- ============================================

-- 售后数据 (5条)
-- type: 0=未收货退款, 1=已收货退款, 2=售后退货
-- status: 0=待处理, 1=已同意, 2=已拒绝, 3=已取消
INSERT INTO litemall_aftersale (aftersale_sn, order_id, user_id, type, reason, amount, pictures, comment, status, handle_time, add_time, update_time, deleted) VALUES
('AS202602270001', 1, 1, 1, '商品质量问题', 99.00, '[]', 'T恤有破洞', 1, DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), NOW(), 0),
('AS202602270002', 3, 3, 2, '尺码不合适', 499.00, '[]', '羽绒服太小了，想换大一号', 0, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), 0),
('AS202602270003', 5, 5, 1, '不喜欢/不想要', 399.00, '[]', '颜色和图片不一样', 2, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0),
('AS202602270004', 13, 5, 0, '拍错/多拍/不想要', 159.00, '[]', '不小心拍错了', 1, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY), NOW(), 0),
('AS202602270005', 15, 8, 2, '商品与描述不符', 399.00, '[]', '风衣颜色偏深', 0, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), 0);
