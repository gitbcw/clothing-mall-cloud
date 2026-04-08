package org.linlinjava.litemall.core.system;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * 系统设置
 */
public class SystemConfig {
    // 小程序相关配置
    public final static String LITEMALL_WX_INDEX_NEW = "litemall_wx_index_new";
    public final static String LITEMALL_WX_INDEX_HOT = "litemall_wx_index_hot";
    public final static String LITEMALL_WX_INDEX_BRAND = "litemall_wx_index_brand";
    public final static String LITEMALL_WX_INDEX_TOPIC = "litemall_wx_index_topic";
    public final static String LITEMALL_WX_INDEX_CATLOG_LIST = "litemall_wx_catlog_list";
    public final static String LITEMALL_WX_INDEX_CATLOG_GOODS = "litemall_wx_catlog_goods";
    public final static String LITEMALL_WX_SHARE = "litemall_wx_share";
    // 运费相关配置
    public final static String LITEMALL_EXPRESS_FREIGHT_VALUE = "litemall_express_freight_value";
    public final static String LITEMALL_EXPRESS_FREIGHT_MIN = "litemall_express_freight_min";
    // 订单相关配置
    public final static String LITEMALL_ORDER_UNPAID = "litemall_order_unpaid";
    public final static String LITEMALL_ORDER_UNCONFIRM = "litemall_order_unconfirm";
    // 商场相关配置
    public final static String LITEMALL_MALL_NAME = "litemall_mall_name";
    public final static String LITEMALL_MALL_ADDRESS = "litemall_mall_address";
    public final static String LITEMALL_MALL_PHONE = "litemall_mall_phone";
    public final static String LITEMALL_MALL_QQ = "litemall_mall_qq";
    public final static String LITEMALL_MALL_LONGITUDE = "litemall_mall_longitude";
    public final static String LITEMALL_MALL_Latitude = "litemall_mall_latitude";

    //所有的配置均保存在该 HashMap 中
    private static Map<String, String> SYSTEM_CONFIGS = new HashMap<>();

    /**
     * 获取指定配置项的值（内部使用）
     */
    private static String getConfig(String keyName) {
        return SYSTEM_CONFIGS.get(keyName);
    }

    private static Integer getConfigInt(String keyName) {
        return Integer.parseInt(SYSTEM_CONFIGS.get(keyName));
    }

    private static Boolean getConfigBoolean(String keyName) {
        return Boolean.valueOf(SYSTEM_CONFIGS.get(keyName));
    }

    private static BigDecimal getConfigBigDec(String keyName) {
        return new BigDecimal(SYSTEM_CONFIGS.get(keyName));
    }

    /**
     * 获取指定配置项的值（公共方法，供其他类调用）
     */
    public static String getConfigValue(String keyName) {
        return SYSTEM_CONFIGS.get(keyName);
    }

    public static Integer getNewLimit() {
        return getConfigInt(LITEMALL_WX_INDEX_NEW);
    }

    public static Integer getHotLimit() {
        return getConfigInt(LITEMALL_WX_INDEX_HOT);
    }

    public static Integer getBrandLimit() {
        return getConfigInt(LITEMALL_WX_INDEX_BRAND);
    }

    public static Integer getTopicLimit() {
        return getConfigInt(LITEMALL_WX_INDEX_TOPIC);
    }

    public static Integer getCatlogListLimit() {
        return getConfigInt(LITEMALL_WX_INDEX_CATLOG_LIST);
    }

    public static Integer getCatlogMoreLimit() {
        return getConfigInt(LITEMALL_WX_INDEX_CATLOG_GOODS);
    }

    public static boolean isAutoCreateShareImage() {
        return getConfigBoolean(LITEMALL_WX_SHARE);
    }

    public static BigDecimal getFreight() {
        return getConfigBigDec(LITEMALL_EXPRESS_FREIGHT_VALUE);
    }

    public static BigDecimal getFreightLimit() {
        return getConfigBigDec(LITEMALL_EXPRESS_FREIGHT_MIN);
    }

    public static Integer getOrderUnpaid() {
        return getConfigInt(LITEMALL_ORDER_UNPAID);
    }

    public static Integer getOrderUnconfirm() {
        return getConfigInt(LITEMALL_ORDER_UNCONFIRM);
    }

    public static String getMallName() {
        return getConfig(LITEMALL_MALL_NAME);
    }

    public static String getMallAddress() {
        return getConfig(LITEMALL_MALL_ADDRESS);
    }

    public static String getMallPhone() {
        return getConfig(LITEMALL_MALL_PHONE);
    }

    public static String getMallQQ() {
        return getConfig(LITEMALL_MALL_QQ);
    }

    public static String getMallLongitude() {
        return getConfig(LITEMALL_MALL_LONGITUDE);
    }

    public static String getMallLatitude() {
        return getConfig(LITEMALL_MALL_Latitude);
    }

    // ================== 新人优惠配置 ==================

    /**
     * 获取首单立减金额
     */
    public static BigDecimal getNewUserFirstOrderDiscount() {
        String value = getConfig(LITEMALL_NEWUSER_FIRST_ORDER_DISCOUNT);
        if (value == null || value.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(value);
    }

    // ================== 生日券配置 ==================

    /**
     * 是否启用生日券
     */
    public static boolean isBirthdayCouponEnabled() {
        String value = getConfig(LITEMALL_BIRTHDAY_COUPON_STATUS);
        return "1".equals(value);
    }

    /**
     * 获取生日券模板ID
     */
    public static Integer getBirthdayCouponId() {
        String value = getConfig(LITEMALL_BIRTHDAY_COUPON_ID);
        if (value == null || value.isEmpty()) {
            return null;
        }
        return Integer.parseInt(value);
    }

    /**
     * 获取生日券有效期（天）
     */
    public static Integer getBirthdayCouponDays() {
        String value = getConfig(LITEMALL_BIRTHDAY_COUPON_DAYS);
        if (value == null || value.isEmpty()) {
            return 30;
        }
        return Integer.parseInt(value);
    }

    // ================== 企业微信配置 ==================

    /**
     * 获取企业微信企业ID
     */
    public static String getWeWorkCorpId() {
        return getConfig(LITEMALL_WEWORK_CORP_ID);
    }

    /**
     * 获取企业微信客户联系Secret
     */
    public static String getWeWorkContactSecret() {
        return getConfig(LITEMALL_WEWORK_CONTACT_SECRET);
    }

    /**
     * 获取企微推送目标类型（0全部客户，1按标签）
     */
    public static Integer getWeWorkPushTargetType() {
        String value = getConfig(LITEMALL_WEWORK_PUSH_TARGET_TYPE);
        if (value == null || value.isEmpty()) {
            return 0;
        }
        return Integer.parseInt(value);
    }

    /**
     * 获取企微推送目标标签ID
     */
    public static String getWeWorkPushTagId() {
        return getConfig(LITEMALL_WEWORK_PUSH_TAG_ID);
    }

    /**
     * 获取企微发送者账号ID
     */
    public static String getWeWorkSenderId() {
        return getConfig(LITEMALL_WEWORK_SENDER_ID);
    }

    /**
     * 获取企微关联的小程序 AppID
     */
    public static String getWeWorkMiniProgramAppId() {
        return getConfig(LITEMALL_WEWORK_MINIPROGRAM_APPID);
    }

    /**
     * 获取企微推送活动页面配置（JSON格式）
     */
    public static String getWeWorkActivityPages() {
        return getConfig(LITEMALL_WEWORK_ACTIVITY_PAGES);
    }

    // 运费相关扩展配置
    public final static String LITEMALL_EXPRESS_FREIGHT_TYPE = "litemall_express_freight_type";
    public final static String LITEMALL_EXPRESS_FREIGHT_ADDITIONAL = "litemall_express_freight_additional";
    public final static String LITEMALL_EXPRESS_FREIGHT_FIRST_UNIT = "litemall_express_freight_first_unit";
    public final static String LITEMALL_EXPRESS_FREIGHT_ADDITIONAL_UNIT = "litemall_express_freight_additional_unit";

    // 新人优惠配置
    public final static String LITEMALL_NEWUSER_FIRST_ORDER_DISCOUNT = "litemall_newuser_first_order_discount";

    // 生日券配置
    public final static String LITEMALL_BIRTHDAY_COUPON_STATUS = "litemall_birthday_coupon_status";
    public final static String LITEMALL_BIRTHDAY_COUPON_ID = "litemall_birthday_coupon_id";
    public final static String LITEMALL_BIRTHDAY_COUPON_DAYS = "litemall_birthday_coupon_days";

    // 预售配置
    public final static String LITEMALL_PRESALE_SHIP_DAYS = "litemall_presale_ship_days";

    // 企业微信配置
    public final static String LITEMALL_WEWORK_CORP_ID = "litemall_wework_corp_id";
    public final static String LITEMALL_WEWORK_CONTACT_SECRET = "litemall_wework_contact_secret";
    public final static String LITEMALL_WEWORK_PUSH_TARGET_TYPE = "litemall_wework_push_target_type";
    public final static String LITEMALL_WEWORK_PUSH_TAG_ID = "litemall_wework_push_tag_id";
    public final static String LITEMALL_WEWORK_SENDER_ID = "litemall_wework_sender_id";
    public final static String LITEMALL_WEWORK_MINIPROGRAM_APPID = "litemall_wework_miniprogram_appid";
    public final static String LITEMALL_WEWORK_ACTIVITY_PAGES = "litemall_wework_activity_pages";

    // 推送组配置
    public final static String LITEMALL_PUSH_ACTIVE_DAYS = "litemall_push_active_days";
    public final static String LITEMALL_PUSH_DORMANT_DAYS = "litemall_push_dormant_days";

    // 配置缓存
    private static Integer cachedPresaleShipDays = null;
    private static Integer cachedPushActiveDays = null;
    private static Integer cachedPushDormantDays = null;

    /**
     * 获取预售发货天数（带缓存）
     * 库存为0时商品自动标记为预售，预计发货时间为当前日期+此配置天数
     */
    public static Integer getPresaleShipDays() {
        if (cachedPresaleShipDays != null) {
            return cachedPresaleShipDays;
        }
        String value = getConfig(LITEMALL_PRESALE_SHIP_DAYS);
        if (value == null || value.isEmpty()) {
            cachedPresaleShipDays = 2; // 默认2天
        } else {
            cachedPresaleShipDays = Integer.parseInt(value);
        }
        return cachedPresaleShipDays;
    }

    /**
     * 获取活跃用户判定天数（带缓存）
     */
    public static Integer getPushActiveDays() {
        if (cachedPushActiveDays != null) {
            return cachedPushActiveDays;
        }
        String value = getConfig(LITEMALL_PUSH_ACTIVE_DAYS);
        if (value == null || value.isEmpty()) {
            cachedPushActiveDays = 3; // 默认3天
        } else {
            cachedPushActiveDays = Integer.parseInt(value);
        }
        return cachedPushActiveDays;
    }

    /**
     * 获取潜水用户判定天数（带缓存）
     */
    public static Integer getPushDormantDays() {
        if (cachedPushDormantDays != null) {
            return cachedPushDormantDays;
        }
        String value = getConfig(LITEMALL_PUSH_DORMANT_DAYS);
        if (value == null || value.isEmpty()) {
            cachedPushDormantDays = 30; // 默认30天
        } else {
            cachedPushDormantDays = Integer.parseInt(value);
        }
        return cachedPushDormantDays;
    }

    public static void setConfigs(Map<String, String> configs) {
        SYSTEM_CONFIGS = configs;
        // 清除缓存
        cachedPresaleShipDays = null;
        cachedPushActiveDays = null;
        cachedPushDormantDays = null;
    }

    public static void updateConfigs(Map<String, String> data) {
        for (Map.Entry<String, String> entry : data.entrySet()) {
            SYSTEM_CONFIGS.put(entry.getKey(), entry.getValue());
        }
        // 清除缓存
        cachedPresaleShipDays = null;
        cachedPushActiveDays = null;
        cachedPushDormantDays = null;
    }
}