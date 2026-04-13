/**
 * admin-content/service/notice.js
 *
 * 公告管理 CRUD + 批量删除
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'add_time']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []
  if (data.title) { where.push('title LIKE ?'); params.push(`%${data.title}%`) }
  if (data.content) { where.push('content LIKE ?'); params.push(`%${data.content}%`) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_notice WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM litemall_notice WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_notice WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  const noticeAdminRows = await query(
    'SELECT na.id, na.admin_id, na.read_time, a.username FROM litemall_notice_admin na LEFT JOIN litemall_admin a ON a.id = na.admin_id WHERE na.notice_id = ? AND na.deleted = 0',
    [id]
  )

  return response.ok({ notice: rows[0], noticeAdminList: noticeAdminRows })
}

async function create(data, context) {
  const { title, content } = data
  if (!title) return response.badArgument()

  const adminId = context._adminId
  const result = await execute(
    'INSERT INTO litemall_notice (title, content, admin_id, add_time, update_time, deleted) VALUES (?, ?, ?, NOW(), NOW(), 0)',
    [title, content || '', adminId]
  )
  const noticeId = result.insertId

  // 为所有管理员创建通知记录
  const admins = await query('SELECT id FROM litemall_admin WHERE deleted = 0')
  if (admins.length > 0) {
    const values = admins.map(a => `(${noticeId}, ${a.id})`).join(',')
    await execute(
      `INSERT INTO litemall_notice_admin (notice_id, admin_id, add_time, update_time, deleted) VALUES ${values}`
    )
  }

  return response.ok({ id: noticeId })
}

async function update(data) {
  const { id, title, content } = data
  if (!id) return response.badArgument()

  // 检查是否已被阅读
  const readRows = await query('SELECT COUNT(*) AS cnt FROM litemall_notice_admin WHERE notice_id = ? AND read_time IS NOT NULL AND deleted = 0', [id])
  if (readRows[0] && readRows[0].cnt > 0) {
    return response.fail(706, '通知已被阅读，不能修改')
  }

  const sets = []
  const params = []
  if (title !== undefined) { sets.push('title = ?'); params.push(title) }
  if (content !== undefined) { sets.push('content = ?'); params.push(content) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_notice SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_notice_admin SET deleted = 1 WHERE notice_id = ?', [id])
  await execute('UPDATE litemall_notice SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

async function batchDelete(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()
  const placeholders = ids.map(() => '?').join(',')
  await execute(`UPDATE litemall_notice_admin SET deleted = 1 WHERE notice_id IN (${placeholders})`, ids)
  await execute(`UPDATE litemall_notice SET deleted = 1 WHERE id IN (${placeholders}) AND deleted = 0`, ids)
  return response.ok()
}

module.exports = { list, read, create, update, delete: deleteFn, batchDelete }
