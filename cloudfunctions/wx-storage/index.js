/**
 * wx-storage 云函数 — 文件上传/下载
 *
 * 迁移自 WxStorageController
 * 3 个接口：upload, fetch, download
 *
 * 注意：CloudBase 云函数不支持 MultipartFile，
 * 上传使用 CloudBase 云存储 SDK，此函数仅处理元数据管理。
 */

const { db, response } = require('layer-base')

// ==================== 上传记录（元数据） ====================

async function upload(data) {
  const { key, name, type, size, url } = data
  if (!key || !name || !type) return response.badArgument()

  await db.query(
    `INSERT INTO litemall_storage (key, name, type, size, url, add_time, update_time, deleted)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
    [key, name, type, size || 0, url || '']
  )

  return response.ok({ key, name, type, size, url })
}

// ==================== 获取文件信息 ====================

async function fetch(data) {
  const { key } = data
  if (!key) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_storage WHERE \`key\` = ? AND deleted = 0 LIMIT 1`,
    [key]
  )
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(rows[0])
}

// ==================== 下载文件信息 ====================

async function download(data) {
  return fetch(data)
}

const routes = { upload, fetch, download }

exports.main = async (event, context) => {
  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-storage] action=${action} error:`, err)
    return response.serious()
  }
}
