package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.dao.LitemallCouponUserMapper;
import org.linlinjava.litemall.db.domain.LitemallCoupon;
import org.linlinjava.litemall.db.domain.LitemallCouponUser;
import org.linlinjava.litemall.db.util.CouponConstant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CouponAssignService {

    @Autowired
    private LitemallCouponUserService couponUserService;
    @Autowired
    private LitemallCouponService couponService;
    @Autowired
    private LitemallCouponUserMapper couponUserMapper;

    /**
     * 分发注册优惠券
     *
     * @param userId
     * @return
     */
    public void assignForRegister(Integer userId) {
        List<LitemallCoupon> couponList = couponService.queryRegister();
        for(LitemallCoupon coupon : couponList){
            Integer couponId = coupon.getId();
            Integer count = couponUserService.countUserAndCoupon(userId, couponId);
            if (count > 0) {
                continue;
            }

            Short limit = coupon.getLimit();
            while(limit > 0) {
                LitemallCouponUser couponUser = new LitemallCouponUser();
                couponUser.setCouponId(couponId);
                couponUser.setUserId(userId);
                Short timeType = coupon.getTimeType();
                if (timeType.equals(CouponConstant.TIME_TYPE_TIME)) {
                    couponUser.setStartTime(coupon.getStartTime());
                    couponUser.setEndTime(coupon.getEndTime());
                }
                else{
                    LocalDateTime now = LocalDateTime.now();
                    couponUser.setStartTime(now);
                    couponUser.setEndTime(now.plusDays(coupon.getDays()));
                }
                couponUserService.add(couponUser);

                limit--;
            }
        }

    }

    /**
     * 为用户发放新人专享优惠券
     *
     * @param userId 用户ID
     */
    public void assignForNewUser(Integer userId) {
        List<LitemallCoupon> couponList = couponService.queryNewUser();
        if (couponList == null || couponList.isEmpty()) {
            return;
        }

        for (LitemallCoupon coupon : couponList) {
            Integer couponId = coupon.getId();
            Integer count = couponUserService.countUserAndCoupon(userId, couponId);
            if (count > 0) {
                continue;
            }

            Short limit = coupon.getLimit();
            while (limit > 0) {
                LitemallCouponUser couponUser = new LitemallCouponUser();
                couponUser.setCouponId(couponId);
                couponUser.setUserId(userId);
                Short timeType = coupon.getTimeType();
                if (timeType.equals(CouponConstant.TIME_TYPE_TIME)) {
                    couponUser.setStartTime(coupon.getStartTime());
                    couponUser.setEndTime(coupon.getEndTime());
                } else {
                    LocalDateTime now = LocalDateTime.now();
                    couponUser.setStartTime(now);
                    couponUser.setEndTime(now.plusDays(coupon.getDays()));
                }
                couponUserService.add(couponUser);

                limit--;
            }
        }
    }

    /**
     * 为用户发放生日专属优惠券
     *
     * @param userId 用户ID
     * @param couponId 优惠券模板ID
     * @param days 优惠券有效期（天）
     */
    public void assignForBirthday(Integer userId, Integer couponId, Integer days) {
        if (couponId == null || days == null) {
            return;
        }

        LitemallCoupon coupon = couponService.findById(couponId);
        if (coupon == null) {
            return;
        }

        Integer count = couponUserService.countUserAndCoupon(userId, couponId);
        if (count > 0) {
            return;
        }

        LitemallCouponUser couponUser = new LitemallCouponUser();
        couponUser.setCouponId(couponId);
        couponUser.setUserId(userId);
        LocalDateTime now = LocalDateTime.now();
        couponUser.setStartTime(now);
        couponUser.setEndTime(now.plusDays(days));
        couponUserService.add(couponUser);
    }
}
