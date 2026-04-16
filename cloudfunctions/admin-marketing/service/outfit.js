/**
 * admin-marketing/service/outfit.js — 穿搭推荐管理 CRUD
 *
 * 对齐 wx-manager-content/service/outfit.js：
 * - 补充 brand_color, brand_position, float_position, description 字段
 * - 添加 outfitStatus 接口
 * - goods_ids 兼容数组和字符串
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'add_time', 'sort_order']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'sort_order'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

// 解析 goods_ids（兼容 mysql2 自动反序列化和字符串）
function parseGoodsIds(goodsIdsJson) {
  if (!goodsIdsJson) return []
  if (Array.isArray(goodsIdsJson)) return goodsIdsJson
  if (typeof goodsIdsJson === 'string') {
    try { return JSON.parse(goodsIdsJson) } catch (e) { return [] }
  }
  return []
}

// 查询商品摘要
async function buildGoodsList(goodsIdsJson) {
  const goodsIds = parseGoodsIds(goodsIdsJson)
  if (!Array.isArray(goodsIds) || goodsIds.length === 0) return []

  const placeholders = goodsIds.map(() => '?').join(',')
  const rows = await query(
    `SELECT id, name, pic_url, retail_price FROM litemall_goods WHERE id IN (${placeholders}) AND deleted = 0`,
    goodsIds
  )
  return rows.map(g => ({
    id: g.id,
    name: g.name,
    picUrl: g.pic_url,
    retailPrice: g.retail_price,
  }))
}

// snake → camel
function toOutfitCamel(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    coverPic: r.cover_pic,
    brandColor: r.brand_color,
    brandPosition: r.brand_position,
    floatPosition: r.float_position,
    sortOrder: r.sort_order,
    status: r.status,
    tags: r.tags,
    addTime: r.add_time,
    updateTime: r.update_time,
  }
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

  const resultList = []
  for (const item of listRows) {
    const outfit = toOutfitCamel(item)
    outfit.goodsList = await buildGoodsList(item.goods_ids)
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

  const outfit = toOutfitCamel(rows[0])
  outfit.goodsList = await buildGoodsList(rows[0].goods_ids)
  return response.ok(outfit)
}

// ==================== 创建穿搭 ====================

async function create(data) {
  const { title, coverPic } = data
  if (!title) return response.fail(401, '穿搭标题不能为空')

  const goodsIds = data.goodsIds ? (Array.isArray(data.goodsIds) ? data.goodsIds : parseGoodsIds(data.goodsIds)) : []

  const result = await execute(
    `INSERT INTO litemall_outfit
      (title, cover_pic, description, goods_ids, brand_color, brand_position, float_position, sort_order, status, deleted, add_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
    [
      title, coverPic || '', data.description || '',
      JSON.stringify(goodsIds),
      data.brandColor || 'white', data.brandPosition || 'top-right', data.floatPosition || 'left',
      data.sortOrder || 0, data.status !== undefined ? data.status : 1,
    ]
  )
  return response.ok({ id: result.insertId })
}

// ==================== 更新穿搭 ====================

async function update(data) {
  const { id, title, coverPic } = data
  if (!id) return response.badArgument()

  const existRows = await query('SELECT id FROM litemall_outfit WHERE id = ? AND deleted = 0', [id])
  if (existRows.length === 0) return response.badArgumentValue()

  if (title !== undefined && !title) return response.fail(401, '穿搭标题不能为空')

  const goodsIds = data.goodsIds !== undefined
    ? (Array.isArray(data.goodsIds) ? data.goodsIds : parseGoodsIds(data.goodsIds))
    : undefined

  const sets = []
  const params = []
  if (title !== undefined) { sets.push('title = ?'); params.push(title) }
  if (coverPic !== undefined) { sets.push('cover_pic = ?'); params.push(coverPic) }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
  if (goodsIds !== undefined) { sets.push('goods_ids = ?'); params.push(JSON.stringify(goodsIds)) }
  if (data.brandColor !== undefined) { sets.push('brand_color = ?'); params.push(data.brandColor) }
  if (data.brandPosition !== undefined) { sets.push('brand_position = ?'); params.push(data.brandPosition) }
  if (data.floatPosition !== undefined) { sets.push('float_position = ?'); params.push(data.floatPosition) }
  if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(data.sortOrder) }
  if (data.status !== undefined) { sets.push('status = ?'); params.push(data.status) }
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

// ==================== 启用/禁用穿搭 ====================

async function status(data) {
  const { id, status } = data
  if (!id || status === undefined) return response.badArgument()

  const rows = await query('SELECT id FROM litemall_outfit WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  await execute('UPDATE litemall_outfit SET status = ?, update_time = NOW() WHERE id = ?', [status, id])
  return response.ok()
}

module.exports = { list, read, create, update, delete: deleteFn, status }
