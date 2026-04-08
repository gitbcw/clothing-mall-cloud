-- 活动位表
-- 创建时间: 2026-03-19
-- 用途: 管理首页/商品详情页等活动位的图片配置

DROP TABLE IF EXISTS `litemall_activity_banner`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `litemall_activity_banner` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(127) NOT NULL COMMENT '活动位名称',
  `type` varchar(31) NOT NULL COMMENT '活动位类型：home_banner-首页横幅，goods_banner-商品横幅，category_banner-分类横幅',
  `pic_url` varchar(255) NOT NULL COMMENT '图片URL',
  `link_type` varchar(31) NOT NULL COMMENT '跳转类型：none-不跳转，goods-商品详情，category-商品分类，custom-自定义链接',
  `link_value` varchar(255) DEFAULT NULL COMMENT '跳转值：根据link_type不同而不同（商品ID/分类ID/URL）',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序，升序排列',
  `status` smallint(6) NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `add_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除：0-未删除，1-已删除',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `type` (`type`),
  KEY `status` (`status`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='活动位表';
/*!40101 SET character_set_client = @saved_cs_client */;
