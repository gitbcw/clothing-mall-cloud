package org.linlinjava.litemall.wx.web;

import org.linlinjava.litemall.core.express.ExpressService;
import org.linlinjava.litemall.core.express.dao.ExpressInfo;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.domain.LitemallOrder;
import org.linlinjava.litemall.db.service.LitemallOrderService;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;

@RestController
@RequestMapping("/wx/express")
public class WxExpressController {

    @Autowired
    private LitemallOrderService orderService;
    @Autowired
    private ExpressService expressService;

    /**
     * 物流查询
     * 通过订单ID查询物流轨迹
     */
    @GetMapping("query")
    public Object query(@LoginUser Integer userId, @NotNull Integer orderId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        LitemallOrder order = orderService.findById(orderId);
        if (order == null || !order.getUserId().equals(userId)) {
            return ResponseUtil.badArgumentValue();
        }

        // 未发货的订单没有物流信息
        if (order.getShipChannel() == null || order.getShipSn() == null) {
            return ResponseUtil.fail(700, "订单尚未发货");
        }

        String customerName = null;
        String mobile = order.getMobile();
        if (mobile != null && mobile.length() >= 4) {
            customerName = mobile.substring(mobile.length() - 4);
        }
        ExpressInfo expressInfo = expressService.getExpressInfo(order.getShipChannel(), order.getShipSn(), customerName);
        if (expressInfo == null) {
            return ResponseUtil.fail(701, "物流信息查询失败，请稍后重试");
        }

        return ResponseUtil.ok(expressInfo);
    }
}
