-- 限时特卖表
-- 创建时间: 2026-03-19

DROP TABLE IF EXISTS `litemall_flash_sale`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `litemall_flash_sale` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `goods_id` int(11) NOT NULL COMMENT '商品ID，关联litemall_goods表',
  `goods_name` varchar(127) NOT NULL COMMENT '商品名称',
  `pic_url` varchar(255) DEFAULT NULL COMMENT '商品图片URL',
  `original_price` decimal(10,2) NOT NULL COMMENT '商品原价',
  `flash_price` decimal(10,2) NOT NULL COMMENT '秒杀价格',
  `flash_stock` int(11) NOT NULL DEFAULT '0' COMMENT '秒杀库存数量',
  `flash_sales` int(11) NOT NULL DEFAULT '0' COMMENT '已秒杀数量',
  `start_time` datetime NOT NULL COMMENT '秒杀开始时间',
  `end_time` datetime NOT NULL COMMENT '秒杀结束时间',
  `status` smallint(6) NOT NULL DEFAULT '0' COMMENT '状态：0-未开始，1-进行中，2-已结束',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序，升序排列',
  `add_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除：0-未删除，1-已删除',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `goods_id` (`goods_id`),
  KEY `status` (`status`),
  KEY `start_time` (`start_time`),
  KEY `end_time` (`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='限时特卖表';
/*!40101 SET character_set_client = @saved_cs_client */;
