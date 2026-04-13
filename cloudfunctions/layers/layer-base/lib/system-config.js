/**
 * 系统配置管理 — 移植自 Java SystemConfig
 *
 * 配置从 litemall_system_config 表加载到内存 Map。
 * 提供 getConfig(key) / getConfigInt(key) 等通用方法，
 * 以及 getFreight() / getOrderUnpaid() 等业务快捷方法。
 */

const { query } = require('./db')

const CONFIG_KEYS = {
  WX_INDEX_NEW: 'litemall_wx_index_new',
  WX_INDEX_HOT: 'litemall_wx_index_hot',
  WX_INDEX_BRAND: 'litemall_wx_index_brand',
  WX_INDEX_TOPIC: 'litemall_wx_index_topic',
  WX_CATLOG_LIST: 'litemall_wx_catlog_list',
  WX_CATLOG_GOODS: 'litemall_wx_catlog_goods',
  WX_SHARE: 'litemall_wx_share',
  EXPRESS_FREIGHT_VALUE: 'litemall_express_freight_value',
  EXPRESS_FREIGHT_MIN: 'litemall_express_freight_min',
  EXPRESS_FREIGHT_TYPE: 'litemall_express_freight_type',
  EXPRESS_FREIGHT_ADDITIONAL: 'litemall_express_freight_additional',
  EXPRESS_FREIGHT_FIRST_UNIT: 'litemall_express_freight_first_unit',
  EXPRESS_FREIGHT_ADDITIONAL_UNIT: 'litemall_express_freight_additional_unit',
  ORDER_UNPAID: 'litemall_order_unpaid',
  ORDER_UNCONFIRM: 'litemall_order_unconfirm',
  MALL_NAME: 'litemall_mall_name',
  MALL_ADDRESS: 'litemall_mall_address',
  MALL_PHONE: 'litemall_mall_phone',
  MALL_QQ: 'litemall_mall_qq',
  MALL_LONGITUDE: 'litemall_mall_longitude',
  MALL_LATITUDE: 'litemall_mall_latitude',
  NEWUSER_FIRST_ORDER_DISCOUNT: 'litemall_newuser_first_order_discount',
  BIRTHDAY_COUPON_STATUS: 'litemall_birthday_coupon_coupon_status',
  BIRTHDAY_COUPON_ID: 'litemall_birthday_coupon_id',
  BIRTHDAY_COUPON_DAYS: 'litemall_birthday_coupon_days',
  PRESALE_SHIP_DAYS: 'litemall_presale_ship_days',
  WEWORK_CORP_ID: 'litemall_wework_corp_id',
  WEWORK_CONTACT_SECRET: 'litemall_wework_contact_secret',
  WEWORK_PUSH_TARGET_TYPE: 'litemall_wework_push_target_type',
  WEWORK_PUSH_TAG_ID: 'litemall_wework_push_tag_id',
  WEWORK_SENDER_ID: 'litemall_wework_sender_id',
  WEWORK_MINIPROGRAM_APPID: 'litemall_wework_miniprogram_appid',
  WEWORK_ACTIVITY_PAGES: 'litemall_wework_activity_pages',
  PUSH_ACTIVE_DAYS: 'litemall_push_active_days',
  PUSH_DORMANT_DAYS: 'litemall_push_dormant_days',
}

let configs = {}

/**
 * 从数据库加载全部系统配置
 */
async function loadConfigs() {
  const rows = await query('SELECT key_name, key_value FROM litemall_system WHERE deleted = 0')
  configs = {}
  for (const row of rows) {
    configs[row.key_name] = row.key_value
  }
  return configs
}

function getConfig(key) {
  return configs[key] || null
}

function getConfigInt(key, defaultValue = 0) {
  const val = configs[key]
  if (val === null || val === undefined || val === '') return defaultValue
  const n = parseInt(val, 10)
  return isNaN(n) ? defaultValue : n
}

function getConfigFloat(key, defaultValue = 0) {
  const val = configs[key]
  if (val === null || val === undefined || val === '') return defaultValue
  const n = parseFloat(val)
  return isNaN(n) ? defaultValue : n
}

function getConfigBool(key, defaultValue = false) {
  const val = configs[key]
  if (val === null || val === undefined || val === '') return defaultValue
  return val === '1' || val === 'true'
}

// 业务快捷方法
function getFreight() { return getConfigFloat(CONFIG_KEYS.EXPRESS_FREIGHT_VALUE, 0) }
function getFreightLimit() { return getConfigFloat(CONFIG_KEYS.EXPRESS_FREIGHT_MIN, 0) }
function getOrderUnpaid() { return getConfigInt(CONFIG_KEYS.ORDER_UNPAID, 30) }
function getOrderUnconfirm() { return getConfigInt(CONFIG_KEYS.ORDER_UNCONFIRM, 7) }
function getMallName() { return getConfig(CONFIG_KEYS.MALL_NAME) || '' }
function getPresaleShipDays() { return getConfigInt(CONFIG_KEYS.PRESALE_SHIP_DAYS, 2) }

module.exports = {
  CONFIG_KEYS, loadConfigs, getConfig, getConfigInt, getConfigFloat, getConfigBool,
  getFreight, getFreightLimit, getOrderUnpaid, getOrderUnconfirm, getMallName, getPresaleShipDays,
}
