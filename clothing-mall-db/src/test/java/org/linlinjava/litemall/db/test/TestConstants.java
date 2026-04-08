package org.linlinjava.litemall.db.test;

/**
 * 测试常量
 */
public class TestConstants {

    // ==================== 测试用户 ====================

    /** 测试用户 ID */
    public static final int TEST_USER_ID = 1;

    /** 测试管理员用户名 */
    public static final String ADMIN_USERNAME = "admin123";

    /** 测试管理员密码 */
    public static final String ADMIN_PASSWORD = "admin123";

    // ==================== 测试商品 ====================

    /** 测试商品 ID */
    public static final int TEST_GOODS_ID = 1;

    /** 测试商品 SKU */
    public static final String TEST_GOODS_SN = "TEST001";

    // ==================== 测试订单 ====================

    /** 测试订单 ID */
    public static final int TEST_ORDER_ID = 1;

    // ==================== 测试分类 ====================

    /** 测试分类 ID */
    public static final int TEST_CATEGORY_ID = 1008009;

    // ==================== 订单状态 ====================

    /** 待付款 */
    public static final short ORDER_STATUS_CREATE = 101;

    /** 待发货 */
    public static final short ORDER_STATUS_PAY = 201;

    /** 待收货 */
    public static final short ORDER_STATUS_SHIP = 301;

    /** 已完成 */
    public static final short ORDER_STATUS_CONFIRM = 401;

    /** 已取消 */
    public static final short ORDER_STATUS_CANCEL = 102;

    // ==================== 优惠券类型 ====================

    /** 通用券 */
    public static final short COUPON_TYPE_COMMON = 0;

    /** 注册赠券 */
    public static final short COUPON_TYPE_REGISTER = 1;

    /** 优惠券赠券 */
    public static final short COUPON_TYPE_CODE = 2;
}
