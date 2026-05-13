/**
 * layer-wechat 导出入口
 *
 * 云函数中通过以下方式引用：
 *   const { ai } = require('layer-wechat')
 */

const ai = require('./lib/ai')

module.exports = {
  ai,
}
