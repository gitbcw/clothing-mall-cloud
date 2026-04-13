/**
 * admin-wework/service/ops.js — 运维接口
 */
const { db, response } = require('layer-base')
const { query, execute } = db

// 通知范围查询
async function notifyScope() {
  const rows = await query("SELECT config_key, config_value FROM litemall_system WHERE config_key LIKE 'litemall_wework%' AND deleted = 0")
  const result = {}
  for (const r of rows) {
    result[r.config_key] = r.config_value
  }
  return response.ok(result)
}

module.exports = { notifyScope }
