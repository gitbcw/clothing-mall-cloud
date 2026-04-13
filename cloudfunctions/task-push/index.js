/**
 * task-push — 企微定时推送入口
 *
 * 支持一个 action：
 *   scheduledPush — 企微定时推送（每分钟）
 */
const { response } = require('layer-base')
const { systemConfig } = require('layer-base')
const scheduledPush = require('./service/scheduled-push')

exports.main = async (event) => {
  const { action } = event

  // 加载系统配置
  await systemConfig.loadConfigs()

  try {
    let result
    switch (action) {
      case 'scheduledPush':
        result = await scheduledPush()
        break
      default:
        return response.fail(404, '未知定时任务: ' + action)
    }
    return response.ok(result)
  } catch (err) {
    console.error('[task-push] error:', err)
    return response.serious()
  }
}
