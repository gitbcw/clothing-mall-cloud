-- 商品表新增特价标记
ALTER TABLE litemall_goods ADD COLUMN is_special_price BIT(1) DEFAULT 0 COMMENT '是否特价' AFTER is_hot;

-- 活动位置顶商品表
CREATE TABLE IF NOT EXISTS clothing_activity_top (
    id INT(11) NOT NULL AUTO_INCREMENT,
    goods_id INT(11) NOT NULL COMMENT '商品ID',
    sort_order INT(11) DEFAULT 0 COMMENT '排序（越小越靠前）',
    add_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_goods_id (goods_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动位置顶商品';
