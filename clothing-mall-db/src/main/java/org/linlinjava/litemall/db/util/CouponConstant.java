package org.linlinjava.litemall.db.util;

public class CouponConstant {
    public static final Short TYPE_COMMON = 0;
    public static final Short TYPE_REGISTER = 1;
    public static final Short TYPE_CODE = 2;
    public static final Short TYPE_NEWUSER = 3;      // 新人专享券
    public static final Short TYPE_BIRTHDAY = 4;     // 生日专属券

    public static final Short GOODS_TYPE_ALL = 0;
    public static final Short GOODS_TYPE_CATEGORY = 1;
    public static final Short GOODS_TYPE_ARRAY = 2;

    public static final Short STATUS_NORMAL = 0;
    public static final Short STATUS_EXPIRED = 1;
    public static final Short STATUS_OUT = 2;

    public static final Short TIME_TYPE_DAYS = 0;
    public static final Short TIME_TYPE_TIME = 1;

    public static final Short DISCOUNT_TYPE_FLAT = 0;      // 固定金额折扣
    public static final Short DISCOUNT_TYPE_PERCENT = 1;    // 百分比折扣（如30表示打7折）

    public static final Short ITEM_LIMIT_ALL = 0;           // 全部商品
    public static final Short ITEM_LIMIT_BEST = 1;          // 仅最高价单品
}
