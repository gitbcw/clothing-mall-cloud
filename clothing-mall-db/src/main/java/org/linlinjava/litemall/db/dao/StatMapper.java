package org.linlinjava.litemall.db.dao;

import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

public interface StatMapper {
    List<Map> statUser();

    List<Map> statOrder();

    List<Map> statGoods();

    /**
     * 增长统计：新增用户
     */
    List<Map> statNewUsers(@Param("startDate") String startDate, @Param("endDate") String endDate);

    /**
     * 增长统计：日活用户
     */
    List<Map> statDailyActiveUsers(@Param("startDate") String startDate, @Param("endDate") String endDate);

    /**
     * 增长统计：留存用户（某日新增用户在后续日期的留存情况）
     */
    List<Map> statRetentionUsers(@Param("cohortDate") String cohortDate, @Param("dayOffset") int dayOffset);

    /**
     * 增长统计：累计用户数
     */
    Map statTotalUsers();

    // ==================== 埋点统计 ====================

    /**
     * 埋点统计：事件概览（按类型统计）
     */
    List<Map> statTrackerOverview(@Param("startDate") String startDate, @Param("endDate") String endDate);

    /**
     * 埋点统计：事件趋势（按日统计）
     */
    List<Map> statTrackerTrend(@Param("startDate") String startDate, @Param("endDate") String endDate);

    /**
     * 埋点统计：页面排行
     */
    List<Map> statTrackerPages(@Param("startDate") String startDate,
                               @Param("endDate") String endDate,
                               @Param("eventType") String eventType,
                               @Param("limit") Integer limit);

    // ==================== 活跃用户统计 ====================

    /**
     * 周活跃用户 WAU（最近7天有登录的不重复用户）
     */
    Map statWAU();

    /**
     * 月活跃用户 MAU（最近30天有登录的不重复用户）
     */
    Map statMAU();

    /**
     * 推送转化统计
     */
    Map statPushConversion(@Param("startDate") String startDate, @Param("endDate") String endDate);

    // ==================== 营收分析统计 ====================

    /**
     * 营收总览：核心指标
     */
    Map statRevenueOverview(@Param("startMonth") String startMonth, @Param("endMonth") String endMonth);

    /**
     * 营收总览：月度趋势
     */
    List<Map> statRevenueTrend(@Param("startMonth") String startMonth, @Param("endMonth") String endMonth);

    /**
     * 营收总览：月度明细
     */
    List<Map> statRevenueDetail(@Param("startMonth") String startMonth, @Param("endMonth") String endMonth);

    /**
     * 分类报表：场景销售
     */
    List<Map> statSceneSales(@Param("startDate") String startDate, @Param("endDate") String endDate);

    /**
     * 分类报表：分类销售
     */
    List<Map> statCategorySales(@Param("startDate") String startDate, @Param("endDate") String endDate);

    /**
     * 季节分析：季节概览
     */
    List<Map> statSeasonOverview(@Param("year") int year);

    /**
     * 季节分析：季节热销商品
     */
    List<Map> statSeasonHotGoods(@Param("year") int year, @Param("season") String season, @Param("limit") int limit);
}