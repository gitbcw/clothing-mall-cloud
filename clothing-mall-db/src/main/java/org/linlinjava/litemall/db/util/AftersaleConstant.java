package org.linlinjava.litemall.db.util;

/**
 * 售后常量
 *
 * 改造说明：售后改为"只换不退"
 * - 类型：仅支持换货
 * - 状态：移除退款，改为换货发货和完成
 */
public class AftersaleConstant {
    // 售后状态
    public static final Short STATUS_INIT = 0;      // 可申请
    public static final Short STATUS_REQUEST = 1;   // 用户已申请
    public static final Short STATUS_RECEPT = 2;    // 管理员审核通过
    public static final Short STATUS_SHIPPED = 3;   // 换货已发货（原 STATUS_REFUND）
    public static final Short STATUS_REJECT = 4;    // 管理员审核拒绝
    public static final Short STATUS_CANCEL = 5;    // 用户已取消
    public static final Short STATUS_COMPLETED = 6; // 换货完成（新增）

    // 售后类型（换货类型）
    public static final Short TYPE_EXCHANGE_SAME = 0;   // 同款换货（尺码/颜色不对）
    public static final Short TYPE_EXCHANGE_DIFF = 1;   // 换其他商品（差价线下处理）

    // 兼容旧数据
    @Deprecated
    public static final Short TYPE_GOODS_MISS = 0;      // 已废弃
    @Deprecated
    public static final Short TYPE_GOODS_NEEDLESS = 1;  // 已废弃
    @Deprecated
    public static final Short TYPE_GOODS_REQUIRED = 2;  // 已废弃
    @Deprecated
    public static final Short STATUS_REFUND = 3;        // 已废弃，使用 STATUS_SHIPPED
}
