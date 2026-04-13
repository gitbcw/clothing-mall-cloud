/**
 * layer-auth 导出入口
 *
 * 云函数中通过以下方式引用：
 *   const { wxAuth, adminAuth, managerAuth } = require('layer-auth')
 */

const wxAuth = require('./lib/wx-auth')
const adminAuth = require('./lib/admin-auth')
const managerAuth = require('./lib/manager-auth')

module.exports = {
  wxAuth,
  adminAuth,
  managerAuth,
}
