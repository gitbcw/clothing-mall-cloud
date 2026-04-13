/**
 * task-coupon — 优惠券定时任务入口
 *
 * 支持两个 action：
 *   expireCoupon   — 过期优惠券处理（每小时）
 *   birthdayCoupon — 生日券发放（每天 0:30）
 */
const { response } = require('layer-base')
const { systemConfig } = require('layer-base')
const expireCoupon = require('./service/expire-coupon')
const birthdayCoupon = require('./service/birthday-coupon')

exports.main = async (event) => {
  const { action } = event

  // 加载系统配置
  await systemConfig.loadConfigs()

  try {
    let result
    switch (action) {
      case 'expireCoupon':
        result = await expireCoupon()
        break
      case 'birthdayCoupon':
        result = await birthdayCoupon()
        break
      default:
        return response.fail(404, '未知定时任务: ' + action)
    }
    return response.ok(result)
  } catch (err) {
    console.error('[task-coupon] error:', err)
    return response.serious()
  }
}
