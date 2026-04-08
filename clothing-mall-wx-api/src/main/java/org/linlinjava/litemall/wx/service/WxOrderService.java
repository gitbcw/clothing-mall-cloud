package org.linlinjava.litemall.wx.service;

import com.github.binarywang.wxpay.bean.notify.WxPayNotifyResponse;
import com.github.binarywang.wxpay.bean.notify.WxPayOrderNotifyResult;
import com.github.binarywang.wxpay.bean.order.WxPayMpOrderResult;
import com.github.binarywang.wxpay.bean.order.WxPayMwebOrderResult;
import com.github.binarywang.wxpay.bean.request.WxPayUnifiedOrderRequest;
import com.github.binarywang.wxpay.bean.result.BaseWxPayResult;
import com.github.binarywang.wxpay.constant.WxPayConstants;
import com.github.binarywang.wxpay.exception.WxPayException;
import com.github.binarywang.wxpay.service.WxPayService;
import org.apache.commons.io.IOUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.express.ExpressService;
import org.linlinjava.litemall.core.express.dao.ExpressInfo;
import org.linlinjava.litemall.core.notify.NotifyService;
import org.linlinjava.litemall.core.notify.NotifyType;
import org.linlinjava.litemall.core.system.FreightService;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.core.task.TaskService;
import org.linlinjava.litemall.core.util.DateTimeUtil;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.*;
import org.linlinjava.litemall.db.service.*;
import org.linlinjava.litemall.db.domain.ClothingStore;
import org.linlinjava.litemall.db.service.ClothingStoreService;
import org.linlinjava.litemall.db.util.CouponUserConstant;
import org.linlinjava.litemall.db.util.OrderHandleOption;
import org.linlinjava.litemall.db.util.OrderUtil;
import org.linlinjava.litemall.core.util.IpUtil;
import org.linlinjava.litemall.wx.task.OrderUnpaidTask;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.linlinjava.litemall.wx.util.WxResponseCode.*;

/**
 * 订单服务
 *
 * <p>
 * 订单状态：
 * 101 订单生成，未支付；102，下单后未支付用户取消；103，下单后未支付超时系统自动取消
 * 201 支付完成，商家未发货；202，订单生产，已付款未发货，但是退款取消；
 * 301 商家发货，用户未确认；
 * 401 用户确认收货； 402 用户没有确认收货超过一定时间，系统自动确认收货；
 *
 * <p>
 * 用户操作：
 * 当101用户未付款时，此时用户可以进行的操作是取消订单，或者付款操作
 * 当201支付完成而商家未发货时，此时用户可以取消订单并申请退款
 * 当301商家已发货时，此时用户可以有确认收货的操作
 * 当401用户确认收货以后，此时用户可以进行的操作是删除订单，评价商品，申请售后，或者再次购买
 * 当402系统自动确认收货以后，此时用户可以删除订单，评价商品，申请售后，或者再次购买
 */
@Service
public class WxOrderService {
    private final Log logger = LogFactory.getLog(WxOrderService.class);

    @Autowired
    private LitemallUserService userService;
    @Autowired
    private LitemallOrderService orderService;
    @Autowired
    private LitemallOrderGoodsService orderGoodsService;
    @Autowired
    private LitemallAddressService addressService;
    @Autowired
    private LitemallCartService cartService;
    @Autowired
    private LitemallRegionService regionService;
    @Autowired
    private LitemallGoodsProductService productService;
    @Autowired
    private WxPayService wxPayService;
    @Autowired
    private NotifyService notifyService;
    @Autowired
    private ExpressService expressService;
    @Autowired
    private LitemallCouponService couponService;
    @Autowired
    private LitemallCouponUserService couponUserService;
    @Autowired
    private CouponVerifyService couponVerifyService;
    @Autowired
    private TaskService taskService;
    @Autowired
    private FreightService freightService;
    @Autowired
    private LitemallAftersaleService aftersaleService;
    @Autowired
    private LitemallRoleService roleService;
    @Autowired
    private LitemallPermissionService permissionService;
    @Autowired
    private LitemallOrderExpressService orderExpressService;
    @Autowired
    private ClothingStoreService clothingStoreService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    /**
     * 订单列表
     *
     * @param userId   用户ID
     * @param showType 订单信息：
     *                 0，全部订单；
     *                 1，待付款；
     *                 2，待发货；
     *                 3，待收货；
     *                 4，待评价。
     * @param page     分页页数
     * @param limit    分页大小
     * @return 订单列表
     */
    public Object list(Integer userId, Integer showType, Integer page, Integer limit, String sort, String order) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        List<Short> orderStatus = OrderUtil.orderStatus(showType);

        // 已完成订单阶梯展示规则：≤10件展示全部，>10件仅展示30天内
        LocalDateTime minUpdateTime = null;
        if (showType != null && showType.equals(4)) {
            int completedCount = orderService.countByUserIdAndOrderStatus(userId, orderStatus);
            if (completedCount > 10) {
                minUpdateTime = LocalDateTime.now().minusDays(30);
            }
        }

        List<LitemallOrder> orderList = orderService.queryByOrderStatus(userId, orderStatus, minUpdateTime, page, limit, sort, order);

        List<Map<String, Object>> orderVoList = new ArrayList<>(orderList.size());
        for (LitemallOrder o : orderList) {
            Map<String, Object> orderVo = new HashMap<>();
            orderVo.put("id", o.getId());
            orderVo.put("orderSn", o.getOrderSn());
            orderVo.put("actualPrice", o.getActualPrice());
            orderVo.put("orderStatusText", OrderUtil.orderStatusText(o));
            orderVo.put("handleOption", OrderUtil.build(o));
            orderVo.put("aftersaleStatus", o.getAftersaleStatus());

            List<LitemallOrderGoods> orderGoodsList = orderGoodsService.queryByOid(o.getId());
            List<Map<String, Object>> orderGoodsVoList = new ArrayList<>(orderGoodsList.size());
            for (LitemallOrderGoods orderGoods : orderGoodsList) {
                Map<String, Object> orderGoodsVo = new HashMap<>();
                orderGoodsVo.put("id", orderGoods.getId());
                orderGoodsVo.put("goodsName", orderGoods.getGoodsName());
                orderGoodsVo.put("number", orderGoods.getNumber());
                orderGoodsVo.put("picUrl", orderGoods.getPicUrl());
                orderGoodsVo.put("specifications", orderGoods.getSpecifications());
                orderGoodsVo.put("price", orderGoods.getPrice());
                orderGoodsVoList.add(orderGoodsVo);
            }
            orderVo.put("goodsList", orderGoodsVoList);

            orderVoList.add(orderVo);
        }

        return ResponseUtil.okList(orderVoList, orderList);
    }

    /**
     * 订单详情
     *
     * @param userId  用户ID
     * @param orderId 订单ID
     * @return 订单详情
     */
    public Object detail(Integer userId, Integer orderId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        // 订单信息
        LitemallOrder order = orderService.findById(userId, orderId);
        if (null == order) {
            return ResponseUtil.fail(ORDER_UNKNOWN, "订单不存在");
        }
        if (!order.getUserId().equals(userId)) {
            return ResponseUtil.fail(ORDER_INVALID, "不是当前用户的订单");
        }
        Map<String, Object> orderVo = new HashMap<String, Object>();
        orderVo.put("id", order.getId());
        orderVo.put("orderSn", order.getOrderSn());
        orderVo.put("message", order.getMessage());
        orderVo.put("addTime", order.getAddTime());
        orderVo.put("consignee", order.getConsignee());
        orderVo.put("mobile", order.getMobile());
        orderVo.put("address", order.getAddress());
        orderVo.put("goodsPrice", order.getGoodsPrice());
        orderVo.put("couponPrice", order.getCouponPrice());
        orderVo.put("freightPrice", order.getFreightPrice());
        orderVo.put("actualPrice", order.getActualPrice());
        orderVo.put("orderStatusText", OrderUtil.orderStatusText(order));
        orderVo.put("handleOption", OrderUtil.build(order));
        orderVo.put("aftersaleStatus", order.getAftersaleStatus());
        orderVo.put("expCode", order.getShipChannel());
        orderVo.put("expName", expressService.getVendorName(order.getShipChannel()));
        orderVo.put("expNo", order.getShipSn());
        orderVo.put("deliveryType", order.getDeliveryType());
        if ("pickup".equals(order.getDeliveryType())) {
            orderVo.put("pickupCode", order.getPickupCode());
            orderVo.put("pickupStoreId", order.getPickupStoreId());
            orderVo.put("pickupContact", order.getPickupContact());
            orderVo.put("pickupPhone", order.getPickupPhone());
            if (order.getPickupStoreId() != null) {
                ClothingStore store = clothingStoreService.findById(order.getPickupStoreId());
                if (store != null) {
                    Map<String, Object> storeInfo = new HashMap<>();
                    storeInfo.put("id", store.getId());
                    storeInfo.put("name", store.getName());
                    storeInfo.put("address", store.getAddress());
                    storeInfo.put("phone", store.getPhone());
                    storeInfo.put("businessHours", store.getBusinessHours());
                    orderVo.put("pickupStore", storeInfo);
                }
            }
        }

        List<LitemallOrderGoods> orderGoodsList = orderGoodsService.queryByOid(order.getId());

        Map<String, Object> result = new HashMap<>();
        result.put("orderInfo", orderVo);
        result.put("orderGoods", orderGoodsList);

        // 只要订单有快递信息就返回物流轨迹（确认收货后仍可查看）
        boolean hasShipped = order.getShipChannel() != null && order.getShipSn() != null;
        boolean isShipped = order.getOrderStatus().equals(OrderUtil.STATUS_SHIP);
        if (hasShipped) {
            ExpressInfo ei = null;
            // 先读快照（6小时内视为有效）
            LitemallOrderExpress snap = orderExpressService.getByOrderId(order.getId());
            if (snap != null && snap.getTracesJson() != null) {
                LocalDateTime updated = snap.getUpdated();
                boolean fresh = updated != null && Duration.between(updated, LocalDateTime.now()).toHours() < 6;
                if (fresh) {
                    try {
                        ei = objectMapper.readValue(snap.getTracesJson(), ExpressInfo.class);
                    } catch (Exception ignore) {
                    }
                }
            }
            // 仅当前处于"已发货"状态时才实时查询API并刷新快照
            if (ei == null && isShipped) {
                String customerName = null;
                String mobile = order.getMobile();
                if (mobile != null && mobile.length() >= 4) {
                    customerName = mobile.substring(mobile.length() - 4);
                }
                ei = expressService.getExpressInfo(order.getShipChannel(), order.getShipSn(), customerName);
                // 写入/刷新快照
                String vendorName = expressService.getVendorName(order.getShipChannel());
                String state = ei == null ? null : ei.getState();
                String tracesJson = ei == null ? null : org.linlinjava.litemall.core.util.JacksonUtil.toJson(ei);
                orderExpressService.snapshot(order.getId(), order.getShipChannel(), order.getShipSn(), customerName,
                        vendorName, state, tracesJson);
            }
            result.put("expressInfo", ei != null ? ei : new ArrayList<>());
        } else {
            result.put("expressInfo", new ArrayList<>());
        }

        return ResponseUtil.ok(result);

    }

    /**
     * 提交订单
     * <p>
     * 1. 创建订单表项和订单商品表项;
     * 2. 购物车清空;
     * 3. 优惠券设置已用;
     * 4. 商品货品库存减少。
     *
     * @param userId 用户ID
     * @param body   订单信息，{ cartId：xxx, addressId: xxx, couponId: xxx, message: xxx }
     * @return 提交订单操作结果
     */
    @Transactional
    public Object submit(Integer userId, String body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        if (body == null) {
            return ResponseUtil.badArgument();
        }
        Integer cartId = JacksonUtil.parseInteger(body, "cartId");
        Integer addressId = JacksonUtil.parseInteger(body, "addressId");
        Integer couponId = JacksonUtil.parseInteger(body, "couponId");
        Integer userCouponId = JacksonUtil.parseInteger(body, "userCouponId");
        String message = JacksonUtil.parseString(body, "message");

        // 配送方式相关参数
        String deliveryType = JacksonUtil.parseString(body, "deliveryType");
        Integer pickupStoreId = JacksonUtil.parseInteger(body, "pickupStoreId");
        String pickupContact = JacksonUtil.parseString(body, "pickupContact");
        String pickupPhone = JacksonUtil.parseString(body, "pickupPhone");

        // 默认快递配送
        if (deliveryType == null) {
            deliveryType = "express";
        }

        // 自提模式验证
        if ("pickup".equals(deliveryType)) {
            if (pickupStoreId == null || pickupStoreId <= 0) {
                return ResponseUtil.fail(400, "请选择自提门店");
            }
        }

        if (cartId == null || couponId == null) {
            return ResponseUtil.badArgument();
        }

        // 两种模式都需要地址（快递用地址，自提用联系人信息）
        LitemallAddress checkedAddress = null;
        if (addressId != null && addressId > 0) {
            checkedAddress = addressService.query(userId, addressId);
        }
        if (checkedAddress == null) {
            checkedAddress = addressService.findDefault(userId);
        }
        if (checkedAddress == null) {
            return ResponseUtil.fail(400, "请先添加收货地址");
        }

        // 自提模式：从地址中自动取联系人信息
        if ("pickup".equals(deliveryType)) {
            if (pickupContact == null || pickupContact.isEmpty()) {
                pickupContact = checkedAddress.getName();
            }
            if (pickupPhone == null || pickupPhone.isEmpty()) {
                pickupPhone = checkedAddress.getTel();
            }
            if (pickupPhone == null || !pickupPhone.matches("^1[3-9]\\d{9}$")) {
                return ResponseUtil.fail(400, "收货地址中手机号不完整，请先完善地址信息");
            }
        }

        // 货品价格
        List<LitemallCart> checkedGoodsList = null;
        if (cartId.equals(0)) {
            checkedGoodsList = cartService.queryByUidAndChecked(userId);
        } else {
            LitemallCart cart = cartService.findById(cartId);
            checkedGoodsList = new ArrayList<>(1);
            checkedGoodsList.add(cart);
        }
        if (checkedGoodsList.size() == 0) {
            return ResponseUtil.badArgumentValue();
        }
        BigDecimal checkedGoodsPrice = new BigDecimal(0);
        for (LitemallCart checkGoods : checkedGoodsList) {
            checkedGoodsPrice = checkedGoodsPrice
                    .add(checkGoods.getPrice().multiply(new BigDecimal(checkGoods.getNumber())));
        }

        // 获取可用的优惠券信息
        // 使用优惠券减免的金额
        BigDecimal couponPrice = new BigDecimal(0);
        // 如果couponId=0则没有优惠券，couponId=-1则不使用优惠券
        if (couponId != 0 && couponId != -1) {
            LitemallCoupon coupon = couponVerifyService.checkCoupon(userId, couponId, userCouponId, checkedGoodsPrice,
                    checkedGoodsList);
            if (coupon == null) {
                return ResponseUtil.badArgumentValue();
            }
            couponPrice = couponVerifyService.calculateDiscount(coupon, checkedGoodsList);
        }

        // 新人首单立减
        BigDecimal newuserDiscount = BigDecimal.ZERO;
        int orderCount = orderService.count(userId);
        if (orderCount == 0) {
            // 首单立减
            BigDecimal firstOrderDiscount = SystemConfig.getNewUserFirstOrderDiscount();
            if (firstOrderDiscount != null && firstOrderDiscount.compareTo(BigDecimal.ZERO) > 0) {
                newuserDiscount = firstOrderDiscount;
            }
        }

        // 根据订单商品总价计算运费，满足条件（例如88元）则免运费，否则需要支付运费（例如8元）；
        // 自提模式运费为0
        BigDecimal freightPrice = new BigDecimal(0);
        if ("express".equals(deliveryType)) {
            int totalPieceCount = checkedGoodsList.stream().mapToInt(LitemallCart::getNumber).sum();
            freightPrice = freightService.calculateFreight(checkedGoodsPrice, totalPieceCount);
        }

        // 可以使用的其他钱，例如用户积分
        BigDecimal integralPrice = new BigDecimal(0);

        // 订单费用 = 商品价格 + 运费 - 优惠券 - 新人立减
        BigDecimal orderTotalPrice = checkedGoodsPrice.add(freightPrice)
                .subtract(couponPrice)
                .subtract(newuserDiscount)
                .max(new BigDecimal(0));
        // 最终支付费用
        BigDecimal actualPrice = orderTotalPrice.subtract(integralPrice);

        Integer orderId = null;
        LitemallOrder order = null;
        // 订单
        order = new LitemallOrder();
        order.setUserId(userId);
        order.setOrderSn(orderService.generateOrderSn(userId));
        order.setOrderStatus(OrderUtil.STATUS_CREATE);
        order.setMessage(message);
        order.setGoodsPrice(checkedGoodsPrice);
        order.setFreightPrice(freightPrice);
        order.setCouponPrice(couponPrice);
        order.setIntegralPrice(integralPrice);
        order.setOrderPrice(orderTotalPrice);
        order.setActualPrice(actualPrice);

        // 配送方式
        order.setDeliveryType(deliveryType);
        if ("express".equals(deliveryType) && checkedAddress != null) {
            order.setConsignee(checkedAddress.getName());
            order.setMobile(checkedAddress.getTel());
            String detailedAddress = checkedAddress.getProvince() + checkedAddress.getCity() + checkedAddress.getCounty()
                    + " " + checkedAddress.getAddressDetail();
            order.setAddress(detailedAddress);
        } else if ("pickup".equals(deliveryType)) {
            order.setPickupStoreId(pickupStoreId);
            order.setPickupContact(pickupContact);
            order.setPickupPhone(pickupPhone);
            // 生成取货码
            order.setPickupCode(generatePickupCode());
            // 填充 NOT NULL 字段，避免 INSERT 失败
            order.setConsignee(pickupContact);
            order.setMobile(pickupPhone);
            ClothingStore store = clothingStoreService.findById(pickupStoreId);
            order.setAddress(store != null ? "到店自提-" + store.getName() : "到店自提");
        }

        // 添加订单表项
        orderService.add(order);
        orderId = order.getId();

        // 添加订单商品表项
        for (LitemallCart cartGoods : checkedGoodsList) {
            // 订单商品
            LitemallOrderGoods orderGoods = new LitemallOrderGoods();
            orderGoods.setOrderId(order.getId());
            orderGoods.setGoodsId(cartGoods.getGoodsId());
            orderGoods.setGoodsSn(cartGoods.getGoodsSn());
            orderGoods.setProductId(cartGoods.getProductId());
            orderGoods.setGoodsName(cartGoods.getGoodsName());
            orderGoods.setPicUrl(cartGoods.getPicUrl());
            orderGoods.setPrice(cartGoods.getPrice());
            orderGoods.setNumber(cartGoods.getNumber());
            String[] specs = cartGoods.getSpecifications();
            if ((specs == null || specs.length == 0) && cartGoods.getSize() != null) {
                specs = new String[]{cartGoods.getSize()};
            }
            orderGoods.setSpecifications(specs != null ? specs : new String[]{});
            // SKU 信息
            orderGoods.setSkuId(cartGoods.getSkuId());
            orderGoods.setColor(cartGoods.getColor());
            orderGoods.setSize(cartGoods.getSize());
            orderGoods.setAddTime(LocalDateTime.now());

            orderGoodsService.add(orderGoods);
        }

        // 删除购物车里面的商品信息
        if (cartId.equals(0)) {
            cartService.clearGoods(userId);
        } else {
            cartService.deleteById(cartId);
        }

        // 商品货品数量减少
        for (LitemallCart checkGoods : checkedGoodsList) {
            // SKU 模式（skuId 不为空）不扣减库存
            if (checkGoods.getSkuId() != null) {
                continue;
            }
            Integer productId = checkGoods.getProductId();
            LitemallGoodsProduct product = productService.findById(productId);
            if (product == null) {
                continue;
            }

            int remainNumber = product.getNumber() - checkGoods.getNumber();
            if (remainNumber < 0) {
                throw new RuntimeException("下单的商品货品数量大于库存量");
            }
            if (productService.reduceStock(productId, checkGoods.getNumber()) == 0) {
                throw new RuntimeException("商品货品库存减少失败");
            }
        }

        // 如果使用了优惠券，设置优惠券使用状态
        if (couponId != 0 && couponId != -1) {
            LitemallCouponUser couponUser = couponUserService.findById(userCouponId);
            couponUser.setStatus(CouponUserConstant.STATUS_USED);
            couponUser.setUsedTime(LocalDateTime.now());
            couponUser.setOrderId(orderId);
            couponUserService.update(couponUser);
        }

        // NOTE: 建议开发者从业务场景核实下面代码，防止用户利用业务BUG使订单跳过支付环节。
        // 如果订单实际支付费用是0，则直接跳过支付变成待发货状态
        boolean payed = false;
        if (order.getActualPrice().equals(new BigDecimal("0.00"))) {
            payed = true;

            LitemallOrder o = new LitemallOrder();
            o.setId(orderId);
            // 根据配送方式决定下一步状态
            if ("pickup".equals(order.getDeliveryType())) {
                o.setOrderStatus(OrderUtil.STATUS_VERIFY_PENDING);
            } else {
                o.setOrderStatus(OrderUtil.STATUS_PAY);
            }
            orderService.updateSelective(o);

            // TODO 发送邮件和短信通知，这里采用异步发送
            // 订单支付成功以后，会发送短信给用户，以及发送邮件给管理员
            notifyService.notifyMail("新订单通知", order.toString());
            // 这里微信的短信平台对参数长度有限制，所以将订单号只截取后6位
            notifyService.notifySmsTemplateSync(order.getMobile(), NotifyType.PAY_SUCCEED,
                    new String[] { order.getOrderSn().substring(8, 14) });
        } else {
            // 订单支付超期任务
            taskService.addTask(new OrderUnpaidTask(orderId));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("orderId", orderId);
        data.put("payed", payed);
        return ResponseUtil.ok(data);
    }

    /**
     * 取消订单
     * <p>
     * 1. 检测当前订单是否能够取消；
     * 2. 设置订单取消状态；
     * 3. 商品货品库存恢复；
     * 4. 返还优惠券；
     *
     * @param userId 用户ID
     * @param body   订单信息，{ orderId：xxx }
     * @return 取消订单操作结果
     */
    @Transactional
    public Object cancel(Integer userId, String body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(userId, orderId);
        if (order == null) {
            return ResponseUtil.badArgumentValue();
        }
        if (!order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        LocalDateTime preUpdateTime = order.getUpdateTime();

        // 检测是否能够取消
        OrderHandleOption handleOption = OrderUtil.build(order);
        if (!handleOption.isCancel()) {
            return ResponseUtil.fail(ORDER_INVALID_OPERATION, "订单不能取消");
        }

        // 设置订单已取消状态
        order.setOrderStatus(OrderUtil.STATUS_CANCEL);
        order.setEndTime(LocalDateTime.now());
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            throw new RuntimeException("更新数据已失效");
        }

        // 商品货品数量增加
        List<LitemallOrderGoods> orderGoodsList = orderGoodsService.queryByOid(orderId);
        for (LitemallOrderGoods orderGoods : orderGoodsList) {
            // SKU 模式（skuId 不为空）不恢复库存，因为下单时也没有扣减
            if (orderGoods.getSkuId() != null) {
                continue;
            }
            Integer productId = orderGoods.getProductId();
            Short number = orderGoods.getNumber();
            // productId 无效时跳过（如商品已被删除或数据异常）
            if (productId == null || productId <= 0) {
                continue;
            }
            if (productService.addStock(productId, number) == 0) {
                throw new RuntimeException("商品货品库存增加失败");
            }
        }

        // 返还优惠券
        releaseCoupon(orderId);

        return ResponseUtil.ok();
    }

    /**
     * 付款订单的预支付会话标识
     * <p>
     * 1. 检测当前订单是否能够付款
     * 2. 微信商户平台返回支付订单ID
     * 3. 设置订单付款状态
     *
     * @param userId 用户ID
     * @param body   订单信息，{ orderId：xxx }
     * @return 支付订单ID
     */
    @Transactional
    public Object prepay(Integer userId, String body, HttpServletRequest request) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(userId, orderId);
        if (order == null) {
            return ResponseUtil.badArgumentValue();
        }
        if (!order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        // 检测是否能够取消
        OrderHandleOption handleOption = OrderUtil.build(order);
        if (!handleOption.isPay()) {
            return ResponseUtil.fail(ORDER_INVALID_OPERATION, "订单不能支付");
        }

        LitemallUser user = userService.findById(userId);
        String openid = user.getWeixinOpenid();
        if (openid == null) {
            return ResponseUtil.fail(AUTH_OPENID_UNACCESS, "订单不能支付");
        }
        WxPayMpOrderResult result = null;
        try {
            WxPayUnifiedOrderRequest orderRequest = new WxPayUnifiedOrderRequest();
            orderRequest.setOutTradeNo(order.getOrderSn());
            orderRequest.setOpenid(openid);
            orderRequest.setBody("订单：" + order.getOrderSn());
            // 元转成分
            int fee = 0;
            BigDecimal actualPrice = order.getActualPrice();
            fee = actualPrice.multiply(new BigDecimal(100)).intValue();
            orderRequest.setTotalFee(fee);
            orderRequest.setSpbillCreateIp(IpUtil.getIpAddr(request));

            result = wxPayService.createOrder(orderRequest);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseUtil.fail(ORDER_PAY_FAIL, "订单不能支付");
        }

        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }
        return ResponseUtil.ok(result);
    }

    /**
     * 微信H5支付
     *
     * @param userId
     * @param body
     * @param request
     * @return
     */
    @Transactional
    public Object h5pay(Integer userId, String body, HttpServletRequest request) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(userId, orderId);
        if (order == null) {
            return ResponseUtil.badArgumentValue();
        }
        if (!order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        // 检测是否能够取消
        OrderHandleOption handleOption = OrderUtil.build(order);
        if (!handleOption.isPay()) {
            return ResponseUtil.fail(ORDER_INVALID_OPERATION, "订单不能支付");
        }

        WxPayMwebOrderResult result = null;
        try {
            WxPayUnifiedOrderRequest orderRequest = new WxPayUnifiedOrderRequest();
            orderRequest.setOutTradeNo(order.getOrderSn());
            orderRequest.setTradeType("MWEB");
            orderRequest.setBody("订单：" + order.getOrderSn());
            // 元转成分
            int fee = 0;
            BigDecimal actualPrice = order.getActualPrice();
            fee = actualPrice.multiply(new BigDecimal(100)).intValue();
            orderRequest.setTotalFee(fee);
            orderRequest.setSpbillCreateIp(IpUtil.getIpAddr(request));

            result = wxPayService.createOrder(orderRequest);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return ResponseUtil.ok(result);
    }

    /**
     * 微信付款成功或失败回调接口
     * <p>
     * 1. 检测当前订单是否是付款状态;
     * 2. 设置订单付款成功状态相关信息;
     * 3. 响应微信商户平台.
     *
     * @param request  请求内容
     * @param response 响应内容
     * @return 操作结果
     */
    @Transactional
    public Object payNotify(HttpServletRequest request, HttpServletResponse response) {
        String xmlResult = null;
        try {
            xmlResult = IOUtils.toString(request.getInputStream(), request.getCharacterEncoding());
        } catch (IOException e) {
            e.printStackTrace();
            return WxPayNotifyResponse.fail(e.getMessage());
        }

        WxPayOrderNotifyResult result = null;
        try {
            result = wxPayService.parseOrderNotifyResult(xmlResult);

            if (!WxPayConstants.ResultCode.SUCCESS.equals(result.getResultCode())) {
                logger.error(xmlResult);
                throw new WxPayException("微信通知支付失败！");
            }
            if (!WxPayConstants.ResultCode.SUCCESS.equals(result.getReturnCode())) {
                logger.error(xmlResult);
                throw new WxPayException("微信通知支付失败！");
            }
        } catch (WxPayException e) {
            e.printStackTrace();
            return WxPayNotifyResponse.fail(e.getMessage());
        }

        logger.info("处理腾讯支付平台的订单支付");
        logger.info(result);

        String orderSn = result.getOutTradeNo();
        String payId = result.getTransactionId();

        // 分转化成元
        String totalFee = BaseWxPayResult.fenToYuan(result.getTotalFee());
        LitemallOrder order = orderService.findBySn(orderSn);
        if (order == null) {
            return WxPayNotifyResponse.fail("订单不存在 sn=" + orderSn);
        }

        // 检查这个订单是否已经处理过
        if (OrderUtil.hasPayed(order)) {
            return WxPayNotifyResponse.success("订单已经处理成功!");
        }

        // 检查支付订单金额
        if (!totalFee.equals(order.getActualPrice().toString())) {
            return WxPayNotifyResponse.fail(order.getOrderSn() + " : 支付金额不符合 totalFee=" + totalFee);
        }

        order.setPayId(payId);
        order.setPayTime(LocalDateTime.now());
        // 根据配送方式决定下一步状态
        if ("pickup".equals(order.getDeliveryType())) {
            order.setOrderStatus(OrderUtil.STATUS_VERIFY_PENDING);
        } else {
            order.setOrderStatus(OrderUtil.STATUS_PAY);
        }
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return WxPayNotifyResponse.fail("更新数据已失效");
        }

        // TODO 发送邮件和短信通知，这里采用异步发送
        // 订单支付成功以后，会发送短信给用户，以及发送邮件给管理员
        notifyService.notifyMail("新订单通知", order.toString());
        // 这里微信的短信平台对参数长度有限制，所以将订单号只截取后6位
        notifyService.notifySmsTemplateSync(order.getMobile(), NotifyType.PAY_SUCCEED,
                new String[] { orderSn.substring(8, 14) });

        // 支付成功后，短信通知绑定了手机号的运营角色
        List<LitemallRole> opsRoles = roleService.queryAll();
        for (LitemallRole r : opsRoles) {
            String mobile = r.getMobile();
            if (mobile == null || mobile.trim().isEmpty() || !Boolean.TRUE.equals(r.getEnabled())) {
                continue;
            }
            if (permissionService.queryByRoleId(r.getId()).contains("admin:ops:notify")) {
                notifyService.notifySmsTemplate(mobile, NotifyType.OPS_PAY_SUCCEED,
                        new String[] { orderSn.substring(8, 14), order.getActualPrice().toPlainString() });
            }
        }

        // 取消订单超时未支付任务
        taskService.removeTask(new OrderUnpaidTask(order.getId()));

        return WxPayNotifyResponse.success("处理成功!");
    }

    /**
     * 订单申请退款
     * <p>
     * 1. 检测当前订单是否能够退款；
     * 2. 设置订单申请退款状态。
     *
     * @param userId 用户ID
     * @param body   订单信息，{ orderId：xxx }
     * @return 订单退款操作结果
     */
    public Object refund(Integer userId, String body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(userId, orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }
        if (!order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        OrderHandleOption handleOption = OrderUtil.build(order);
        if (!handleOption.isRefund()) {
            return ResponseUtil.fail(ORDER_INVALID_OPERATION, "订单不能取消");
        }

        // 设置订单申请退款状态
        order.setOrderStatus(OrderUtil.STATUS_REFUND);
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }

        // TODO 发送邮件和短信通知，这里采用异步发送
        // 有用户申请退款，邮件通知运营人员
        notifyService.notifyMail("退款申请", order.toString());

        return ResponseUtil.ok();
    }

    /**
     * 确认收货
     * <p>
     * 1. 检测当前订单是否能够确认收货；
     * 2. 设置订单确认收货状态。
     *
     * @param userId 用户ID
     * @param body   订单信息，{ orderId：xxx }
     * @return 订单操作结果
     */
    public Object confirm(Integer userId, String body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(userId, orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }
        if (!order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        OrderHandleOption handleOption = OrderUtil.build(order);
        if (!handleOption.isConfirm()) {
            return ResponseUtil.fail(ORDER_INVALID_OPERATION, "订单不能确认收货");
        }

        order.setOrderStatus(OrderUtil.STATUS_CONFIRM);
        order.setConfirmTime(LocalDateTime.now());
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }
        return ResponseUtil.ok();
    }

    /**
     * 删除订单
     * <p>
     * 1. 检测当前订单是否可以删除；
     * 2. 删除订单。
     *
     * @param userId 用户ID
     * @param body   订单信息，{ orderId：xxx }
     * @return 订单操作结果
     */
    public Object delete(Integer userId, String body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(userId, orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }
        if (!order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        OrderHandleOption handleOption = OrderUtil.build(order);
        if (!handleOption.isDelete()) {
            return ResponseUtil.fail(ORDER_INVALID_OPERATION, "订单不能删除");
        }

        // 订单order_status没有字段用于标识删除
        // 而是存在专门的delete字段表示是否删除
        orderService.deleteById(orderId);
        // 售后也同时删除
        aftersaleService.deleteByOrderId(userId, orderId);

        return ResponseUtil.ok();
    }

    /**
     * 取消订单/退款返还优惠券
     * <br/>
     *
     * @param orderId
     * @return void
     * @author Tyson
     * @date 2020/6/8/0008 1:41
     */
    public void releaseCoupon(Integer orderId) {
        List<LitemallCouponUser> couponUsers = couponUserService.findByOid(orderId);
        for (LitemallCouponUser couponUser : couponUsers) {
            // 优惠券状态设置为可使用
            couponUser.setStatus(CouponUserConstant.STATUS_USABLE);
            couponUser.setUpdateTime(LocalDateTime.now());
            couponUserService.update(couponUser);
        }
    }

    /**
     * 生成取货码
     * 生成6位数字取货码
     *
     * @return 取货码
     */
    private String generatePickupCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }
}
