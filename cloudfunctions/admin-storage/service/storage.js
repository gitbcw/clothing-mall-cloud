/**
 * admin-storage/service/storage.js
 *
 * 文件存储 CRUD
 *
 * 注意：CloudBase 环境中，文件上传由前端直接上传到云存储，
 * create 接口只负责记录文件元数据到 litemall_storage 表。
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'name', 'add_time', 'size']

function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

/**
 * 存储文件列表（分页）
 */
async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })

  const where = []
  const params = []
  if (data.key) {
    where.push('`key` = ?')
    params.push(data.key)
  }
  if (data.name) {
    where.push('name LIKE ?')
    params.push(`%${data.name}%`)
  }
  where.push('deleted = 0')
  const whereClause = where.join(' AND ')

  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_storage WHERE ${whereClause}`,
    params
  )
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT * FROM litemall_storage WHERE ${whereClause} ORDER BY ${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

/**
 * 创建存储记录
 * 前端先上传文件到云存储获取 url/key，再调用此接口记录
 */
async function create(data) {
  const { key, name, type, size, url } = data
  if (!key || !name) return response.badArgument()

  const result = await execute(
    'INSERT INTO litemall_storage (`key`, name, type, size, url, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [key, name, type || '', size || 0, url || '']
  )

  return response.ok({ id: result.insertId })
}

/**
 * 查看存储记录详情
 */
async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query(
    'SELECT * FROM litemall_storage WHERE id = ?',
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(rows[0])
}

/**
 * 更新存储记录
 */
async function update(data) {
  const { id, name, type, size, url } = data
  if (!id) return response.badArgument()

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (type !== undefined) { sets.push('type = ?'); params.push(type) }
  if (size !== undefined) { sets.push('size = ?'); params.push(size) }
  if (url !== undefined) { sets.push('url = ?'); params.push(url) }
  sets.push('update_time = NOW()')

  if (sets.length === 1) return response.ok()

  params.push(id)
  const result = await execute(
    `UPDATE litemall_storage SET ${sets.join(', ')} WHERE id = ?`,
    params
  )
  if (result.affectedRows === 0) return response.updatedDataFailed()

  return response.ok()
}

/**
 * 删除存储记录（逻辑删除）
 * 注意：CloudBase 环境中不删除云存储中的实际文件，只标记数据库记录
 */
async function deleteFn(data) {
  const { key } = data
  if (!key) return response.badArgument()

  await execute(
    'UPDATE litemall_storage SET deleted = 1 WHERE `key` = ? AND deleted = 0',
    [key]
  )

  return response.ok()
}

module.exports = { list, create, read, update, delete: deleteFn }
