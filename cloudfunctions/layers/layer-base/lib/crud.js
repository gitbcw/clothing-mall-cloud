/**
 * 通用 CRUD 工具 — 减少 Admin 云函数中的重复 SQL 拼接
 *
 * 提供：
 *   queryPage   — 分页查询（自动拼接 WHERE / ORDER BY / LIMIT）
 *   queryById   — 按 ID 查单条
 *   dynamicUpdate — 动态 UPDATE（仅更新传入的非空字段）
 *   safeSort    — 排序白名单校验（防 SQL 注入）
 *   checkUnique — 唯一性检查
 */

const { query, execute } = require('./db')

/**
 * 分页查询
 * @param {string} table - 表名
 * @param {object} opts
 * @param {string} [opts.where] - WHERE 条件（不含 WHERE 关键字，如 'name LIKE ? AND status = ?'）
 * @param {Array} [opts.params] - WHERE 参数
 * @param {string} [opts.sort] - 排序字段（如 'add_time'）
 * @param {string} [opts.order] - 排序方向 'asc' 或 'desc'
 * @param {Array} [opts.sortWhitelist] - 允许的排序字段白名单
 * @param {number} opts.offset - 分页偏移
 * @param {number} opts.limit - 每页条数
 * @param {string} [opts.select] - 查询字段（默认 *）
 * @returns {object} { list, total }
 */
async function queryPage(table, opts) {
  const {
    where = '',
    params = [],
    sort,
    order = 'desc',
    sortWhitelist,
    offset = 0,
    limit = 10,
    select = '*',
  } = opts

  // 构建 WHERE 子句
  const whereClause = where ? ` WHERE ${where}` : ''

  // 构建 ORDER BY 子句（白名单校验）
  let orderClause = ''
  if (sort) {
    const safeField = sortWhitelist
      ? sortWhitelist.includes(sort) ? sort : null
      : /^[a-zA-Z_]+$/.test(sort) ? sort : null
    if (safeField) {
      const direction = (order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC'
      orderClause = ` ORDER BY ${safeField} ${direction}`
    }
  }

  // 查总数
  const countSql = `SELECT COUNT(*) AS total FROM ${table}${whereClause}`
  const countRows = await query(countSql, params)
  const total = countRows[0] ? countRows[0].total : 0

  // 查列表
  const listSql = `SELECT ${select} FROM ${table}${whereClause}${orderClause} LIMIT ? OFFSET ?`
  const list = await query(listSql, [...params, limit, offset])

  return { list, total }
}

/**
 * 按 ID 查单条
 * @param {string} table - 表名
 * @param {number} id
 * @param {string} [select] - 查询字段
 * @returns {object|null}
 */
async function queryById(table, id, select) {
  const sql = `SELECT ${select || '*'} FROM ${table} WHERE id = ? AND deleted = 0`
  const rows = await query(sql, [id])
  return rows[0] || null
}

/**
 * 动态 UPDATE — 仅更新传入的非空字段
 * @param {string} table - 表名
 * @param {number} id - 记录 ID
 * @param {object} data - 要更新的字段对象
 * @param {object} opts
 * @param {Array} [opts.allowedFields] - 允许更新的字段白名单（为空则允许所有字段）
 * @param {Array} [opts.excludeFields] - 排除的字段
 * @param {string} [opts.idField] - 主键字段名（默认 'id'）
 * @returns {object} { affectedRows }
 */
async function dynamicUpdate(table, id, data, opts = {}) {
  const {
    allowedFields,
    excludeFields = ['id', 'deleted', 'add_time', 'update_time'],
    idField = 'id',
  } = opts

  const sets = []
  const params = []

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    if (excludeFields.includes(key)) continue
    if (allowedFields && !allowedFields.includes(key)) continue

    sets.push(`\`${key}\` = ?`)
    params.push(value)
  }

  if (sets.length === 0) {
    return { affectedRows: 0 }
  }

  params.push(id)
  const sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE \`${idField}\` = ?`
  const result = await execute(sql, params)
  return { affectedRows: result.affectedRows }
}

/**
 * 排序白名单校验
 * @param {string} sort - 排序字段
 * @param {string} order - 排序方向
 * @param {Array} whitelist - 允许的字段白名单
 * @returns {{ sort: string, order: string }} 校验后的排序参数
 */
function safeSort(sort, order, whitelist) {
  if (!sort || !whitelist || !whitelist.includes(sort)) {
    return { sort: 'add_time', order: 'desc' }
  }
  return {
    sort,
    order: (order || '').toLowerCase() === 'asc' ? 'asc' : 'desc',
  }
}

/**
 * 唯一性检查
 * @param {string} table - 表名
 * @param {string} field - 字段名
 * @param {*} value - 字段值
 * @param {number} [excludeId] - 排除的记录 ID（用于更新场景）
 * @returns {boolean} true=已存在（冲突），false=可用
 */
async function checkUnique(table, field, value, excludeId) {
  let sql = `SELECT COUNT(*) AS cnt FROM ${table} WHERE \`${field}\` = ? AND deleted = 0`
  const params = [value]

  if (excludeId) {
    sql += ' AND id != ?'
    params.push(excludeId)
  }

  const rows = await query(sql, params)
  return rows[0] ? rows[0].cnt > 0 : false
}

/**
 * 按 ID 删除（软删除）
 * @param {string} table - 表名
 * @param {number} id
 * @returns {object} { affectedRows }
 */
async function softDelete(table, id) {
  const result = await execute(
    `UPDATE ${table} SET deleted = 1 WHERE id = ?`,
    [id]
  )
  return { affectedRows: result.affectedRows }
}

/**
 * 按 ID 物理删除
 * @param {string} table - 表名
 * @param {number} id
 * @returns {object} { affectedRows }
 */
async function hardDelete(table, id) {
  const result = await execute(
    `DELETE FROM ${table} WHERE id = ?`,
    [id]
  )
  return { affectedRows: result.affectedRows }
}

module.exports = {
  queryPage,
  queryById,
  dynamicUpdate,
  safeSort,
  checkUnique,
  softDelete,
  hardDelete,
}
