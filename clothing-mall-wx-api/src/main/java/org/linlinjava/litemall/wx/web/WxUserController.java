package org.linlinjava.litemall.wx.web;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.util.ResponseUtil;
import org.linlinjava.litemall.db.dao.LitemallOrderMapper;
import org.linlinjava.litemall.db.domain.LitemallOrder;
import org.linlinjava.litemall.db.domain.LitemallOrderExample;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.LitemallOrderService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.db.service.CouponAssignService;
import org.linlinjava.litemall.db.domain.LitemallCoupon;
import org.linlinjava.litemall.db.service.LitemallCouponService;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.db.util.OrderUtil;
import org.linlinjava.litemall.wx.annotation.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * 用户服务
 */
@RestController
@RequestMapping("/wx/user")
@Validated
public class WxUserController {
    private final Log logger = LogFactory.getLog(WxUserController.class);

    @Autowired
    private LitemallUserService userService;

    @Autowired
    private LitemallOrderService orderService;

    @Autowired
    private LitemallOrderMapper orderMapper;

    @Autowired
    private CouponAssignService couponAssignService;

    @Autowired
    private LitemallCouponService couponService;

    /**
     * 用户首页数据（订单统计）
     */
    @GetMapping("index")
    public Object index(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        long unpaid = countByStatus(userId, Collections.singletonList(OrderUtil.STATUS_CREATE));
        long unship = countByStatus(userId, Collections.singletonList(OrderUtil.STATUS_PAY));
        long unrecv = countByStatus(userId, Arrays.asList(OrderUtil.STATUS_SHIP, OrderUtil.STATUS_VERIFY_PENDING));

        Map<String, Object> order = new HashMap<>();
        order.put("unpaid", unpaid);
        order.put("unship", unship);
        order.put("unrecv", unrecv);

        Map<String, Object> data = new HashMap<>();
        data.put("order", order);
        return ResponseUtil.ok(data);
    }

    private long countByStatus(Integer userId, java.util.List<Short> statusList) {
        LitemallOrderExample example = new LitemallOrderExample();
        example.or().andUserIdEqualTo(userId).andOrderStatusIn(statusList).andDeletedEqualTo(false);
        return orderMapper.countByExample(example);
    }

    /**
     * 获取当前用户信息（包括角色）
     *
     * @param userId 用户ID
     * @return 用户信息
     */
    @GetMapping("info")
    public Object info(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }

        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("nickname", user.getNickname());
        data.put("avatar", user.getAvatar());
        data.put("mobile", user.getMobile());
        data.put("birthday", user.getBirthday());
        data.put("role", user.getRole() != null ? user.getRole() : "user");
        data.put("storeId", user.getStoreId());
        data.put("guideId", user.getGuideId());

        return ResponseUtil.ok(data);
    }

    /**
     * 更新用户信息
     *
     * @param userId 用户ID
     * @param body 用户信息
     * @return 操作结果
     */
    @PostMapping("profile")
    public Object profile(@LoginUser Integer userId, @RequestBody Map<String, Object> body) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }

        // 记录生日是否首次填写
        boolean birthdayFirstFill = false;
        java.time.LocalDate oldBirthday = user.getBirthday();

        if (body.containsKey("nickname")) {
            user.setNickname((String) body.get("nickname"));
        }
        if (body.containsKey("avatar")) {
            user.setAvatar((String) body.get("avatar"));
        }
        if (body.containsKey("birthday")) {
            String birthdayStr = (String) body.get("birthday");
            if (birthdayStr != null && !birthdayStr.isEmpty()) {
                user.setBirthday(java.time.LocalDate.parse(birthdayStr));
                // 生日从 null 变为有值，标记为首次填写
                if (oldBirthday == null) {
                    birthdayFirstFill = true;
                }
            }
        }

        if (userService.updateById(user) == 0) {
            return ResponseUtil.updatedDataFailed();
        }

        // 首次填写生日，自动发放生日优惠券
        Map<String, Object> couponInfo = null;
        if (birthdayFirstFill && SystemConfig.isBirthdayCouponEnabled()) {
            Integer couponId = SystemConfig.getBirthdayCouponId();
            Integer days = SystemConfig.getBirthdayCouponDays();
            if (couponId != null) {
                couponAssignService.assignForBirthday(userId, couponId, days);
                LitemallCoupon coupon = couponService.findById(couponId);
                if (coupon != null) {
                    couponInfo = new HashMap<>();
                    couponInfo.put("name", coupon.getName());
                    couponInfo.put("discount", coupon.getDiscount());
                    couponInfo.put("discountType", coupon.getDiscountType());
                    couponInfo.put("desc", coupon.getDesc());
                    couponInfo.put("tag", coupon.getTag());
                }
            }
        }

        Map<String, Object> data = new HashMap<>();
        if (couponInfo != null) {
            data.put("coupon", couponInfo);
        }
        return ResponseUtil.ok(data);
    }

    /**
     * 获取当前用户角色
     *
     * @param userId 用户ID
     * @return 用户角色
     */
    @GetMapping("role")
    public Object getRole(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }

        String role = user.getRole();
        if (role == null || role.isEmpty()) {
            role = "user";
        }

        Map<String, Object> data = new HashMap<>();
        data.put("role", role);
        data.put("isOwner", "owner".equals(role));
        data.put("isGuide", "guide".equals(role));
        data.put("isManager", "owner".equals(role) || "guide".equals(role));

        return ResponseUtil.ok(data);
    }

    /**
     * 检查用户是否有管理权限
     *
     * @param userId 用户ID
     * @return 是否有管理权限
     */
    @GetMapping("isManager")
    public Object isManager(@LoginUser Integer userId) {
        if (userId == null) {
            return ResponseUtil.unlogin();
        }

        LitemallUser user = userService.findById(userId);
        if (user == null) {
            return ResponseUtil.badArgumentValue();
        }

        String role = user.getRole();
        boolean isManager = "owner".equals(role) || "guide".equals(role);

        Map<String, Object> data = new HashMap<>();
        data.put("isManager", isManager);
        data.put("role", role != null ? role : "user");

        return ResponseUtil.ok(data);
    }
}
