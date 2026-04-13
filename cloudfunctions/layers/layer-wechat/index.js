/**
 * layer-wechat 导出入口
 *
 * 云函数中通过以下方式引用：
 *   const { wework, ai } = require('layer-wechat')
 */

const wework = require('./lib/wework')
const ai = require('./lib/ai')

module.exports = {
  wework,
  ai,
}
