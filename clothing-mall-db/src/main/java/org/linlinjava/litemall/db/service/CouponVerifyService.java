package org.linlinjava.litemall.db.service;

import org.linlinjava.litemall.db.domain.LitemallCart;
import org.linlinjava.litemall.db.domain.LitemallCoupon;
import org.linlinjava.litemall.db.domain.LitemallCouponUser;
import org.linlinjava.litemall.db.domain.LitemallUser;
import org.linlinjava.litemall.db.util.CouponConstant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CouponVerifyService {

    @Autowired
    private LitemallCouponUserService couponUserService;
    @Autowired
    private LitemallCouponService couponService;
    @Autowired
    private LitemallGoodsService goodsService;
    @Autowired
    private LitemallUserService userService;

    /**
     * 检测优惠券是否适合
     *
     * @param userId
     * @param couponId
     * @param checkedGoodsPrice
     * @return
     */
    public LitemallCoupon checkCoupon(Integer userId, Integer couponId, Integer userCouponId, BigDecimal checkedGoodsPrice, List<LitemallCart> cartList) {
        LitemallCoupon coupon = couponService.findById(couponId);
        if (coupon == null || coupon.getDeleted()) {
            return null;
        }

        LitemallCouponUser couponUser = couponUserService.findById(userCouponId);
        if (couponUser == null) {
            couponUser = couponUserService.queryOne(userId, couponId);
        } else if (!couponId.equals(couponUser.getCouponId())) {
            return null;
        }

        if (couponUser == null) {
            return null;
        }

        // 检查是否超期
        Short timeType = coupon.getTimeType();
        Short days = coupon.getDays();
        LocalDateTime now = LocalDateTime.now();
        if (timeType.equals(CouponConstant.TIME_TYPE_TIME)) {
            if (now.isBefore(coupon.getStartTime()) || now.isAfter(coupon.getEndTime())) {
                return null;
            }
        }
        else if(timeType.equals(CouponConstant.TIME_TYPE_DAYS)) {
            LocalDateTime expired = couponUser.getAddTime().plusDays(days);
            if (now.isAfter(expired)) {
                return null;
            }
        }
        else {
            return null;
        }

        // 生日券：校验当天是否为用户生日（月日匹配）
        if (CouponConstant.TYPE_BIRTHDAY.equals(coupon.getType())) {
            LitemallUser user = userService.findById(userId);
            if (user == null || user.getBirthday() == null) {
                return null;
            }
            LocalDate today = LocalDate.now();
            LocalDate birthday = user.getBirthday();
            // 生日当天起连续7天可用
            LocalDate thisYearBirthday = birthday.withYear(today.getYear());
            if (today.isBefore(thisYearBirthday) || today.isAfter(thisYearBirthday.plusDays(6))) {
                return null;
            }
        }

        // 检测商品是否符合
        Map<Integer, List<LitemallCart>> cartMap = new HashMap<>();
        //可使用优惠券的商品或分类
        List<Integer> goodsValueList = new ArrayList<>(Arrays.asList(coupon.getGoodsValue()));
        Short goodType = coupon.getGoodsType();

        if (goodType.equals(CouponConstant.GOODS_TYPE_CATEGORY) ||
                goodType.equals((CouponConstant.GOODS_TYPE_ARRAY))) {
            for (LitemallCart cart : cartList) {
                Integer key = goodType.equals(CouponConstant.GOODS_TYPE_ARRAY) ? cart.getGoodsId() :
                        goodsService.findById(cart.getGoodsId()).getCategoryId();
                List<LitemallCart> carts = cartMap.get(key);
                if (carts == null) {
                    carts = new LinkedList<>();
                }
                carts.add(cart);
                cartMap.put(key, carts);
            }
            //购物车中可以使用优惠券的商品或分类
            goodsValueList.retainAll(cartMap.keySet());
            //可使用优惠券的商品的总价格
            BigDecimal total = new BigDecimal(0);

            for (Integer goodsId : goodsValueList) {
                List<LitemallCart> carts = cartMap.get(goodsId);
                for (LitemallCart cart : carts) {
                    total = total.add(cart.getPrice().multiply(new BigDecimal(cart.getNumber())));
                }
            }
            //是否达到优惠券满减金额
            if (goodsValueList.isEmpty() || total.compareTo(coupon.getMin()) == -1) {
                return null;
            }
        }

        // 检测订单状态
        Short status = coupon.getStatus();
        if (!status.equals(CouponConstant.STATUS_NORMAL)) {
            return null;
        }
        // 检测是否满足最低消费
        if (checkedGoodsPrice.compareTo(coupon.getMin()) == -1) {
            return null;
        }

        return coupon;
    }

    /**
     * 计算优惠券实际抵扣金额
     * 支持固定金额折扣和百分比折扣（可限定仅最高价单品）
     *
     * @param coupon   优惠券
     * @param cartList 购物车商品列表
     * @return 实际抵扣金额
     */
    public BigDecimal calculateDiscount(LitemallCoupon coupon, List<LitemallCart> cartList) {
        Short discountType = coupon.getDiscountType();
        // 兼容旧数据：discountType 为 null 时按固定金额处理
        if (discountType == null || CouponConstant.DISCOUNT_TYPE_FLAT.equals(discountType)) {
            return coupon.getDiscount();
        }

        // 百分比折扣
        if (CouponConstant.DISCOUNT_TYPE_PERCENT.equals(discountType)) {
            Short itemLimit = coupon.getItemLimit();
            BigDecimal percent = coupon.getDiscount(); // 如 30 表示减30%，即打7折

            if (CouponConstant.ITEM_LIMIT_BEST.equals(itemLimit)) {
                // 仅对最高价单品生效：找到最高单价，折扣 = 单价 × (percent / 100)
                BigDecimal maxPrice = BigDecimal.ZERO;
                for (LitemallCart cart : cartList) {
                    if (cart.getPrice().compareTo(maxPrice) > 0) {
                        maxPrice = cart.getPrice();
                    }
                }
                return maxPrice.multiply(percent).divide(new BigDecimal(100), 2, RoundingMode.HALF_UP);
            } else {
                // 全部商品：折扣 = 商品总价 × (percent / 100)
                BigDecimal total = BigDecimal.ZERO;
                for (LitemallCart cart : cartList) {
                    total = total.add(cart.getPrice().multiply(new BigDecimal(cart.getNumber())));
                }
                return total.multiply(percent).divide(new BigDecimal(100), 2, RoundingMode.HALF_UP);
            }
        }

        return coupon.getDiscount();
    }

}