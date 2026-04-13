/**
 * 管理端穿搭接口
 *
 * 迁移自 WxManagerOutfitController
 * 接口：outfitList, outfitRead, outfitCreate, outfitUpdate, outfitDelete, outfitStatus
 */

const { db, response } = require('layer-base')

// ==================== 穿搭列表 ====================

async function outfitList(data) {
  const page = data.page || 1
  const limit = data.limit || 50
  const offset = (page - 1) * limit

  const rows = await db.query(
    `SELECT * FROM litemall_outfit WHERE deleted = 0
     ORDER BY sort_order ASC LIMIT ${offset}, ${limit}`
  )

  // 组装商品列表 + camelCase 转换
  const result = []
  for (const outfit of rows) {
    result.push({
      id: outfit.id,
      title: outfit.title,
      description: outfit.description,
      coverPic: outfit.cover_pic,
      brandColor: outfit.brand_color,
      brandPosition: outfit.brand_position,
      floatPosition: outfit.float_position,
      sortOrder: outfit.sort_order,
      status: outfit.status,
      tags: outfit.tags,
      addTime: outfit.add_time,
      updateTime: outfit.update_time,
      goodsList: await buildGoodsList(outfit.goods_ids),
    })
  }

  return response.ok(result)
}

// ==================== 穿搭详情 ====================

async function outfitRead(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_outfit WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const o = rows[0]
  return response.ok({
    id: o.id,
    title: o.title,
    description: o.description,
    coverPic: o.cover_pic,
    brandColor: o.brand_color,
    brandPosition: o.brand_position,
    floatPosition: o.float_position,
    sortOrder: o.sort_order,
    status: o.status,
    tags: o.tags,
    addTime: o.add_time,
    updateTime: o.update_time,
    goodsList: await buildGoodsList(o.goods_ids),
  })
}

// ==================== 创建穿搭 ====================

async function outfitCreate(data) {
  const { title, coverPic } = data
  if (!title) return response.fail(401, '穿搭标题不能为空')
  if (!coverPic) return response.fail(401, '封面图片不能为空')

  const result = await db.query(
    `INSERT INTO litemall_outfit
      (title, cover_pic, description, goods_ids, sort_order, status, deleted, add_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
    [
      title,
      coverPic,
      data.description || '',
      data.goodsIds ? JSON.stringify(data.goodsIds) : '[]',
      data.sortOrder || 0,
      data.status !== undefined ? data.status : 1,
    ]
  )

  return response.ok({ id: result.insertId, ...data })
}

// ==================== 更新穿搭 ====================

async function outfitUpdate(data) {
  const { id, title, coverPic } = data
  if (!id) return response.badArgument()

  const existRows = await db.query(
    `SELECT id FROM litemall_outfit WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (existRows.length === 0) return response.badArgumentValue()

  if (!title) return response.fail(401, '穿搭标题不能为空')
  if (!coverPic) return response.fail(401, '封面图片不能为空')

  await db.query(
    `UPDATE litemall_outfit
     SET title = ?, cover_pic = ?, description = ?, goods_ids = ?,
         sort_order = ?, status = ?, update_time = NOW()
     WHERE id = ?`,
    [
      title, coverPic, data.description || '',
      data.goodsIds ? JSON.stringify(data.goodsIds) : '[]',
      data.sortOrder || 0, data.status !== undefined ? data.status : 1,
      id,
    ]
  )

  return response.ok()
}

// ==================== 删除穿搭 ====================

async function outfitDelete(data) {
  const { id } = data
  if (!id) return response.badArgument()

  await db.query(
    `UPDATE litemall_outfit SET deleted = 1 WHERE id = ?`,
    [id]
  )

  return response.ok()
}

// ==================== 更新状态 ====================

async function outfitStatus(data) {
  const { id, status } = data
  if (!id || status === undefined) return response.badArgument()

  const rows = await db.query(
    `SELECT id FROM litemall_outfit WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  await db.query(
    `UPDATE litemall_outfit SET status = ?, update_time = NOW() WHERE id = ?`,
    [status, id]
  )

  return response.ok()
}

// ==================== 内部方法 ====================

async function buildGoodsList(goodsIdsJson) {
  if (!goodsIdsJson) return []

  let goodsIds
  try {
    goodsIds = JSON.parse(goodsIdsJson)
  } catch (e) {
    return []
  }
  if (!Array.isArray(goodsIds) || goodsIds.length === 0) return []

  const rows = await db.query(
    `SELECT id, name, pic_url, retail_price FROM litemall_goods WHERE id IN (${goodsIds.map(() => '?').join(',')}) AND deleted = 0`,
    goodsIds
  )

  return rows.map(g => ({
    id: g.id,
    name: g.name,
    picUrl: g.pic_url,
    retailPrice: g.retail_price,
  }))
}

module.exports = {
  outfitList, outfitRead, outfitCreate, outfitUpdate, outfitDelete, outfitStatus,
}
