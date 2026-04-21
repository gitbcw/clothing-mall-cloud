/**
 * wx-tracker 云函数 — 埋点上报
 *
 * 迁移自 WxTrackerController
 * 1 个接口：report
 */

const { db, response } = require('layer-base')

async function report(data, context) {
  const events = data.events
  if (!events || !Array.isArray(events) || events.length === 0) {
    return response.ok()
  }

  // 查询禁用的事件类型，服务端过滤
  let disabledTypes = new Set()
  try {
    const rows = await db.query('SELECT event_type FROM litemall_tracker_config WHERE enabled = 0')
    disabledTypes = new Set(rows.map(r => r.event_type))
  } catch (e) {
    // 配置表不存在时不过滤，全量写入
  }

  const userId = context._userId || null

  for (const e of events) {
    // 跳过已禁用的事件类型
    if (disabledTypes.has(e.type)) continue

    await db.query(
      `INSERT INTO litemall_tracker_event (user_id, event_type, event_data, page_route, device_info, timestamp, server_time)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        e.type || '',
        typeof e.data === 'string' ? e.data : JSON.stringify(e.data || {}),
        e.page || '',
        typeof e.device === 'string' ? e.device : JSON.stringify(e.device || {}),
        e.timestamp ? Math.floor(new Date(e.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000),
      ]
    )
  }

  return response.ok()
}

const routes = { report }

exports.main = async (event, context) => {
  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-tracker] action=${action} error:`, err)
    return response.serious()
  }
}
