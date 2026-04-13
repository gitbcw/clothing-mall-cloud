/**
 * wx-region 云函数 — 地区数据
 *
 * 迁移自 WxRegionController
 * 1 个接口：list
 */

const { db, response } = require('layer-base')

async function list(data) {
  const pid = data.pid != null ? data.pid : 0

  const rows = await db.query(
    `SELECT id, name, code, type FROM litemall_region WHERE pid = ? ORDER BY id ASC`,
    [pid]
  )

  return response.ok(rows)
}

const routes = { list }

exports.main = async (event, context) => {
  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-region] action=${action} error:`, err)
    return response.serious()
  }
}
