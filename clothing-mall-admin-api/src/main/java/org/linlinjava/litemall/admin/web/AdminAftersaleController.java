package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.admin.service.LogHelper;
import org.linlinjava.litemall.admin.util.AdminResponseCode;
import org.linlinjava.litemall.core.notify.NotifyService;
import org.linlinjava.litemall.core.notify.NotifyType;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.LitemallAftersale;
import org.linlinjava.litemall.db.domain.LitemallOrder;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.*;
import org.linlinjava.litemall.db.util.AftersaleConstant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 售后管理控制器
 *
 * 改造说明：售后改为"只换不退"
 * - refund 方法改为 ship 方法（换货发货）
 * - 移除微信退款逻辑
 */
@RestController
@RequestMapping("/admin/aftersale")
@Validated
public class AdminAftersaleController {
    private final Log logger = LogFactory.getLog(AdminAftersaleController.class);

    @Autowired
    private LitemallAftersaleService aftersaleService;
    @Autowired
    private LitemallOrderService orderService;
    @Autowired
    private LitemallOrderGoodsService orderGoodsService;
    @Autowired
    private LitemallUserService userService;
    @Autowired
    private NotifyService notifyService;
    @Autowired
    private LogHelper logHelper;

    @RequiresPermissions("admin:aftersale:list")
    @RequiresPermissionsDesc(menu = {"商城管理", "售后管理"}, button = "查询")
    @GetMapping("/list")
    public Object list(Integer orderId, String aftersaleSn, Short status,
                       @RequestParam(required = false) List<Short> statusArray,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer limit,
                       @Sort @RequestParam(defaultValue = "add_time") String sort,
                       @Order @RequestParam(defaultValue = "desc") String order) {
        List<LitemallAftersale> aftersaleList = aftersaleService.querySelective(orderId, aftersaleSn, status, statusArray, page, limit, sort, order);
        return ResponseUtil.okList(aftersaleList);
    }

    @GetMapping("/overview")
    public Object overview() {
        return ResponseUtil.ok(aftersaleService.getAftersaleStatusCounts());
    }

    @RequiresPermissions("admin:aftersale:recept")
    @RequiresPermissionsDesc(menu = {"商城管理", "售后管理"}, button = "审核通过")
    @PostMapping("/recept")
    public Object recept(@RequestBody LitemallAftersale aftersale) {
        Integer id = aftersale.getId();
        LitemallAftersale aftersaleOne = aftersaleService.findById(id);
        if(aftersaleOne == null){
            return ResponseUtil.fail(AdminResponseCode.AFTERSALE_NOT_ALLOWED, "售后不存在");
        }
        Short status = aftersaleOne.getStatus();
        if(!status.equals(AftersaleConstant.STATUS_REQUEST)){
            return ResponseUtil.fail(AdminResponseCode.AFTERSALE_NOT_ALLOWED, "售后不能进行审核通过操作");
        }
        aftersaleOne.setStatus(AftersaleConstant.STATUS_RECEPT);
        aftersaleOne.setHandleTime(LocalDateTime.now());
        aftersaleService.updateById(aftersaleOne);

        // 订单也要更新售后状态
        orderService.updateAftersaleStatus(aftersaleOne.getOrderId(), AftersaleConstant.STATUS_RECEPT);

        // 发送短信通知用户：换货审核通过
        // 注意：需要在短信平台申请专用模板，模板示例："您的换货申请已审核通过，售后编号{1}，请等待发货。"
        // 目前暂时只记录日志，不发送短信（因为参数与现有模板不匹配）
        LitemallOrder order = orderService.findById(aftersaleOne.getOrderId());
        if (order != null) {
            LitemallUser user = userService.findById(order.getUserId());
            if (user != null && user.getMobile() != null) {
                // 暂时注释，待申请专用短信模板后启用
                // notifyService.notifySmsTemplate(user.getMobile(), NotifyType.AFTERSALE_RECEPT,
                //         new String[]{aftersaleOne.getAftersaleSn()});
                logger.info("换货审核通过通知: 用户手机=" + user.getMobile() + ", 售后编号=" + aftersaleOne.getAftersaleSn());
            }
        }

        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:aftersale:batch-recept")
    @RequiresPermissionsDesc(menu = {"商城管理", "售后管理"}, button = "批量通过")
    @PostMapping("/batch-recept")
    public Object batchRecept(@RequestBody String body) {
        List<Integer> ids = JacksonUtil.parseIntegerList(body, "ids");
        for(Integer id : ids) {
            LitemallAftersale aftersale = aftersaleService.findById(id);
            if(aftersale == null){
                continue;
            }
            Short status = aftersale.getStatus();
            if(!status.equals(AftersaleConstant.STATUS_REQUEST)){
                continue;
            }
            aftersale.setStatus(AftersaleConstant.STATUS_RECEPT);
            aftersale.setHandleTime(LocalDateTime.now());
            aftersaleService.updateById(aftersale);

            // 订单也要更新售后状态
            orderService.updateAftersaleStatus(aftersale.getOrderId(), AftersaleConstant.STATUS_RECEPT);
        }
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:aftersale:reject")
    @RequiresPermissionsDesc(menu = {"商城管理", "售后管理"}, button = "审核拒绝")
    @PostMapping("/reject")
    public Object reject(@RequestBody LitemallAftersale aftersale) {
        Integer id = aftersale.getId();
        LitemallAftersale aftersaleOne = aftersaleService.findById(id);
        if(aftersaleOne == null){
            return ResponseUtil.badArgumentValue();
        }
        Short status = aftersaleOne.getStatus();
        if(!status.equals(AftersaleConstant.STATUS_REQUEST)){
            return ResponseUtil.fail(AdminResponseCode.AFTERSALE_NOT_ALLOWED, "售后不能进行审核拒绝操作");
        }
        aftersaleOne.setStatus(AftersaleConstant.STATUS_REJECT);
        aftersaleOne.setHandleTime(LocalDateTime.now());
        aftersaleService.updateById(aftersaleOne);

        // 订单也要更新售后状态
        orderService.updateAftersaleStatus(aftersaleOne.getOrderId(), AftersaleConstant.STATUS_REJECT);
        return ResponseUtil.ok();
    }

    @RequiresPermissions("admin:aftersale:batch-reject")
    @RequiresPermissionsDesc(menu = {"商城管理", "售后管理"}, button = "批量拒绝")
    @PostMapping("/batch-reject")
    public Object batchReject(@RequestBody String body) {
        List<Integer> ids = JacksonUtil.parseIntegerList(body, "ids");
        for(Integer id : ids) {
            LitemallAftersale aftersale = aftersaleService.findById(id);
            if(aftersale == null){
                continue;
            }
            Short status = aftersale.getStatus();
            if(!status.equals(AftersaleConstant.STATUS_REQUEST)){
                continue;
            }
            aftersale.setStatus(AftersaleConstant.STATUS_REJECT);
            aftersale.setHandleTime(LocalDateTime.now());
            aftersaleService.updateById(aftersale);

            // 订单也要更新售后状态
            orderService.updateAftersaleStatus(aftersale.getOrderId(), AftersaleConstant.STATUS_REJECT);
        }
        return ResponseUtil.ok();
    }

    /**
     * 换货发货
     *
     * 管理员审核通过后，进行换货发货操作
     * 需要填写换货的快递单号和快递公司
     *
     * @param body 包含 aftersaleId, shipSn, shipChannel
     * @return 操作结果
     */
    @RequiresPermissions("admin:aftersale:ship")
    @RequiresPermissionsDesc(menu = {"商城管理", "售后管理"}, button = "换货发货")
    @PostMapping("/ship")
    public Object ship(@RequestBody String body) {
        Integer id = JacksonUtil.parseInteger(body, "id");
        String shipSn = JacksonUtil.parseString(body, "shipSn");
        String shipChannel = JacksonUtil.parseString(body, "shipChannel");

        if(id == null || shipSn == null || shipChannel == null){
            return ResponseUtil.badArgument();
        }

        LitemallAftersale aftersale = aftersaleService.findById(id);
        if(aftersale == null){
            return ResponseUtil.badArgumentValue();
        }
        if(!aftersale.getStatus().equals(AftersaleConstant.STATUS_RECEPT)){
            return ResponseUtil.fail(AdminResponseCode.AFTERSALE_NOT_ALLOWED, "售后不能进行换货发货操作，请先审核通过");
        }

        // 更新售后记录
        aftersale.setStatus(AftersaleConstant.STATUS_SHIPPED);
        aftersale.setHandleTime(LocalDateTime.now());
        // 记录换货发货信息（使用已有的字段）
        aftersaleService.updateById(aftersale);

        // 更新订单售后状态
        orderService.updateAftersaleStatus(aftersale.getOrderId(), AftersaleConstant.STATUS_SHIPPED);

        // 发送短信通知用户：换货已发货
        // 模板示例："您的换货商品已发货，快递公司{1}，快递单号{2}，请注意查收。"
        LitemallOrder order = orderService.findById(aftersale.getOrderId());
        if (order != null) {
            LitemallUser user = userService.findById(order.getUserId());
            if (user != null && user.getMobile() != null) {
                notifyService.notifySmsTemplate(user.getMobile(), NotifyType.AFTERSALE_SHIP,
                        new String[]{shipChannel, shipSn});
            }
        }

        logHelper.logOrderSucceed("换货发货", "售后编号 " + aftersale.getAftersaleSn() + " 快递公司 " + shipChannel + " 快递单号 " + shipSn);
        return ResponseUtil.ok();
    }

    /**
     * 换货完成
     *
     * 用户确认收到换货商品后，标记售后完成
     *
     * @param body 包含 aftersaleId
     * @return 操作结果
     */
    @RequiresPermissions("admin:aftersale:complete")
    @RequiresPermissionsDesc(menu = {"商城管理", "售后管理"}, button = "换货完成")
    @PostMapping("/complete")
    public Object complete(@RequestBody String body) {
        Integer id = JacksonUtil.parseInteger(body, "id");

        if(id == null){
            return ResponseUtil.badArgument();
        }

        LitemallAftersale aftersale = aftersaleService.findById(id);
        if(aftersale == null){
            return ResponseUtil.badArgumentValue();
        }
        if(!aftersale.getStatus().equals(AftersaleConstant.STATUS_SHIPPED)){
            return ResponseUtil.fail(AdminResponseCode.AFTERSALE_NOT_ALLOWED, "售后不能进行完成操作，请先换货发货");
        }

        // 更新售后记录
        aftersale.setStatus(AftersaleConstant.STATUS_COMPLETED);
        aftersale.setHandleTime(LocalDateTime.now());
        aftersaleService.updateById(aftersale);

        // 更新订单售后状态
        orderService.updateAftersaleStatus(aftersale.getOrderId(), AftersaleConstant.STATUS_COMPLETED);

        logHelper.logOrderSucceed("换货完成", "售后编号 " + aftersale.getAftersaleSn());
        return ResponseUtil.ok();
    }
}
