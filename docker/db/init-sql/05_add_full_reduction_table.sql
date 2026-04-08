-- 满减活动表
-- 创建时间: 2026-03-19

DROP TABLE IF EXISTS `litemall_full_reduction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `litemall_full_reduction` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(127) NOT NULL COMMENT '活动名称',
  `description` varchar(511) DEFAULT NULL COMMENT '活动描述',
  `threshold` decimal(10,2) NOT NULL COMMENT '满减门槛：满X元',
  `discount` decimal(10,2) NOT NULL COMMENT '优惠金额：减Y元',
  `start_time` datetime NOT NULL COMMENT '活动开始时间',
  `end_time` datetime NOT NULL COMMENT '活动结束时间',
  `status` smallint(6) NOT NULL DEFAULT '0' COMMENT '状态：0-未启用，1-启用中，2-已失效',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序，升序排列',
  `add_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除：0-未删除，1-已删除',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `status` (`status`),
  KEY `start_time` (`start_time`),
  KEY `end_time` (`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='满减活动表';
/*!40101 SET character_set_client = @saved_cs_client */;
