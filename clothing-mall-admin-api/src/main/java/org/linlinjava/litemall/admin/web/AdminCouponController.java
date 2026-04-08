package org.linlinjava.litemall.admin.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authz.annotation.RequiresPermissions;
import org.linlinjava.litemall.admin.annotation.RequiresPermissionsDesc;
import org.linlinjava.litemall.core.util.JacksonUtil;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.core.validator.Order;
import org.linlinjava.litemall.core.validator.Sort;
import org.linlinjava.litemall.db.domain.LitemallCoupon;
import org.linlinjava.litemall.db.domain.LitemallCouponUser;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.CouponAssignService;
import org.linlinjava.litemall.db.service.LitemallCouponService;
import org.linlinjava.litemall.db.service.LitemallCouponUserService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.db.util.CouponConstant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.constraints.NotNull;
import java.util.List;

@RestController
@RequestMapping("/admin/coupon")
@Validated
public class AdminCouponController {
    private final Log logger = LogFactory.getLog(AdminCouponController.class);

    @Autowired
    private LitemallCouponService couponService;
    @Autowired
    private LitemallCouponUserService couponUserService;
    @Autowired
    private LitemallUserService userService;
    @Autowired
    private CouponAssignService couponAssignService;

    @RequiresPermissions("admin:coupon:list")
    @RequiresPermissionsDesc(menu = {"推广管理", "优惠券管理"}, button = "查询")
    @GetMapping("/list")
    public Object list(String name, Short type, Short status,
                       @RequestParam(defaultValue = "1") Integer page,
                       @RequestParam(defaultValue = "10") Integer limit,
                       @Sort @RequestParam(defaultValue = "add_time") String sort,
                       @Order @RequestParam(defaultValue = "desc") String order) {
        List<LitemallCoupon> couponList = couponService.querySelective(name, type, status, page, limit, sort, order);
        return ResponseUtil.okList(couponList);
    }

    @RequiresPermissions("admin:coupon:listuser")
    @RequiresPermissionsDesc(menu = {"推广管理", "优惠券管理"}, button = "查询用户")
    @GetMapping("/listuser")
    public Object listuser(Integer userId, Integer couponId, Short status,
                           @RequestParam(defaultValue = "1") Integer page,
                           @RequestParam(defaultValue = "10") Integer limit,
                           @Sort @RequestParam(defaultValue = "add_time") String sort,
                           @Order @RequestParam(defaultValue = "desc") String order) {
        List<LitemallCouponUser> couponList = couponUserService.queryList(userId, couponId, status, page,
                limit, sort, order);
        return ResponseUtil.okList(couponList);
    }

    private Object validate(LitemallCoupon coupon) {
        String name = coupon.getName();
        if (StringUtils.isEmpty(name)) {
            return ResponseUtil.badArgument();
        }
        return null;
    }

    @RequiresPermissions("admin:coupon:create")
    @RequiresPermissionsDesc(menu = {"推广管理", "优惠券管理"}, button = "添加")
    @PostMapping("/create")
    public Object create(@RequestBody LitemallCoupon coupon) {
        Object error = validate(coupon);
        if (error != null) {
            return error;
        }

        // 如果是兑换码类型，则这里需要生存一个兑换码
        if (coupon.getType().equals(CouponConstant.TYPE_CODE)) {
            String code = couponService.generateCode();
            coupon.setCode(code);
        }

        couponService.add(coupon);
        return ResponseUtil.ok(coupon);
    }

    @RequiresPermissions("admin:coupon:read")
    @RequiresPermissionsDesc(menu = {"推广管理", "优惠券管理"}, button = "详情")
    @GetMapping("/read")
    public Object read(@NotNull Integer id) {
        LitemallCoupon coupon = couponService.findById(id);
        return ResponseUtil.ok(coupon);
    }

    @RequiresPermissions("admin:coupon:update")
    @RequiresPermissionsDesc(menu = {"推广管理", "优惠券管理"}, button = "编辑")
    @PostMapping("/update")
    public Object update(@RequestBody LitemallCoupon coupon) {
        Object error = validate(coupon);
        if (error != null) {
            return error;
        }
        if (couponService.updateById(coupon) == 0) {
            return ResponseUtil.updatedDataFailed();
        }
        return ResponseUtil.ok(coupon);
    }

    @RequiresPermissions("admin:coupon:delete")
    @RequiresPermissionsDesc(menu = {"推广管理", "优惠券管理"}, button = "删除")
    @PostMapping("/delete")
    public Object delete(@RequestBody LitemallCoupon coupon) {
        couponService.deleteById(coupon.getId());
        return ResponseUtil.ok();
    }

    /**
     * 手动发放优惠券给指定用户
     *
     * @param body 包含 userId 和 couponId
     * @return 操作结果
     */
    @RequiresPermissions("admin:coupon:assign")
    @RequiresPermissionsDesc(menu = {"推广管理", "优惠券管理"}, button = "发放优惠券")
    @PostMapping("/assign")
    public Object assign(@RequestBody String body) {
        Integer userId = JacksonUtil.parseInteger(body, "userId");
        Integer couponId = JacksonUtil.parseInteger(body, "couponId");

        if (userId == null) {
            return ResponseUtil.badArgument();
        }
        if (couponId == null) {
            return ResponseUtil.badArgument();
        }

        // 检查用户是否存在
        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.fail(404, "用户不存在");
        }

        // 检查优惠券是否存在
        LitemallCoupon coupon = couponService.findById(couponId);
        if (coupon == null) {
            return ResponseUtil.fail(404, "优惠券不存在");
        }

        // 检查优惠券状态
        if (!coupon.getStatus().equals(CouponConstant.STATUS_NORMAL)) {
            return ResponseUtil.fail(402, "优惠券已过期或已下架");
        }

        // 发放优惠券
        assignCouponToUser(userId, coupon);

        logger.info("管理员手动发放优惠券成功，用户ID: " + userId + "，优惠券ID: " + couponId);
        return ResponseUtil.ok();
    }

    /**
     * 发放优惠券给用户的内部方法
     */
    private void assignCouponToUser(Integer userId, LitemallCoupon coupon) {
        Integer couponId = coupon.getId();

        // 检查是否已发放过
        Integer count = couponUserService.countUserAndCoupon(userId, couponId);
        if (count > 0) {
            // 如果允许重复发放，可以跳过这个检查
            // 这里选择允许重复发放，因为管理员手动发放可能有特殊需求
        }

        Short limit = coupon.getLimit();
        if (limit == null || limit <= 0) {
            limit = 1;
        }

        // 发放优惠券（只发放一张）
        LitemallCouponUser couponUser = new LitemallCouponUser();
        couponUser.setCouponId(couponId);
        couponUser.setUserId(userId);
        Short timeType = coupon.getTimeType();
        if (timeType != null && timeType.equals(CouponConstant.TIME_TYPE_TIME)) {
            couponUser.setStartTime(coupon.getStartTime());
            couponUser.setEndTime(coupon.getEndTime());
        } else {
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            couponUser.setStartTime(now);
            Short days = coupon.getDays();
            if (days == null || days <= 0) {
                days = 30; // 默认30天有效期
            }
            couponUser.setEndTime(now.plusDays(days));
        }
        couponUserService.add(couponUser);
    }

}
