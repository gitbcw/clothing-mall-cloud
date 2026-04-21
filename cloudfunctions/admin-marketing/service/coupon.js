/**
 * admin-marketing/service/coupon.js — 优惠券管理 + 用户优惠券 + 手动发放
 *
 * 接口：list, listuser, create, read, update, delete, assign
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'add_time']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

// ==================== 优惠券列表 ====================

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['deleted = 0']
  const params = []

  if (data.name) { where.push('name LIKE ?'); params.push(`%${data.name}%`) }
  if (data.type !== undefined) { where.push('type = ?'); params.push(data.type) }
  if (data.status !== undefined) { where.push('status = ?'); params.push(data.status) }

  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_coupon WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT * FROM litemall_coupon WHERE ${whereClause} ORDER BY ${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

// ==================== 用户优惠券列表 ====================

async function listuser(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['cu.deleted = 0']
  const params = []

  if (data.userId) { where.push('cu.user_id = ?'); params.push(data.userId) }
  if (data.couponId) { where.push('cu.coupon_id = ?'); params.push(data.couponId) }
  if (data.status !== undefined) { where.push('cu.status = ?'); params.push(data.status) }

  const whereClause = where.join(' AND ')
  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_coupon_user cu WHERE ${whereClause}`, params
  )
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT cu.*, c.name AS coupon_name, c.type AS coupon_type, c.discount, c.min AS min_goods_amount
     FROM litemall_coupon_user cu
     LEFT JOIN litemall_coupon c ON cu.coupon_id = c.id
     WHERE ${whereClause} ORDER BY cu.${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

// ==================== 创建优惠券 ====================

async function create(data) {
  const { name, type, desc, tag, total, discount, min, limit, status,
    timeType, days, startTime, endTime,
    discountType, itemLimit, goodsType, goodsValue, code } = data
  if (!name) return response.badArgument()

  const result = await execute(
    `INSERT INTO litemall_coupon
      (name, type, \`desc\`, tag, total, discount, \`min\`, \`limit\`, status,
       time_type, days, start_time, end_time,
       discount_type, item_limit, goods_type, goods_value, code,
       add_time, update_time, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
    [
      name, type || 0, desc || '', tag || '', total || 0,
      discount || 0, min || 0, limit || 0, status !== undefined ? status : 0,
      timeType || 0, days || 0, startTime || null, endTime || null,
      discountType || 0, itemLimit || 0, goodsType || 0,
      goodsValue ? JSON.stringify(goodsValue) : '', code || '',
    ]
  )
  return response.ok({ id: result.insertId })
}

// ==================== 优惠券详情 ====================

async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_coupon WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(rows[0])
}

// ==================== 更新优惠券 ====================

async function update(data) {
  const { id, name, type, desc, tag, total, discount, min, limit, status,
    timeType, days, startTime, endTime,
    discountType, itemLimit, goodsType, goodsValue, code } = data
  if (!id) return response.badArgument()

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (type !== undefined) { sets.push('type = ?'); params.push(type) }
  if (desc !== undefined) { sets.push('`desc` = ?'); params.push(desc) }
  if (tag !== undefined) { sets.push('tag = ?'); params.push(tag) }
  if (total !== undefined) { sets.push('total = ?'); params.push(total) }
  if (discount !== undefined) { sets.push('discount = ?'); params.push(discount) }
  if (min !== undefined) { sets.push('`min` = ?'); params.push(min) }
  if (limit !== undefined) { sets.push('`limit` = ?'); params.push(limit) }
  if (status !== undefined) { sets.push('status = ?'); params.push(status) }
  if (timeType !== undefined) { sets.push('time_type = ?'); params.push(timeType) }
  if (days !== undefined) { sets.push('days = ?'); params.push(days) }
  if (startTime !== undefined) { sets.push('start_time = ?'); params.push(startTime) }
  if (endTime !== undefined) { sets.push('end_time = ?'); params.push(endTime) }
  if (discountType !== undefined) { sets.push('discount_type = ?'); params.push(discountType) }
  if (itemLimit !== undefined) { sets.push('item_limit = ?'); params.push(itemLimit) }
  if (goodsType !== undefined) { sets.push('goods_type = ?'); params.push(goodsType) }
  if (goodsValue !== undefined) { sets.push('goods_value = ?'); params.push(JSON.stringify(goodsValue)) }
  if (code !== undefined) { sets.push('code = ?'); params.push(code) }
  sets.push('update_time = NOW()')
  params.push(id)

  await execute(`UPDATE litemall_coupon SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)
  return response.ok()
}

// ==================== 删除优惠券 ====================

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()

  await execute('UPDATE litemall_coupon SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

// ==================== 手动发放优惠券 ====================

async function assign(data) {
  const { userId, couponId } = data
  if (!userId || !couponId) return response.badArgument()

  // 校验用户
  const userRows = await query('SELECT id FROM litemall_user WHERE id = ? AND deleted = 0', [userId])
  if (userRows.length === 0) return response.badArgumentValue()

  // 校验优惠券
  const couponRows = await query('SELECT * FROM litemall_coupon WHERE id = ? AND deleted = 0 AND status = 0', [couponId])
  if (couponRows.length === 0) return response.badArgumentValue()

  const coupon = couponRows[0]

  // 计算有效期（time_type=0: 领取后N天, time_type=1: 固定日期）
  let startTime = coupon.start_time || new Date()
  let endTime = coupon.end_time
  if (coupon.time_type === 0 && coupon.days > 0) {
    const d = new Date()
    startTime = d
    endTime = new Date(d.getTime() + coupon.days * 86400000)
  }
  if (!endTime) {
    const d = new Date()
    endTime = new Date(d.getTime() + 30 * 86400000) // 默认 30 天
  }

  await execute(
    `INSERT INTO litemall_coupon_user (user_id, coupon_id, start_time, end_time, status, add_time, update_time, deleted)
     VALUES (?, ?, ?, ?, 0, NOW(), NOW(), 0)`,
    [userId, couponId, startTime, endTime]
  )

  return response.ok()
}

module.exports = { list, listuser, create, read, update, delete: deleteFn, assign }
