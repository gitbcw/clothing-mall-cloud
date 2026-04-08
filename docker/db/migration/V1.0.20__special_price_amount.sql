ALTER TABLE litemall_goods
ADD COLUMN special_price DECIMAL(10,2) DEFAULT NULL COMMENT '特价金额'
AFTER is_special_price;
