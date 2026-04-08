-- 节日活动表
CREATE TABLE clothing_holiday (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL COMMENT '节日名称',
  start_date  DATE NOT NULL COMMENT '活动开始日期',
  end_date    DATE NOT NULL COMMENT '活动结束日期',
  sort_order  INT DEFAULT 0 COMMENT '排序',
  enabled     TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  add_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted     TINYINT(1) DEFAULT 0
) COMMENT '节日活动管理';

-- 节日商品关联表
CREATE TABLE clothing_holiday_goods (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  holiday_id  INT NOT NULL COMMENT '节日ID',
  goods_id    INT NOT NULL COMMENT '商品ID',
  sort_order  INT DEFAULT 0 COMMENT '排序',
  add_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_holiday_goods (holiday_id, goods_id)
) COMMENT '节日关联商品';
