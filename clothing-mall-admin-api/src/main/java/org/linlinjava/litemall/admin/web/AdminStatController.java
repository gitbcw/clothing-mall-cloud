package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.admin.vo.StatVo;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.service.StatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/stat")
@Validated
public class AdminStatController {
    private final Log logger = LogFactory.getLog(AdminStatController.class);

    @Autowired
    private StatService statService;

    @RequiresPermissions("admin:stat:user")
    @RequiresPermissionsDesc(menu = {"统计管理", "用户统计"}, button = "查询")
    @GetMapping("/user")
    public Object statUser() {
        List<Map> rows = statService.statUser();
        String[] columns = new String[]{"day", "users"};
        StatVo statVo = new StatVo();
        statVo.setColumns(columns);
        statVo.setRows(rows);
        return ResponseUtil.ok(statVo);
    }

    @RequiresPermissions("admin:stat:order")
    @RequiresPermissionsDesc(menu = {"统计管理", "订单统计"}, button = "查询")
    @GetMapping("/order")
    public Object statOrder() {
        List<Map> rows = statService.statOrder();
        String[] columns = new String[]{"day", "orders", "customers", "amount", "pcr"};
        StatVo statVo = new StatVo();
        statVo.setColumns(columns);
        statVo.setRows(rows);

        return ResponseUtil.ok(statVo);
    }

    @RequiresPermissions("admin:stat:goods")
    @RequiresPermissionsDesc(menu = {"统计管理", "商品统计"}, button = "查询")
    @GetMapping("/goods")
    public Object statGoods() {
        List<Map> rows = statService.statGoods();
        String[] columns = new String[]{"day", "orders", "products", "amount"};
        StatVo statVo = new StatVo();
        statVo.setColumns(columns);
        statVo.setRows(rows);
        return ResponseUtil.ok(statVo);
    }

    // ==================== 增长统计 API ====================

    @RequiresPermissions("admin:stat:growth")
    @RequiresPermissionsDesc(menu = {"统计管理", "增长统计"}, button = "查询")
    @GetMapping("/growth")
    public Object statGrowth(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        // 新增用户
        List<Map> newUsers = statService.statNewUsers(startDate, endDate);
        // 日活用户
        List<Map> dau = statService.statDailyActiveUsers(startDate, endDate);
        // 累计用户
        Map totalUsers = statService.statTotalUsers();

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("newUsers", newUsers);
        result.put("dau", dau);
        result.put("totalUsers", totalUsers != null ? totalUsers.get("totalUsers") : 0);
        return ResponseUtil.ok(result);
    }

    @RequiresPermissions("admin:stat:growth")
    @RequiresPermissionsDesc(menu = {"统计管理", "增长统计"}, button = "留存查询")
    @GetMapping("/retention")
    public Object statRetention(
            @RequestParam String cohortDate,
            @RequestParam(defaultValue = "1") int dayOffset) {
        List<Map> retention = statService.statRetentionUsers(cohortDate, dayOffset);
        return ResponseUtil.ok(retention);
    }

    // ==================== 埋点统计 API ====================

    @RequiresPermissions("admin:stat:tracker")
    @RequiresPermissionsDesc(menu = {"统计管理", "埋点统计"}, button = "查询")
    @GetMapping("/tracker/overview")
    public Object statTrackerOverview(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        List<Map> byType = statService.statTrackerOverview(startDate, endDate);

        // 计算总数
        long total = 0;
        long pageView = 0;
        long addCart = 0;
        long orderPay = 0;

        for (Map item : byType) {
            long count = ((Number) item.get("count")).longValue();
            total += count;
            String eventType = (String) item.get("eventType");
            if ("page_view".equals(eventType)) pageView = count;
            if ("add_cart".equals(eventType)) addCart = count;
            if ("order_pay".equals(eventType)) orderPay = count;
        }

        // 计算转化率
        double addCartRate = pageView > 0 ? (addCart * 100.0 / pageView) : 0;
        double payRate = addCart > 0 ? (orderPay * 100.0 / addCart) : 0;

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("byType", byType);
        result.put("total", total);
        result.put("pageView", pageView);
        result.put("addCart", addCart);
        result.put("orderPay", orderPay);
        result.put("addCartRate", Math.round(addCartRate * 10) / 10.0);
        result.put("payRate", Math.round(payRate * 10) / 10.0);

        return ResponseUtil.ok(result);
    }

    @RequiresPermissions("admin:stat:tracker")
    @RequiresPermissionsDesc(menu = {"统计管理", "埋点统计"}, button = "趋势查询")
    @GetMapping("/tracker/trend")
    public Object statTrackerTrend(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        List<Map> trend = statService.statTrackerTrend(startDate, endDate);
        return ResponseUtil.ok(trend);
    }

    @RequiresPermissions("admin:stat:tracker")
    @RequiresPermissionsDesc(menu = {"统计管理", "埋点统计"}, button = "页面排行")
    @GetMapping("/tracker/pages")
    public Object statTrackerPages(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "page_view") String eventType,
            @RequestParam(defaultValue = "10") Integer limit) {
        List<Map> pages = statService.statTrackerPages(startDate, endDate, eventType, limit);
        return ResponseUtil.ok(pages);
    }

    // ==================== 活跃用户统计 API ====================

    @RequiresPermissions("admin:stat:growth")
    @RequiresPermissionsDesc(menu = {"统计管理", "增长统计"}, button = "活跃用户")
    @GetMapping("/active-users")
    public Object statActiveUsers() {
        Map wau = statService.statWAU();
        Map mau = statService.statMAU();

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("wau", wau != null ? wau.get("wau") : 0);
        result.put("mau", mau != null ? mau.get("mau") : 0);
        return ResponseUtil.ok(result);
    }

    // ==================== 营收分析 API ====================

    @RequiresPermissions("admin:stat:order")
    @RequiresPermissionsDesc(menu = {"统计管理", "营收分析"}, button = "总览")
    @GetMapping("/revenue/overview")
    public Object statRevenueOverview(
            @RequestParam(required = false) String startMonth,
            @RequestParam(required = false) String endMonth) {
        // 核心指标
        Map overview = statService.statRevenueOverview(startMonth, endMonth);
        // 月度趋势
        List<Map> trend = statService.statRevenueTrend(startMonth, endMonth);
        // 月度明细
        List<Map> detail = statService.statRevenueDetail(startMonth, endMonth);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("overview", overview);
        result.put("trend", trend);
        result.put("detail", detail);
        return ResponseUtil.ok(result);
    }

    @RequiresPermissions("admin:stat:order")
    @RequiresPermissionsDesc(menu = {"统计管理", "营收分析"}, button = "场景销售")
    @GetMapping("/revenue/scene")
    public Object statRevenueScene(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        List<Map> sceneSales = statService.statSceneSales(startDate, endDate);

        // 计算总金额用于计算占比
        double totalAmount = 0;
        for (Map item : sceneSales) {
            Object amount = item.get("amount");
            if (amount != null) {
                totalAmount += ((Number) amount).doubleValue();
            }
        }

        // 为每个场景添加占比
        for (Map item : sceneSales) {
            Object amount = item.get("amount");
            double amt = amount != null ? ((Number) amount).doubleValue() : 0;
            double percent = totalAmount > 0 ? (amt / totalAmount) * 100 : 0;
            item.put("percent", Math.round(percent * 10) / 10.0);
        }

        return ResponseUtil.ok(sceneSales);
    }

    @RequiresPermissions("admin:stat:order")
    @RequiresPermissionsDesc(menu = {"统计管理", "营收分析"}, button = "分类销售")
    @GetMapping("/revenue/category")
    public Object statRevenueCategory(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        List<Map> categorySales = statService.statCategorySales(startDate, endDate);
        return ResponseUtil.ok(categorySales);
    }

    @RequiresPermissions("admin:stat:order")
    @RequiresPermissionsDesc(menu = {"统计管理", "营收分析"}, button = "季节概览")
    @GetMapping("/revenue/season/overview")
    public Object statRevenueSeasonOverview(
            @RequestParam(defaultValue = "2026") int year) {
        List<Map> seasonData = statService.statSeasonOverview(year);

        // 转换为 Map 便于前端使用
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        for (Map item : seasonData) {
            String season = (String) item.get("season");
            if (season != null) {
                java.util.Map<String, Object> seasonInfo = new java.util.HashMap<>();
                seasonInfo.put("amount", item.get("amount"));
                seasonInfo.put("orders", item.get("orders"));
                seasonInfo.put("growth", 0); // 同比增长需要历史数据计算
                result.put(season, seasonInfo);
            }
        }

        // 确保返回完整的季节数据
        if (!result.containsKey("spring")) {
            java.util.Map<String, Object> spring = new java.util.HashMap<>();
            spring.put("amount", 0);
            spring.put("orders", 0);
            spring.put("growth", 0);
            result.put("spring", spring);
        }
        if (!result.containsKey("winter")) {
            java.util.Map<String, Object> winter = new java.util.HashMap<>();
            winter.put("amount", 0);
            winter.put("orders", 0);
            winter.put("growth", 0);
            result.put("winter", winter);
        }

        // 添加图表数据
        result.put("chartData", seasonData);

        return ResponseUtil.ok(result);
    }

    @RequiresPermissions("admin:stat:order")
    @RequiresPermissionsDesc(menu = {"统计管理", "营收分析"}, button = "季节热销商品")
    @GetMapping("/revenue/season/hot-goods")
    public Object statRevenueSeasonHotGoods(
            @RequestParam(defaultValue = "2026") int year,
            @RequestParam(defaultValue = "spring") String season,
            @RequestParam(defaultValue = "10") int limit) {
        List<Map> hotGoods = statService.statSeasonHotGoods(year, season, limit);

        // 计算季节总销售额用于计算占比
        double totalAmount = 0;
        for (Map item : hotGoods) {
            Object amount = item.get("amount");
            if (amount != null) {
                totalAmount += ((Number) amount).doubleValue();
            }
        }

        // 为每个商品添加占比
        for (Map item : hotGoods) {
            Object amount = item.get("amount");
            double amt = amount != null ? ((Number) amount).doubleValue() : 0;
            double percent = totalAmount > 0 ? (amt / totalAmount) * 100 : 0;
            item.put("percent", Math.round(percent * 10) / 10.0);
        }

        return ResponseUtil.ok(hotGoods);
    }

}
