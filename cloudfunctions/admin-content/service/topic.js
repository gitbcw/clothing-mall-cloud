/**
 * admin-content/service/topic.js
 *
 * 专题管理 CRUD + 批量删除
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'add_time', 'price', 'sort_order']
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
  if (data.subtitle) { where.push('subtitle LIKE ?'); params.push(`%${data.subtitle}%`) }
  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_topic WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(`SELECT * FROM litemall_topic WHERE ${whereClause} ORDER BY ${sort} ${order}`, offset, limit)
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_topic WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  const topic = rows[0]
  let goodsList = []
  if (topic.goods) {
    try {
      const goodsIds = JSON.parse(topic.goods)
      if (Array.isArray(goodsIds) && goodsIds.length > 0) {
        const placeholders = goodsIds.map(() => '?').join(',')
        goodsList = await query(`SELECT id, name, pic_url, price FROM litemall_goods WHERE id IN (${placeholders}) AND deleted = 0`, goodsIds)
      }
    } catch (e) { /* ignore parse error */ }
  }

  return response.ok({ topic, goodsList })
}

async function create(data) {
  const { title, subtitle, content, price, pic_url, sort_order, goods } = data
  if (!title || !content) return response.badArgument()

  const result = await execute(
    'INSERT INTO litemall_topic (title, subtitle, content, price, pic_url, sort_order, goods, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [title, subtitle || '', content, price || 0, pic_url || '', sort_order || 100, JSON.stringify(goods || [])]
  )
  return response.ok({ id: result.insertId })
}

async function update(data) {
  const { id, title, subtitle, content, price, pic_url, sort_order, goods } = data
  if (!id) return response.badArgument()
  const sets = []
  const params = []
  if (title !== undefined) { sets.push('title = ?'); params.push(title) }
  if (subtitle !== undefined) { sets.push('subtitle = ?'); params.push(subtitle) }
  if (content !== undefined) { sets.push('content = ?'); params.push(content) }
  if (price !== undefined) { sets.push('price = ?'); params.push(price) }
  if (pic_url !== undefined) { sets.push('pic_url = ?'); params.push(pic_url) }
  if (sort_order !== undefined) { sets.push('sort_order = ?'); params.push(sort_order) }
  if (goods !== undefined) { sets.push('goods = ?'); params.push(JSON.stringify(goods)) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_topic SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('UPDATE litemall_topic SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

async function batchDelete(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()
  const placeholders = ids.map(() => '?').join(',')
  await execute(`UPDATE litemall_topic SET deleted = 1 WHERE id IN (${placeholders}) AND deleted = 0`, ids)
  return response.ok()
}

module.exports = { list, read, create, update, delete: deleteFn, batchDelete }
