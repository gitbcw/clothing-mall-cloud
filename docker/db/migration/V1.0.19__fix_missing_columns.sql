-- 修复缺失的数据库列
-- 1. litemall_ad 表缺少 priority 和 ad_type 列
ALTER TABLE litemall_ad ADD COLUMN IF NOT EXISTS priority int(11) DEFAULT 0 COMMENT '优先级' AFTER enabled;
ALTER TABLE litemall_ad ADD COLUMN IF NOT EXISTS ad_type varchar(63) DEFAULT NULL COMMENT '广告类型' AFTER priority;

-- 2. litemall_goods 表缺少 is_presale 列
ALTER TABLE litemall_goods ADD COLUMN IF NOT EXISTS is_presale bit(1) DEFAULT 0 COMMENT '是否预售' AFTER is_special_price;

-- 3. litemall_outfit 表（如不存在则创建）
CREATE TABLE IF NOT EXISTS litemall_outfit (
  id int(11) NOT NULL AUTO_INCREMENT,
  title varchar(127) NOT NULL COMMENT '穿搭标题',
  description varchar(511) DEFAULT NULL COMMENT '穿搭描述',
  cover_pic varchar(255) NOT NULL COMMENT '封面图片URL',
  goods_ids json DEFAULT NULL COMMENT '关联商品ID列表',
  tags varchar(255) DEFAULT NULL COMMENT '标签',
  sort_order int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  status smallint(6) NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  add_time datetime NOT NULL COMMENT '创建时间',
  update_time datetime DEFAULT NULL COMMENT '更新时间',
  deleted tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_status (status),
  KEY idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='穿搭推荐表';
