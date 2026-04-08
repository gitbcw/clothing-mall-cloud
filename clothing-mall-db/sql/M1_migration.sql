-- ============================================================
-- M1 里程碑数据库迁移脚本
-- 服装店线上渠道扩展系统
--
-- 变更内容：
-- 1. 清理已删除模块的数据表（Comment、Groupon）
-- 2. 清理售后测试数据（售后改为只换不退）
-- 3. 更新售后状态枚举注释
--
-- 执行前请备份数据库！
-- 执行命令：mysql -u root -p clothing_mall < M1_migration.sql
-- ============================================================

-- 开始事务
START TRANSACTION;

-- ============================================================
-- 1. 删除 Comment 评价模块相关表
-- ============================================================
DROP TABLE IF EXISTS `litemall_comment`;
SELECT '已删除 litemall_comment 表' AS message;

-- ============================================================
-- 2. 删除 Groupon 团购模块相关表
-- ============================================================
DROP TABLE IF EXISTS `litemall_groupon_rules`;
DROP TABLE IF EXISTS `litemall_groupon`;
SELECT '已删除 litemall_groupon 和 litemall_groupon_rules 表' AS message;

-- ============================================================
-- 3. 清理售后测试数据
-- 售后改为只换不退，清空现有测试数据
-- ============================================================
TRUNCATE TABLE `litemall_aftersale`;
SELECT '已清空 litemall_aftersale 表（售后测试数据）' AS message;

-- 重置订单的售后状态为初始状态
UPDATE `litemall_order` SET `aftersale_status` = 0 WHERE `aftersale_status` != 0;
SELECT '已重置订单售后状态' AS message;

-- ============================================================
-- 4. 更新售后相关字段注释（状态含义变更）
-- 注意：实际数据值不变，只是语义变更
-- 原 STATUS_REFUND(3) -> 现表示"换货已发货"
-- 新增 STATUS_COMPLETED(6) -> 表示"换货完成"
-- ============================================================

-- 添加售后状态 6（换货完成）的说明
-- 注意：MySQL 枚举值是业务逻辑控制的，这里只是记录
SELECT '售后状态变更说明：
  0 = 可申请（不变）
  1 = 用户已申请（不变）
  2 = 管理员审核通过（不变）
  3 = 换货已发货（原：退款成功）
  4 = 管理员审核拒绝（不变）
  5 = 用户已取消（不变）
  6 = 换货完成（新增）
' AS message;

-- ============================================================
-- 5. 清理孤立数据（可选）
-- ============================================================

-- 清理无关联的团购相关数据（如果存在）
-- 注意：团购规则已删除，订单中的 groupon_price 字段保留但不使用

SELECT 'M1 数据库迁移完成！' AS message;

-- 提交事务
COMMIT;

-- ============================================================
-- 回滚脚本（如需回滚，请执行以下语句）
-- 注意：只能回滚表结构，数据无法恢复
-- ============================================================
/*
-- 恢复 comment 表（需要从备份恢复数据）
CREATE TABLE `litemall_comment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `value_id` int(11) NOT NULL DEFAULT '0' COMMENT '商品或专题ID',
  `type` tinyint(3) NOT NULL DEFAULT '0' COMMENT '类型：0商品，1专题',
  `content` varchar(1000) NOT NULL COMMENT '评论内容',
  `user_id` int(11) NOT NULL DEFAULT '0' COMMENT '用户ID',
  `has_picture` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否含有图片',
  `pic_urls` varchar(1000) DEFAULT NULL COMMENT '图片地址列表，JSON格式',
  `star` smallint(6) NOT NULL DEFAULT '1' COMMENT '评分 1-5',
  `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  `add_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `id_value` (`value_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- 恢复 groupon 相关表（需要从备份恢复数据）
CREATE TABLE `litemall_groupon_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `goods_id` int(11) NOT NULL COMMENT '商品ID',
  `goods_name` varchar(127) NOT NULL COMMENT '商品名称',
  `pic_url` varchar(255) DEFAULT NULL COMMENT '商品图片',
  `discount` decimal(10,2) NOT NULL COMMENT '团购优惠',
  `discount_member` int(11) NOT NULL COMMENT '团购人数要求',
  `expire_time` datetime NOT NULL COMMENT '团购过期时间',
  `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  `add_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团购规则表';

CREATE TABLE `litemall_groupon` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL COMMENT '关联订单ID',
  `groupon_rules_id` int(11) NOT NULL COMMENT '团购规则ID',
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `share_url` varchar(255) DEFAULT NULL COMMENT '团购分享图片地址',
  `creator_user_id` int(11) NOT NULL COMMENT '团购发起者ID',
  `creator` tinyint(1) NOT NULL COMMENT '是否是团购发起者',
  `subgroupon_user_id` int(11) DEFAULT NULL COMMENT '参与团购的团购记录ID',
  `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  `add_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团购记录表';
*/
