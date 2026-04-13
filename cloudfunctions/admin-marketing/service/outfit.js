/**
 * admin-marketing/service/outfit.js — 穿搭推荐管理 CRUD
 *
 * 接口：list, read, create, update, delete
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'add_time', 'sort_order']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

// ==================== 穿搭列表 ====================

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []

  if (data.title) { where.push('title LIKE ?'); params.push(`%${data.title}%`) }
  if (data.status !== undefined) { where.push('status = ?'); params.push(data.status) }

  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_outfit WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT * FROM litemall_outfit WHERE ${whereClause} ORDER BY ${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  // 附加商品摘要
  const resultList = []
  for (const item of listRows) {
    const outfit = { ...item }
    if (item.goods_ids) {
      try {
        const goodsIdArr = JSON.parse(item.goods_ids)
        if (Array.isArray(goodsIdArr) && goodsIdArr.length > 0) {
          const placeholders = goodsIdArr.map(() => '?').join(',')
          const goodsRows = await query(
            `SELECT id, name, pic_url, retail_price FROM litemall_goods WHERE id IN (${placeholders}) AND deleted = 0`,
            goodsIdArr
          )
          outfit.goodsList = goodsRows
        }
      } catch (e) { /* ignore */ }
    }
    resultList.push(outfit)
  }

  return response.okList(resultList, total, page, limit)
}

// ==================== 穿搭详情 ====================

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_outfit WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  const outfit = rows[0]
  if (outfit.goods_ids) {
    try {
      const goodsIdArr = JSON.parse(outfit.goods_ids)
      if (Array.isArray(goodsIdArr) && goodsIdArr.length > 0) {
        const placeholders = goodsIdArr.map(() => '?').join(',')
        const goodsRows = await query(
          `SELECT id, name, pic_url, retail_price FROM litemall_goods WHERE id IN (${placeholders}) AND deleted = 0`,
          goodsIdArr
        )
        outfit.goodsList = goodsRows
      }
    } catch (e) { /* ignore */ }
  }

  return response.ok(outfit)
}

// ==================== 创建穿搭 ====================

async function create(data) {
  const { title, coverPic, content, goodsIds, status, sortOrder } = data
  if (!title) return response.badArgument()

  const result = await execute(
    `INSERT INTO litemall_outfit (title, cover_pic, content, goods_ids, status, sort_order, add_time, update_time, deleted)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
    [
      title, coverPic || '', content || '',
      Array.isArray(goodsIds) ? JSON.stringify(goodsIds) : (goodsIds || '[]'),
      status !== undefined ? status : 0, sortOrder || 100,
    ]
  )
  return response.ok({ id: result.insertId })
}

// ==================== 更新穿搭 ====================

async function update(data) {
  const { id, title, coverPic, content, goodsIds, status, sortOrder } = data
  if (!id) return response.badArgument()

  const sets = []
  const params = []
  if (title !== undefined) { sets.push('title = ?'); params.push(title) }
  if (coverPic !== undefined) { sets.push('cover_pic = ?'); params.push(coverPic) }
  if (content !== undefined) { sets.push('content = ?'); params.push(content) }
  if (goodsIds !== undefined) {
    sets.push('goods_ids = ?')
    params.push(Array.isArray(goodsIds) ? JSON.stringify(goodsIds) : goodsIds)
  }
  if (status !== undefined) { sets.push('status = ?'); params.push(status) }
  if (sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(sortOrder) }
  sets.push('update_time = NOW()')
  params.push(id)

  await execute(`UPDATE litemall_outfit SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

// ==================== 删除穿搭 ====================

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()

  await execute('UPDATE litemall_outfit SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, read, create, update, delete: deleteFn }
