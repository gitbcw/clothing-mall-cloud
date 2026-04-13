/**
 * 收货地址接口
 *
 * 迁移自 WxAddressController
 * 接口：list, detail, save, remove
 */

const { db, response } = require('layer-base')

// ==================== 地址列表 ====================

async function list(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const rows = await db.query(
    `SELECT * FROM litemall_address WHERE user_id = ? AND deleted = 0 ORDER BY id DESC`,
    [userId]
  )

  return response.ok({
    list: rows.map(r => ({
      id: r.id, name: r.name, tel: r.tel, province: r.province,
      city: r.city, county: r.county, areaCode: r.area_code,
      addressDetail: r.address_detail, postalCode: r.postal_code,
      isDefault: !!r.is_default, addTime: r.add_time, updateTime: r.update_time,
    })),
    total: rows.length,
  })
}

// ==================== 地址详情 ====================

async function detail(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_address WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [id, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const r = rows[0]
  return response.ok({
    id: r.id, name: r.name, tel: r.tel, province: r.province,
    city: r.city, county: r.county, areaCode: r.area_code,
    addressDetail: r.address_detail, postalCode: r.postal_code,
    isDefault: !!r.is_default, addTime: r.add_time, updateTime: r.update_time,
  })
}

// ==================== 保存地址 ====================

async function save(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { id, name, tel, province, city, county, areaCode, addressDetail, isDefault, postalCode } = data

  // 参数验证
  if (!name || !tel || !province || !city || !county || !areaCode || !addressDetail || isDefault == null) {
    return response.badArgument()
  }

  // 手机号简单验证
  if (!/^1[3-9]\d{9}$/.test(tel)) {
    return response.badArgument()
  }

  if (id == null || id === 0) {
    // 新增
    if (isDefault) {
      await db.query(
        `UPDATE litemall_address SET is_default = 0 WHERE user_id = ? AND deleted = 0`,
        [userId]
      )
    }
    const result = await db.query(
      `INSERT INTO litemall_address
        (name, user_id, province, city, county, address_detail, area_code, postal_code, tel, is_default, add_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
      [name, userId, province, city, county, addressDetail, areaCode, postalCode || '', tel, isDefault ? 1 : 0]
    )
    return response.ok(result.insertId)
  } else {
    // 更新：先验证归属
    const rows = await db.query(
      `SELECT * FROM litemall_address WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
      [id, userId]
    )
    if (rows.length === 0) return response.badArgumentValue()

    if (isDefault) {
      await db.query(
        `UPDATE litemall_address SET is_default = 0 WHERE user_id = ? AND deleted = 0`,
        [userId]
      )
    }

    await db.query(
      `UPDATE litemall_address
       SET name = ?, province = ?, city = ?, county = ?, address_detail = ?,
           area_code = ?, postal_code = ?, tel = ?, is_default = ?, update_time = NOW()
       WHERE id = ?`,
      [name, province, city, county, addressDetail, areaCode, postalCode || '', tel, isDefault ? 1 : 0, id]
    )
    return response.ok(id)
  }
}

// ==================== 删除地址 ====================

async function remove(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_address WHERE id = ? AND user_id = ? AND deleted = 0 LIMIT 1`,
    [id, userId]
  )
  if (rows.length === 0) return response.badArgumentValue()

  await db.query(
    `UPDATE litemall_address SET deleted = 1 WHERE id = ?`,
    [id]
  )

  return response.ok()
}

module.exports = { list, detail, save, remove }
