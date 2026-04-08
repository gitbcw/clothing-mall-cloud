package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.StatMapper;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;

@Service
public class StatService {
    @Resource
    private StatMapper statMapper;


    public List<Map> statUser() {
        return statMapper.statUser();
    }

    public List<Map> statOrder() {
        return statMapper.statOrder();
    }

    public List<Map> statGoods() {
        return statMapper.statGoods();
    }

    // ==================== 增长统计 ====================

    /**
     * 新增用户统计（按日）
     */
    public List<Map> statNewUsers(String startDate, String endDate) {
        return statMapper.statNewUsers(startDate, endDate);
    }

    /**
     * 日活用户统计（按日）
     */
    public List<Map> statDailyActiveUsers(String startDate, String endDate) {
        return statMapper.statDailyActiveUsers(startDate, endDate);
    }

    /**
     * 留存用户统计
     */
    public List<Map> statRetentionUsers(String cohortDate, int dayOffset) {
        return statMapper.statRetentionUsers(cohortDate, dayOffset);
    }

    /**
     * 累计用户数
     */
    public Map statTotalUsers() {
        return statMapper.statTotalUsers();
    }

    // ==================== 埋点统计 ====================

    /**
     * 埋点统计：事件概览
     */
    public List<Map> statTrackerOverview(String startDate, String endDate) {
        return statMapper.statTrackerOverview(startDate, endDate);
    }

    /**
     * 埋点统计：事件趋势
     */
    public List<Map> statTrackerTrend(String startDate, String endDate) {
        return statMapper.statTrackerTrend(startDate, endDate);
    }

    /**
     * 埋点统计：页面排行
     */
    public List<Map> statTrackerPages(String startDate, String endDate, String eventType, Integer limit) {
        return statMapper.statTrackerPages(startDate, endDate, eventType, limit);
    }

    // ==================== 活跃用户统计 ====================

    /**
     * 周活跃用户 WAU
     */
    public Map statWAU() {
        return statMapper.statWAU();
    }

    /**
     * 月活跃用户 MAU
     */
    public Map statMAU() {
        return statMapper.statMAU();
    }

    /**
     * 推送转化统计
     */
    public Map statPushConversion(String startDate, String endDate) {
        return statMapper.statPushConversion(startDate, endDate);
    }

    // ==================== 营收分析统计 ====================

    /**
     * 营收总览：核心指标
     */
    public Map statRevenueOverview(String startMonth, String endMonth) {
        return statMapper.statRevenueOverview(startMonth, endMonth);
    }

    /**
     * 营收总览：月度趋势
     */
    public List<Map> statRevenueTrend(String startMonth, String endMonth) {
        return statMapper.statRevenueTrend(startMonth, endMonth);
    }

    /**
     * 营收总览：月度明细
     */
    public List<Map> statRevenueDetail(String startMonth, String endMonth) {
        return statMapper.statRevenueDetail(startMonth, endMonth);
    }

    /**
     * 分类报表：场景销售
     */
    public List<Map> statSceneSales(String startDate, String endDate) {
        return statMapper.statSceneSales(startDate, endDate);
    }

    /**
     * 分类报表：分类销售
     */
    public List<Map> statCategorySales(String startDate, String endDate) {
        return statMapper.statCategorySales(startDate, endDate);
    }

    /**
     * 季节分析：季节概览
     */
    public List<Map> statSeasonOverview(int year) {
        return statMapper.statSeasonOverview(year);
    }

    /**
     * 季节分析：季节热销商品
     */
    public List<Map> statSeasonHotGoods(int year, String season, int limit) {
        return statMapper.statSeasonHotGoods(year, season, limit);
    }
}
