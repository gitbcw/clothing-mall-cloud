-- 穿搭推荐表
-- 创建时间: 2026-03-19
-- 用途: 管理穿搭推荐套装，支持关联多个商品

DROP TABLE IF EXISTS `litemall_outfit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `litemall_outfit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(127) NOT NULL COMMENT '穿搭标题',
  `description` varchar(511) DEFAULT NULL COMMENT '穿搭描述',
  `cover_pic` varchar(255) NOT NULL COMMENT '封面图片URL',
  `goods_ids` json DEFAULT NULL COMMENT '关联商品ID列表，JSON格式：[1,2,3]',
  `tags` varchar(255) DEFAULT NULL COMMENT '标签，逗号分隔：春季,休闲,百搭',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序，升序排列',
  `status` smallint(6) NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `add_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除：0-未删除，1-已删除',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `status` (`status`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='穿搭推荐表';
/*!40101 SET character_set_client = @saved_cs_client */;
