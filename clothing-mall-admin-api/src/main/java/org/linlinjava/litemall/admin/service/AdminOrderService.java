package org.linlinjava.litemall.admin.service;

import com.github.binarywang.wxpay.bean.notify.WxPayNotifyResponse;
import com.github.binarywang.wxpay.bean.request.WxPayRefundRequest;
import com.github.binarywang.wxpay.bean.result.WxPayRefundResult;
import com.github.binarywang.wxpay.exception.WxPayException;
import com.github.binarywang.wxpay.service.WxPayService;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.notify.NotifyService;
import org.linlinjava.litemall.core.notify.NotifyType;
import org.linlinjava.litemall.core.util.DateTimeUtil;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.*;
import org.linlinjava.litemall.db.service.*;
import org.linlinjava.litemall.db.util.CouponUserConstant;
import org.linlinjava.litemall.db.util.OrderUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.linlinjava.litemall.admin.util.AdminResponseCode.*;
import static org.linlinjava.litemall.admin.util.AdminResponseCode.ORDER_PAY_FAILED;

@Service

public class AdminOrderService {
    private final Log logger = LogFactory.getLog(AdminOrderService.class);

    @Autowired
    private LitemallOrderGoodsService orderGoodsService;
    @Autowired
    private LitemallOrderService orderService;
    @Autowired
    private LitemallGoodsProductService productService;
    @Autowired
    private LitemallUserService userService;
    @Autowired
    private WxPayService wxPayService;
    @Autowired
    private NotifyService notifyService;
    @Autowired
    private LogHelper logHelper;
    @Autowired
    private LitemallCouponUserService couponUserService;

    public Object list(String nickname, String consignee, String orderSn, LocalDateTime start, LocalDateTime end,
            List<Short> orderStatusArray, String deliveryType,
            Integer page, Integer limit, String sort, String order) {
        Map<String, Object> data = (Map) orderService.queryVoSelective(nickname, consignee, orderSn, start, end,
                orderStatusArray, deliveryType, page, limit, sort, order);
        return ResponseUtil.ok(data);
    }

    public Object statusOverview() {
        return ResponseUtil.ok(orderService.getOrderStatusCounts());
    }

    public Object detail(Integer id) {
        LitemallOrder order = orderService.findById(id);
        List<LitemallOrderGoods> orderGoods = orderGoodsService.queryByOid(id);
        UserVo user = userService.findUserVoById(order.getUserId());
        Map<String, Object> data = new HashMap<>();
        data.put("order", order);
        data.put("orderGoods", orderGoods);
        data.put("user", user);

        return ResponseUtil.ok(data);
    }

    /**
     * 订单退款
     * <p>
     * 1. 检测当前订单是否能够退款;
     * 2. 微信退款操作;
     * 3. 设置订单退款确认状态；
     * 4. 订单商品库存回库。
     * <p>
     * TODO
     * 虽然接入了微信退款API，但是从安全角度考虑，建议开发者删除这里微信退款代码，采用以下两步走步骤：
     * 1. 管理员登录微信官方支付平台点击退款操作进行退款
     * 2. 管理员登录litemall管理后台点击退款操作进行订单状态修改和商品库存回库
     *
     * @param body 订单信息，{ orderId：xxx }
     * @return 订单退款操作结果
     */
    @Transactional
    public Object refund(String body) {
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        String refundMoney = JacksonUtil.parseString(body, "refundMoney");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }
        if (StringUtils.isEmpty(refundMoney)) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        if (order.getActualPrice().compareTo(new BigDecimal(refundMoney)) != 0) {
            return ResponseUtil.badArgumentValue();
        }

        // 如果订单不是退款状态，则不能退款
        if (!order.getOrderStatus().equals(OrderUtil.STATUS_REFUND)) {
            return ResponseUtil.fail(ORDER_CONFIRM_NOT_ALLOWED, "订单不能确认收货");
        }

        // 微信退款
        WxPayRefundRequest wxPayRefundRequest = new WxPayRefundRequest();
        wxPayRefundRequest.setOutTradeNo(order.getOrderSn());
        wxPayRefundRequest.setOutRefundNo("refund_" + order.getOrderSn());
        // 元转成分
        Integer totalFee = order.getActualPrice().multiply(new BigDecimal(100)).intValue();
        wxPayRefundRequest.setTotalFee(totalFee);
        wxPayRefundRequest.setRefundFee(totalFee);

        WxPayRefundResult wxPayRefundResult;
        try {
            wxPayRefundResult = wxPayService.refund(wxPayRefundRequest);
        } catch (WxPayException e) {
            logger.error(e.getMessage(), e);
            return ResponseUtil.fail(ORDER_REFUND_FAILED, "订单退款失败");
        }
        if (!wxPayRefundResult.getReturnCode().equals("SUCCESS")) {
            logger.warn("refund fail: " + wxPayRefundResult.getReturnMsg());
            return ResponseUtil.fail(ORDER_REFUND_FAILED, "订单退款失败");
        }
        if (!wxPayRefundResult.getResultCode().equals("SUCCESS")) {
            logger.warn("refund fail: " + wxPayRefundResult.getReturnMsg());
            return ResponseUtil.fail(ORDER_REFUND_FAILED, "订单退款失败");
        }

        LocalDateTime now = LocalDateTime.now();
        // 设置订单取消状态
        order.setOrderStatus(OrderUtil.STATUS_REFUND_CONFIRM);
        order.setEndTime(now);
        // 记录订单退款相关信息
        order.setRefundAmount(order.getActualPrice());
        order.setRefundType("微信退款接口");
        order.setRefundContent(wxPayRefundResult.getRefundId());
        order.setRefundTime(now);
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            throw new RuntimeException("更新数据已失效");
        }

        // 商品货品数量增加
        List<LitemallOrderGoods> orderGoodsList = orderGoodsService.queryByOid(orderId);
        for (LitemallOrderGoods orderGoods : orderGoodsList) {
            Integer productId = orderGoods.getProductId();
            Short number = orderGoods.getNumber();
            if (productService.addStock(productId, number) == 0) {
                throw new RuntimeException("商品货品库存增加失败");
            }
        }

        // 返还优惠券
        List<LitemallCouponUser> couponUsers = couponUserService.findByOid(orderId);
        for (LitemallCouponUser couponUser : couponUsers) {
            // 优惠券状态设置为可使用
            couponUser.setStatus(CouponUserConstant.STATUS_USABLE);
            couponUser.setUpdateTime(LocalDateTime.now());
            couponUserService.update(couponUser);
        }

        // TODO 发送邮件和短信通知，这里采用异步发送
        // 退款成功通知用户, 例如“您申请的订单退款 [ 单号:{1} ] 已成功，请耐心等待到账。”
        // 注意订单号只发后6位
        notifyService.notifySmsTemplate(order.getMobile(), NotifyType.REFUND,
                new String[] { order.getOrderSn().substring(8, 14) });

        logHelper.logOrderSucceed("退款", "订单编号 " + order.getOrderSn());
        return ResponseUtil.ok();
    }

    /**
     * 发货
     * 1. 检测当前订单是否能够发货
     * 2. 设置订单发货状态
     *
     * @param body 订单信息，{ orderId：xxx, shipSn: xxx, shipChannel: xxx }
     * @return 订单操作结果
     *         成功则 { errno: 0, errmsg: '成功' }
     *         失败则 { errno: XXX, errmsg: XXX }
     */
    public Object ship(String body) {
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        String shipSn = JacksonUtil.parseString(body, "shipSn");
        String shipChannel = JacksonUtil.parseString(body, "shipChannel");
        if (orderId == null || shipSn == null || shipChannel == null) {
            return ResponseUtil.badArgument();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        // 如果订单不是已付款状态，则不能发货
        if (!order.getOrderStatus().equals(OrderUtil.STATUS_PAY)) {
            return ResponseUtil.fail(ORDER_CONFIRM_NOT_ALLOWED, "订单不能确认收货");
        }

        order.setOrderStatus(OrderUtil.STATUS_SHIP);
        order.setShipSn(shipSn);
        order.setShipChannel(shipChannel);
        order.setShipTime(LocalDateTime.now());
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }

        // TODO 发送邮件和短信通知，这里采用异步发送
        // 发货会发送通知短信给用户: *
        // "您的订单已经发货，快递公司 {1}，快递单 {2} ，请注意查收"
        notifyService.notifySmsTemplate(order.getMobile(), NotifyType.SHIP, new String[] { shipChannel, shipSn });

        // 微信订阅消息通知发货
        try {
            LitemallUser user = userService.findById(order.getUserId());
            if (user != null && user.getWeixinOpenid() != null) {
                Map<String, String> wxData = new HashMap<>();
                wxData.put("character_string1", order.getOrderSn());
                wxData.put("thing3", shipChannel);
                wxData.put("character_string4", shipSn);
                notifyService.notifyWxSubscribeMsg(user.getWeixinOpenid(), NotifyType.SHIP, wxData);
            }
        } catch (Exception e) {
            logger.warn("微信订阅消息发货通知失败: " + e.getMessage());
        }

        // 企微推送发货通知（需要用户绑定企微外部联系人ID后才可用）
        // TODO: 后续可在用户表中添加 we_work_external_user_id 字段后启用
        // try {
        //     UserVo user = userService.findUserVoById(order.getUserId());
        //     if (user != null && user.getWeWorkExternalUserId() != null) {
        //         weWorkService.sendShipNotification(
        //                 user.getWeWorkExternalUserId(),
        //                 order.getOrderSn(),
        //                 shipChannel,
        //                 shipSn);
        //     }
        // } catch (Exception e) {
        //     logger.warn("企微推送发货通知失败: " + e.getMessage());
        // }

        logHelper.logOrderSucceed("发货", "订单编号 " + order.getOrderSn());
        return ResponseUtil.ok();
    }

    /**
     * 删除订单
     * 1. 检测当前订单是否能够删除
     * 2. 删除订单
     *
     * @param body 订单信息，{ orderId：xxx }
     * @return 订单操作结果
     *         成功则 { errno: 0, errmsg: '成功' }
     *         失败则 { errno: XXX, errmsg: XXX }
     */
    public Object delete(String body) {
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }

        // 如果订单不是关闭状态(已取消、系统取消、已退款、用户已确认、系统已确认)，则不能删除
        Short status = order.getOrderStatus();
        if (!status.equals(OrderUtil.STATUS_CANCEL) && !status.equals(OrderUtil.STATUS_AUTO_CANCEL) &&
                !status.equals(OrderUtil.STATUS_CONFIRM) && !status.equals(OrderUtil.STATUS_AUTO_CONFIRM) &&
                !status.equals(OrderUtil.STATUS_REFUND_CONFIRM)) {
            return ResponseUtil.fail(ORDER_DELETE_FAILED, "订单不能删除");
        }
        // 删除订单
        orderService.deleteById(orderId);
        // 删除订单商品
        orderGoodsService.deleteByOrderId(orderId);
        logHelper.logOrderSucceed("删除", "订单编号 " + order.getOrderSn());
        return ResponseUtil.ok();
    }

    /**
     * 回复订单商品（已废弃，评价功能已移除）
     *
     * @param body 订单信息，{ orderId：xxx }
     * @return 订单操作结果
     */
    public Object reply(String body) {
        return ResponseUtil.fail(501, "评价功能已下线");
    }

    public Object pay(String body) {
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        String newMoney = JacksonUtil.parseString(body, "newMoney");

        if (orderId == null || StringUtils.isEmpty(newMoney)) {
            return ResponseUtil.badArgument();
        }
        BigDecimal actualPrice = new BigDecimal(newMoney);

        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }
        if (!order.getOrderStatus().equals(OrderUtil.STATUS_CREATE)) {
            return ResponseUtil.fail(ORDER_PAY_FAILED, "当前订单状态不支持线下收款");
        }

        order.setActualPrice(actualPrice);
        order.setOrderStatus(OrderUtil.STATUS_PAY);
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return WxPayNotifyResponse.fail("更新数据已失效");
        }

        return ResponseUtil.ok();
    }

    @Transactional
    public Object verify(String body) {
        Integer orderId = JacksonUtil.parseInteger(body, "orderId");
        if (orderId == null) {
            return ResponseUtil.badArgument();
        }
        LitemallOrder order = orderService.findById(orderId);
        if (order == null) {
            return ResponseUtil.badArgument();
        }
        if (!order.getOrderStatus().equals(OrderUtil.STATUS_VERIFY_PENDING)) {
            return ResponseUtil.fail(ORDER_CONFIRM_NOT_ALLOWED, "订单不能确认收货");
        }
        order.setOrderStatus(OrderUtil.STATUS_VERIFIED);
        order.setEndTime(LocalDateTime.now());
        if (orderService.updateWithOptimisticLocker(order) == 0) {
            return ResponseUtil.updatedDateExpired();
        }
        logHelper.logOrderSucceed("核销", "订单编号 " + order.getOrderSn());
        return ResponseUtil.ok();
    }
}
