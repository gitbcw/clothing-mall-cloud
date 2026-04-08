package org.linlinjava.litemall.wx.web;

import com.github.binarywang.wxpay.bean.request.WxPayRefundRequest;
import com.github.binarywang.wxpay.bean.result.WxPayRefundResult;
import com.github.binarywang.wxpay.service.WxPayService;
import com.github.pagehelper.PageInfo;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallAftersale;
import org.linlinjava.litemall.db.domain.LitemallOrder;
import org.linlinjava.litemall.db.domain.LitemallOrderGoods;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.domain.LitemallGoods;
import org.linlinjava.litemall.db.domain.ClothingStore;
import org.linlinjava.litemall.db.service.ClothingStoreService;
import org.linlinjava.litemall.db.service.LitemallAftersaleService;
import org.linlinjava.litemall.db.service.LitemallShipperService;
import org.linlinjava.litemall.db.service.LitemallGoodsProductService;
import org.linlinjava.litemall.db.service.LitemallGoodsService;
import org.linlinjava.litemall.db.service.LitemallOrderGoodsService;
import org.linlinjava.litemall.db.service.LitemallOrderService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.db.util.AftersaleConstant;
import org.linlinjava.litemall.db.util.OrderUtil;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 小程序管理端订单控制器
 * 提供给店主使用的订单管理接口
 */
@RestController
@RequestMapping("/wx/manager/order")
@Validated
public class WxManagerOrderController {
    private final Log logger = LogFactory.getLog(WxManagerOrderController.class);

    @Autowired
    private LitemallOrderService orderService;

    @Autowired
    private LitemallOrderGoodsService orderGoodsService;

    @Autowired
    private LitemallGoodsService goodsService;

    @Autowired
    private LitemallGoodsProductService goodsProductService;

    @Autowired
    private LitemallUserService userService;

    @Autowired
    private WxPayService wxPayService;

    @Autowired
    private LitemallAftersaleService aftersaleService;

    @Autowired
    private LitemallShipperService shipperService;

    @Autowired
    private ClothingStoreService clothingStoreService;

    // ========== Tab 状态映射 ==========

    private static final List<Short> PENDING_STATUSES = Arrays.asList(
            OrderUtil.STATUS_PAY, OrderUtil.STATUS_VERIFY_PENDING);

    // 售后待处理状态（需要店主操作的：待审核 + 审核通过待发货）
    private static final List<Short> AFTERSALE_PENDING_STATUSES = Arrays.asList(
            AftersaleConstant.STATUS_REQUEST, AftersaleConstant.STATUS_RECEPT);

    // 售后已完结状态
    private static final List<Short> AFTERSALE_DONE_STATUSES = Arrays.asList(
            AftersaleConstant.STATUS_REJECT, AftersaleConstant.STATUS_CANCEL, AftersaleConstant.STATUS_COMPLETED);

    private static final List<Short> COMPLETED_STATUSES = Arrays.asList(
            OrderUtil.STATUS_SHIP, OrderUtil.STATUS_CONFIRM, OrderUtil.STATUS_AUTO_CONFIRM,
            OrderUtil.STATUS_VERIFIED, OrderUtil.STATUS_CANCEL, OrderUtil.STATUS_AUTO_CANCEL,
            OrderUtil.STATUS_ADMIN_CANCEL);

    // ========== 权限校验 ==========

    /**
     * 检查用户是否有管理权限（仅店主）
     */
    private Object checkManager(Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }
        String role = user.getRole();
        if (role == null) {
            role = "user";
        }
        if (!"owner".equals(role)) {
            return ResponseUtil.fail(403, "无管理权限");
        }
        return null;
    }

    // ========== API 接口 ==========

    /**
     * 订单列表（管理端）
     *
     * @param userId 用户ID
     * @param status pending/aftersale/completed
     * @param page   页码
     * @param limit  每页数量
     * @return 分页订单列表 + 各 tab 数量统计
     */
    @GetMapping("list")
    public Object list(@LoginUser Integer userId,
                       @RequestParam(defaultValue = "pending") String status,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "20") Integer limit) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        List<Short> statusCodes = mapStatus(status);
        if (statusCodes == null) {
            return ResponseUtil.badArgumentValue();
        }

        // 查询订单列表（null userId = 所有用户）
        List<LitemallOrder> orderList = orderService.querySelective(
                null, null, null, null, statusCodes, page, limit, "add_time", "desc");
        long total = PageInfo.of(orderList).getTotal();

        // 组装返回数据：订单 + 商品列表
        List<Map<String, Object>> resultList = new ArrayList<>();
        for (LitemallOrder order : orderList) {
            Map<String, Object> orderMap = new HashMap<>();
            orderMap.put("id", order.getId());
            orderMap.put("orderSn", order.getOrderSn());
            orderMap.put("orderStatus", order.getOrderStatus());
            orderMap.put("orderStatusText", OrderUtil.orderStatusText(order));
            orderMap.put("actualPrice", order.getActualPrice());
            orderMap.put("consignee", order.getConsignee());
            orderMap.put("mobile", order.getMobile());
            orderMap.put("addTime", order.getAddTime());
            orderMap.put("deliveryType", order.getDeliveryType());
            List<LitemallOrderGoods> goodsList = orderGoodsService.queryByOid(order.getId());
            orderMap.put("goodsList", goodsList);
            orderMap.put("goodsCount", goodsList.size());
            resultList.add(orderMap);
        }

        // 各 tab 数量统计
        Map<String, Object> data = new HashMap<>();
        data.put("list", resultList);
        data.put("total", total);
        data.put("pages", (total + limit - 1) / limit);
        data.put("pendingCount", orderService.countByOrderStatus(PENDING_STATUSES));
        data.put("aftersaleCount", countAftersaleByStatus(AFTERSALE_PENDING_STATUSES));
        data.put("completedCount", orderService.countByOrderStatus(COMPLETED_STATUSES));

        return ResponseUtil.ok(data);
    }

    /**
     * 订单详情（管理端）
     *
     * @param userId  用户ID
     * @param orderId 订单ID
     * @return 订单详情 + 商品列表
     */
    @GetMapping("detail")
    public Object detail(@LoginUser Integer userId, @NotNull Integer orderId) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }
        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgumentValue();
        }

        Map<String, Object> data = new HashMap<>();
        // 自提订单附加门店信息
        if ("pickup".equals(order.getDeliveryType()) && order.getPickupStoreId() != null) {
            ClothingStore store = clothingStoreService.findById(order.getPickupStoreId());
            if (store != null) {
                Map<String, Object> storeInfo = new HashMap<>();
                storeInfo.put("id", store.getId());
                storeInfo.put("name", store.getName());
                storeInfo.put("address", store.getAddress());
                storeInfo.put("phone", store.getPhone());
                storeInfo.put("businessHours", store.getBusinessHours());
                data.put("pickupStore", storeInfo);
            }
        }
        data.put("order", order);
        data.put("goodsList", orderGoodsService.queryByOid(orderId));
        return ResponseUtil.ok(data);
    }

    /**
     * 发货
     * 201(已付款) → 301(已发货)
     *
     * @param userId 用户ID
     * @param body   { orderId, shipSn, shipChannel }
     */
    @PostMapping("ship")
    public Object ship(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        String shipSn = JacksonUtil.parseString(body, "shipSn");
        String shipChannel = JacksonUtil.parseString(body, "shipChannel");

        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        if (!order.getOrderStatus().equals(OrderUtil.STATUS_PAY)) {
            return ResponseUtil.fail(403, "订单状态不允许发货");
        }

        order.setOrderStatus(OrderUtil.STATUS_SHIP);
        order.setShipSn(shipSn);
        order.setShipChannel(shipChannel);
        order.setShipTime(LocalDateTime.now());

        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }

        return ResponseUtil.ok();
    }

    /**
     * 取消订单
     * - 101(待付款): 直接取消 + 回滚库存
     * - 201(已付款): 取消 + 微信退款 + 回滚库存
     *
     * @param userId 用户ID
     * @param body   { orderId }
     */
    @PostMapping("cancel")
    public Object cancel(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        Short orderStatus = order.getOrderStatus();
        // 仅允许取消 待付款/已付款 状态的订单
        if (!orderStatus.equals(OrderUtil.STATUS_CREATE) &&
                !orderStatus.equals(OrderUtil.STATUS_PAY)) {
            return ResponseUtil.fail(403, "订单状态不允许取消");
        }

        // 已付款订单需微信退款
        if (orderStatus.equals(OrderUtil.STATUS_PAY)) {
            try {
                wxRefund(order);
            } catch (Exception e) {
                logger.error("微信退款失败", e);
                return ResponseUtil.fail(500, "退款失败：" + e.getMessage());
            }
        }

        // 回滚库存
        rollbackStock(orderId);

        order.setOrderStatus(OrderUtil.STATUS_ADMIN_CANCEL);
        order.setEndTime(LocalDateTime.now());

        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }

        return ResponseUtil.ok();
    }

    /**
     * 同意退款
     * 202(退款中) → 203(已退款) + 微信退款 + 释放库存
     *
     * @param userId 用户ID
     * @param body   { orderId }
     */
    @PostMapping("refundAgree")
    public Object refundAgree(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        if (!order.getOrderStatus().equals(OrderUtil.STATUS_REFUND)) {
            return ResponseUtil.fail(403, "订单状态不允许退款");
        }

        // 微信退款
        try {
            wxRefund(order);
        } catch (Exception e) {
            logger.error("微信退款失败", e);
            return ResponseUtil.fail(500, "退款失败：" + e.getMessage());
        }

        // 释放库存
        rollbackStock(orderId);

        order.setOrderStatus(OrderUtil.STATUS_REFUND_CONFIRM);
        order.setEndTime(LocalDateTime.now());

        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }

        return ResponseUtil.ok();
    }

    /**
     * 拒绝退款
     * 202(退款中) → 恢复原状态（根据是否已发货判断）
     *
     * @param userId 用户ID
     * @param body   { orderId, reason }
     */
    @PostMapping("refundReject")
    public Object refundReject(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        if (!order.getOrderStatus().equals(OrderUtil.STATUS_REFUND)) {
            return ResponseUtil.fail(403, "订单状态不正确");
        }

        // 恢复原状态：已发货→301，未发货→201
        if (order.getShipTime() != null) {
            order.setOrderStatus(OrderUtil.STATUS_SHIP);
        } else {
            order.setOrderStatus(OrderUtil.STATUS_PAY);
        }

        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }

        return ResponseUtil.ok();
    }

    /**
     * 核销自提订单
     * 501(待核销) → 502(已核销)
     *
     * @param userId 用户ID
     * @param body   { orderId, pickupCode }
     */
    @PostMapping("verify")
    public Object verify(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        String pickupCode = JacksonUtil.parseString(body, "pickupCode");

        if (orderId == null || pickupCode == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        if (!order.getOrderStatus().equals(OrderUtil.STATUS_VERIFY_PENDING)) {
            return ResponseUtil.fail(403, "订单状态不允许核销");
        }

        // 验证取货码
        if (!pickupCode.equals(order.getPickupCode())) {
            return ResponseUtil.fail(400, "取货码错误");
        }

        order.setOrderStatus(OrderUtil.STATUS_VERIFIED);
        order.setConfirmTime(LocalDateTime.now());

        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }

        return ResponseUtil.ok();
    }

    // ========== 售后接口 ==========

    /**
     * 售后列表（管理端）
     *
     * @param userId 用户ID
     * @param tab    pending/done
     * @param page   页码
     * @param limit  每页数量
     * @return 售后列表 + 统计
     */
    @GetMapping("aftersale/list")
    public Object aftersaleList(@LoginUser Integer userId,
                                @RequestParam(defaultValue = "pending") String tab,
                                @RequestParam(defaultValue = "1") Integer page,
                                @RequestParam(defaultValue = "20") Integer limit) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        List<Short> statusArray;
        if ("done".equals(tab)) {
            statusArray = AFTERSALE_DONE_STATUSES;
        } else {
            statusArray = AFTERSALE_PENDING_STATUSES;
        }

        List<LitemallAftersale> aftersaleList = aftersaleService.querySelective(
                null, null, null, statusArray, page, limit, "add_time", "desc");
        long total = PageInfo.of(aftersaleList).getTotal();

        // 组装返回数据
        List<Map<String, Object>> resultList = new ArrayList<>();
        for (LitemallAftersale aftersale : aftersaleList) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", aftersale.getId());
            map.put("aftersaleSn", aftersale.getAftersaleSn());
            map.put("orderId", aftersale.getOrderId());
            map.put("type", aftersale.getType());
            map.put("typeText", aftersaleTypeText(aftersale.getType()));
            map.put("status", aftersale.getStatus());
            map.put("statusText", aftersaleStatusText(aftersale.getStatus()));
            map.put("reason", aftersale.getReason());
            map.put("amount", aftersale.getAmount());
            map.put("addTime", aftersale.getAddTime());
            map.put("handleTime", aftersale.getHandleTime());

            // 关联订单信息
            LitemallOrder order = orderService.findById(aftersale.getOrderId());
            if (order != null) {
                map.put("orderSn", order.getOrderSn());
                map.put("consignee", order.getConsignee());
                map.put("mobile", order.getMobile());
            }

            // 关联订单商品信息
            List<LitemallOrderGoods> goodsList = orderGoodsService.queryByOid(aftersale.getOrderId());
            map.put("goodsList", goodsList);

            resultList.add(map);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("list", resultList);
        data.put("total", total);
        data.put("pendingCount", countAftersaleByStatus(AFTERSALE_PENDING_STATUSES));
        data.put("doneCount", countAftersaleByStatus(AFTERSALE_DONE_STATUSES));

        return ResponseUtil.ok(data);
    }

    /**
     * 审核通过（同意换货）
     */
    @PostMapping("aftersale/recept")
    public Object aftersaleRecept(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) return error;

        Integer id = JacksonUtil.parseInteger(body, "id");
        if (id == null) return ResponseUtil.badArgument();

        LitemallAftersale aftersale = aftersaleService.findById(id);
        if (aftersale == null) return ResponseUtil.badArgumentValue();
        if (!aftersale.getStatus().equals(AftersaleConstant.STATUS_REQUEST)) {
            return ResponseUtil.fail(403, "当前状态不允许审核");
        }

        aftersale.setStatus(AftersaleConstant.STATUS_RECEPT);
        aftersale.setHandleTime(LocalDateTime.now());
        aftersaleService.updateById(aftersale);
        orderService.updateAftersaleStatus(aftersale.getOrderId(), AftersaleConstant.STATUS_RECEPT);

        return ResponseUtil.ok();
    }

    /**
     * 审核拒绝
     */
    @PostMapping("aftersale/reject")
    public Object aftersaleReject(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) return error;

        Integer id = JacksonUtil.parseInteger(body, "id");
        if (id == null) return ResponseUtil.badArgument();

        LitemallAftersale aftersale = aftersaleService.findById(id);
        if (aftersale == null) return ResponseUtil.badArgumentValue();
        if (!aftersale.getStatus().equals(AftersaleConstant.STATUS_REQUEST)) {
            return ResponseUtil.fail(403, "当前状态不允许拒绝");
        }

        aftersale.setStatus(AftersaleConstant.STATUS_REJECT);
        aftersale.setHandleTime(LocalDateTime.now());
        aftersaleService.updateById(aftersale);
        orderService.updateAftersaleStatus(aftersale.getOrderId(), AftersaleConstant.STATUS_REJECT);

        return ResponseUtil.ok();
    }

    /**
     * 换货发货
     */
    @PostMapping("aftersale/ship")
    public Object aftersaleShip(@LoginUser Integer userId, @RequestBody String body) {
        Object error = checkManager(userId);
        if (error != null) return error;

        Integer id = JacksonUtil.parseInteger(body, "id");
        String shipSn = JacksonUtil.parseString(body, "shipSn");
        String shipChannel = JacksonUtil.parseString(body, "shipChannel");

        if (id == null || shipSn == null || shipChannel == null) {
            return ResponseUtil.badArgument();
        }

        LitemallAftersale aftersale = aftersaleService.findById(id);
        if (aftersale == null) return ResponseUtil.badArgumentValue();
        if (!aftersale.getStatus().equals(AftersaleConstant.STATUS_RECEPT)) {
            return ResponseUtil.fail(403, "当前状态不允许发货，请先审核通过");
        }

        aftersale.setStatus(AftersaleConstant.STATUS_SHIPPED);
        aftersale.setHandleTime(LocalDateTime.now());
        aftersale.setShipSn(shipSn);
        aftersale.setShipChannel(shipChannel);
        aftersaleService.updateById(aftersale);
        orderService.updateAftersaleStatus(aftersale.getOrderId(), AftersaleConstant.STATUS_SHIPPED);

        return ResponseUtil.ok();
    }

    // ========== 私有方法 ==========

    /**
     * 微信退款
     */
    private void wxRefund(LitemallOrder order) throws Exception {
        WxPayRefundRequest request = new WxPayRefundRequest();
        request.setOutTradeNo(order.getOrderSn());
        request.setOutRefundNo("refund_" + order.getOrderSn());
        Integer totalFee = order.getActualPrice().multiply(new BigDecimal(100)).intValue();
        request.setTotalFee(totalFee);
        request.setRefundFee(totalFee);
        wxPayService.refund(request);
    }

    /**
     * 回滚库存
     */
    private void rollbackStock(Integer orderId) {
        List<LitemallOrderGoods> orderGoodsList = orderGoodsService.queryByOid(orderId);
        for (LitemallOrderGoods orderGoods : orderGoodsList) {
            Integer productId = orderGoods.getProductId();
            Short number = orderGoods.getNumber();
            if (productId != null && number != null && number > 0) {
                goodsProductService.addStock(productId, number);
            }
        }
    }

    /**
     * Tab status 参数 → 订单状态码列表
     */
    private List<Short> mapStatus(String status) {
        switch (status) {
            case "pending":
                return PENDING_STATUSES;
            case "completed":
                return COMPLETED_STATUSES;
            default:
                return null;
        }
    }

    /**
     * 统计售后数量
     */
    private long countAftersaleByStatus(List<Short> statusArray) {
        List<LitemallAftersale> list = aftersaleService.querySelective(
                null, null, null, statusArray, 1, 1, "add_time", "desc");
        return PageInfo.of(list).getTotal();
    }

    private String aftersaleStatusText(Short status) {
        if (status == null) return "未知";
        if (status.equals(AftersaleConstant.STATUS_REQUEST)) return "待审核";
        if (status.equals(AftersaleConstant.STATUS_RECEPT)) return "审核通过";
        if (status.equals(AftersaleConstant.STATUS_SHIPPED)) return "换货已发货";
        if (status.equals(AftersaleConstant.STATUS_REJECT)) return "已拒绝";
        if (status.equals(AftersaleConstant.STATUS_CANCEL)) return "已取消";
        if (status.equals(AftersaleConstant.STATUS_COMPLETED)) return "已完成";
        return "未知";
    }

    private String aftersaleTypeText(Short type) {
        if (type == null) return "未知";
        if (type.equals(AftersaleConstant.TYPE_EXCHANGE_SAME)) return "同款换货";
        if (type.equals(AftersaleConstant.TYPE_EXCHANGE_DIFF)) return "换其他商品";
        return "未知";
    }

    /**
     * 管理后台首页统计数据
     */
    @GetMapping("stats")
    public Object stats(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) {
            return error;
        }

        // 订单统计
        long pendingOrderCount = orderService.countByOrderStatus(PENDING_STATUSES);
        long aftersaleCount = countAftersaleByStatus(AFTERSALE_PENDING_STATUSES);

        // 最近 5 条待处理订单
        List<LitemallOrder> recentOrders = orderService.querySelective(
                null, null, null, null, PENDING_STATUSES, 1, 5, "add_time", "desc");

        // 组装返回
        List<Map<String, Object>> recentList = new ArrayList<>();
        for (LitemallOrder order : recentOrders) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", order.getId());
            map.put("orderSn", order.getOrderSn());
            map.put("orderStatus", order.getOrderStatus());
            map.put("orderStatusText", OrderUtil.orderStatusText(order));
            map.put("actualPrice", order.getActualPrice());
            map.put("consignee", order.getConsignee());
            map.put("addTime", order.getAddTime());
            recentList.add(map);
        }

        // 待上架商品数
        long pendingGoodsCount = goodsService.countByCondition(LitemallGoods.STATUS_DRAFT, null)
                + goodsService.countByCondition(LitemallGoods.STATUS_PENDING, null);

        Map<String, Object> data = new HashMap<>();
        data.put("pendingOrderCount", pendingOrderCount);
        data.put("aftersaleCount", aftersaleCount);
        data.put("pendingGoodsCount", pendingGoodsCount);
        data.put("recentOrders", recentList);
        return ResponseUtil.ok(data);
    }

    /**
     * 获取已启用的快递公司列表（供小程序发货使用）
     */
    @GetMapping("shippers")
    public Object shippers(@LoginUser Integer userId) {
        Object error = checkManager(userId);
        if (error != null) return error;
        return ResponseUtil.ok(shipperService.listEnabledNames());
    }
}
