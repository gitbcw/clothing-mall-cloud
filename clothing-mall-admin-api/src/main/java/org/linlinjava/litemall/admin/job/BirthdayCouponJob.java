package org.linlinjava.litemall.admin.job;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.linlinjava.litemall.core.system.SystemConfig;
import org.linlinjava.litemall.db.domain.LitemallCoupon;
import org.linlinjava.litemall.db.domain.LitemallCouponUser;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.service.CouponAssignService;
import org.linlinjava.litemall.db.service.LitemallCouponService;
import org.linlinjava.litemall.db.service.LitemallCouponUserService;
import org.linlinjava.litemall.db.service.LitemallUserService;
import org.linlinjava.litemall.db.util.CouponConstant;
import org.linlinjava.litemall.db.util.CouponUserConstant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 生日优惠券定时任务
 * 每日凌晨 0:30 执行，为当天生日的用户发放生日优惠券
 */
@Component
public class BirthdayCouponJob {
    private final Log logger = LogFactory.getLog(BirthdayCouponJob.class);

    @Autowired
    private LitemallUserService userService;
    @Autowired
    private LitemallCouponService couponService;
    @Autowired
    private LitemallCouponUserService couponUserService;
    @Autowired
    private CouponAssignService couponAssignService;

    /**
     * 每日凌晨 0:30 执行
     */
    @Scheduled(cron = "0 30 0 * * ?")
    public void checkBirthdayAndAssignCoupon() {
        logger.info("系统开启任务检查用户生日并发放优惠券");

        // 检查是否启用生日券
        if (!SystemConfig.isBirthdayCouponEnabled()) {
            logger.info("生日券功能未启用，跳过执行");
            return;
        }

        // 获取生日券模板ID
        Integer couponId = SystemConfig.getBirthdayCouponId();
        if (couponId == null) {
            logger.warn("未配置生日券模板ID，跳过执行");
            return;
        }

        // 检查优惠券是否存在
        LitemallCoupon coupon = couponService.findById(couponId);
        if (coupon == null || coupon.getStatus().equals(CouponConstant.STATUS_EXPIRED)) {
            logger.warn("生日券模板不存在或已过期，跳过执行");
            return;
        }

        // 获取当前日期
        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int day = today.getDayOfMonth();

        // 查询当天生日的用户
        List<LitemallUser> birthdayUsers = userService.queryByBirthday(month, day);
        logger.info("找到 " + birthdayUsers.size() + " 位今天生日的用户");

        int successCount = 0;
        int skipCount = 0;

        for (LitemallUser user : birthdayUsers) {
            try {
                // 检查本年度是否已发放过生日券
                if (hasReceivedBirthdayCouponThisYear(user.getId(), couponId)) {
                    skipCount++;
                    logger.debug("用户 " + user.getId() + " 本年度已领取过生日券，跳过");
                    continue;
                }

                // 发放生日券
                assignBirthdayCoupon(user.getId(), coupon);
                successCount++;
                logger.info("为用户 " + user.getId() + " 发放生日券成功");
            } catch (Exception e) {
                logger.error("为用户 " + user.getId() + " 发放生日券失败: " + e.getMessage(), e);
            }
        }

        logger.info("生日券发放任务完成，成功: " + successCount + "，跳过: " + skipCount);
    }

    /**
     * 检查用户本年度是否已领取过生日券
     */
    private boolean hasReceivedBirthdayCouponThisYear(Integer userId, Integer couponId) {
        LocalDateTime startOfYear = LocalDate.now().withDayOfYear(1).atStartOfDay();
        LocalDateTime endOfYear = LocalDate.now().withDayOfYear(LocalDate.now().lengthOfYear()).atTime(23, 59, 59);

        List<LitemallCouponUser> couponUsers = couponUserService.queryByUserAndCouponAndTimeRange(
                userId, couponId, startOfYear, endOfYear);
        return couponUsers != null && !couponUsers.isEmpty();
    }

    /**
     * 为用户发放生日券
     */
    private void assignBirthdayCoupon(Integer userId, LitemallCoupon coupon) {
        Integer couponId = coupon.getId();
        Integer days = SystemConfig.getBirthdayCouponDays();

        LitemallCouponUser couponUser = new LitemallCouponUser();
        couponUser.setCouponId(couponId);
        couponUser.setUserId(userId);
        couponUser.setStatus(CouponUserConstant.STATUS_USABLE);

        // 设置有效期
        LocalDateTime now = LocalDateTime.now();
        couponUser.setStartTime(now);
        couponUser.setEndTime(now.plusDays(days));

        couponUserService.add(couponUser);
    }
}
