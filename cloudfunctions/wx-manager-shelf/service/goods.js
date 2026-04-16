/**
 * 管理端商品接口
 *
 * 迁移自 WxManagerGoodsController
 * 接口：category, list, detail, edit, publish, unpublish, batchDelete, unpublishAll, create
 */

const { db, response } = require('layer-base')

// ==================== 字段转换 ====================

function toGoodsCamel(row) {
  const result = {
    id: row.id, goodsSn: row.goods_sn, name: row.name,
    categoryId: row.category_id, brandId: row.brand_id,
    gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : (row.gallery || []),
    keywords: row.keywords, brief: row.brief,
    status: row.status, sortOrder: row.sort_order,
    picUrl: row.pic_url, shareUrl: row.share_url,
    isNew: !!row.is_new, isHot: !!row.is_hot,
    isSpecialPrice: row.is_special_price,
    retailPrice: row.retail_price,
    specialPrice: row.special_price,
    unit: row.unit, addTime: row.add_time, updateTime: row.update_time,
  }
  if (row.detail !== undefined) result.detail = row.detail
  if (row.scene_tags !== undefined) result.sceneTags = row.scene_tags
  if (row.goods_params !== undefined) result.goodsParams = row.goods_params
  return result
}

// ==================== 分类列表 ====================

async function category() {
  const rows = await db.query(
    `SELECT id, name, icon_url, pic_url, level, sort_order
     FROM litemall_category WHERE deleted = 0
     ORDER BY sort_order ASC LIMIT 100`
  )
  return response.ok(rows)
}

// ==================== 商品列表 ====================

async function list(data) {
  const status = data.status || 'all'
  const keyword = data.keyword || ''
  const page = data.page || 1
  const limit = data.limit || 20
  const offset = (page - 1) * limit

  // status → 查询条件映射
  let where = 'WHERE deleted = 0'
  const params = []

  switch (status) {
    case 'draft':
      where += ' AND status = ?'
      params.push('draft')
      break
    case 'pending':
      where += ' AND status = ?'
      params.push('pending')
      break
    case 'on_sale':
      where += ' AND status = ?'
      params.push('published')
      break
    case 'all':
      break
    default:
      return response.badArgumentValue()
  }

  if (keyword) {
    where += ' AND name LIKE ?'
    params.push(`%${keyword}%`)
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_goods ${where}`,
    params
  )
  const total = countResult[0].total

  const goodsRows = await db.query(
    `SELECT * FROM litemall_goods ${where} ORDER BY update_time DESC, id DESC LIMIT ${offset}, ${limit}`,
    params
  )

  // 各 tab 数量
  const [allCount, draftCount, pendingCount, onSaleCount] = await Promise.all([
    db.query(`SELECT COUNT(*) as c FROM litemall_goods WHERE deleted = 0`),
    db.query(`SELECT COUNT(*) as c FROM litemall_goods WHERE deleted = 0 AND status = 'draft'`),
    db.query(`SELECT COUNT(*) as c FROM litemall_goods WHERE deleted = 0 AND status = 'pending'`),
    db.query(`SELECT COUNT(*) as c FROM litemall_goods WHERE deleted = 0 AND status = 'published'`),
  ])

  return response.ok({
    list: goodsRows.map(toGoodsCamel),
    total,
    pages: Math.ceil(total / limit),
    allCount: allCount[0].c,
    draftCount: draftCount[0].c,
    pendingCount: pendingCount[0].c,
    onSaleCount: onSaleCount[0].c,
  })
}

// ==================== 商品详情 ====================

async function detail(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_goods WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const goods = toGoodsCamel(rows[0])

  // SKU 列表
  const skuRows = await db.query(
    `SELECT * FROM clothing_goods_sku WHERE goods_id = ? AND deleted = 0`,
    [id]
  )

  return response.ok({ goods, skuList: skuRows })
}

// ==================== 编辑商品 ====================

async function edit(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM litemall_goods WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  // 构建更新字段
  const updates = []
  const params = []

  const fields = {
    name: 'name', brief: 'brief', categoryId: 'category_id', brandId: 'brand_id',
    retailPrice: 'retail_price', picUrl: 'pic_url', detail: 'detail',
    keywords: 'keywords',
  }

  for (const [key, col] of Object.entries(fields)) {
    if (data[key] !== undefined) {
      updates.push(`${col} = ?`)
      params.push(data[key])
    }
  }

  // 特价
  if (data.specialPrice !== undefined) {
    if (data.specialPrice !== null && data.specialPrice !== '') {
      updates.push('special_price = ?, is_special_price = 1')
      params.push(data.specialPrice)
    } else {
      updates.push('special_price = NULL, is_special_price = 0')
    }
  }

  // JSON 字段
  if (data.scenes !== undefined) {
    updates.push('scene_tags = ?')
    params.push(JSON.stringify(data.scenes))
  }
  if (data.params !== undefined) {
    updates.push('goods_params = ?')
    params.push(JSON.stringify(data.params))
  }
  if (data.gallery !== undefined) {
    updates.push('gallery = ?')
    params.push(JSON.stringify(data.gallery))
  }

  if (updates.length === 0) return response.ok()

  params.push(id)
  await db.query(
    `UPDATE litemall_goods SET ${updates.join(', ')}, update_time = NOW() WHERE id = ?`,
    params
  )

  // 更新 SKU 列表
  if (data.skus && Array.isArray(data.skus)) {
    await updateSkus(id, data.skus)
  }

  return response.ok()
}

// ==================== 上架 ====================

async function publish(data) {
  const ids = extractIds(data)
  if (ids.length === 0) return response.badArgument()

  await db.query(
    `UPDATE litemall_goods SET status = 'published', update_time = NOW()
     WHERE id IN (${ids.map(() => '?').join(',')}) AND deleted = 0`,
    ids
  )

  return response.ok()
}

// ==================== 下架 ====================

async function unpublish(data) {
  const ids = extractIds(data)
  if (ids.length === 0) return response.badArgument()

  await db.query(
    `UPDATE litemall_goods SET status = 'pending', update_time = NOW()
     WHERE id IN (${ids.map(() => '?').join(',')}) AND deleted = 0`,
    ids
  )

  return response.ok()
}

// ==================== 批量删除 ====================

async function batchDelete(data) {
  const ids = extractIds(data)
  if (ids.length === 0) return response.badArgument()

  await db.query(
    `UPDATE litemall_goods SET deleted = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  )

  return response.ok()
}

// ==================== 一键下架全部 ====================

async function unpublishAll() {
  await db.query(
    `UPDATE litemall_goods SET status = 'pending', update_time = NOW()
     WHERE deleted = 0 AND status = 'published'`
  )

  return response.ok()
}

// ==================== 创建草稿 ====================

async function create(data) {
  const name = data.name
  if (!name || !name.trim()) return response.badArgument()

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    // 插入商品
    const retailPrice = data.retailPrice || 0

    const result = await conn.query(
      `INSERT INTO litemall_goods
        (name, category_id, brief, detail, keywords, retail_price,
         special_price, is_special_price, pic_url, gallery, scene_tags, goods_params,
         status, is_on_sale, deleted, add_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0, 0, NOW(), NOW())`,
      [
        name.trim(),
        data.categoryId || null,
        data.brief || '',
        data.detail || '',
        data.keywords || '',
        retailPrice,
        data.specialPrice || null,
        data.specialPrice ? 1 : 0,
        data.picUrl || data.sourceImage || '',
        data.gallery ? JSON.stringify(data.gallery) : null,
        data.scenes ? JSON.stringify(data.scenes) : null,
        data.params ? JSON.stringify(data.params) : null,
      ]
    )
    const goodsId = result[0].insertId

    // 插入 SKU
    if (data.skus && Array.isArray(data.skus) && data.skus.length > 0) {
      let minPrice = null
      for (const sku of data.skus) {
        const price = parseFloat(sku.price) || 0
        if (price > 0 && (minPrice === null || price < minPrice)) {
          minPrice = price
        }
        await conn.query(
          `INSERT INTO clothing_goods_sku
            (goods_id, color, size, price, stock, status, deleted, add_time)
           VALUES (?, ?, ?, ?, ?, 1, 0, NOW())`,
          [goodsId, sku.color || '', sku.size || '', price, sku.stock || 0]
        )
      }

      // SKU 最低价覆盖零售价
      if (minPrice !== null) {
        await conn.query(
          `UPDATE litemall_goods SET retail_price = ? WHERE id = ?`,
          [minPrice, goodsId]
        )
      }
    }

    await conn.commit()
    return response.ok(goodsId)
  } catch (err) {
    await conn.rollback()
    console.error('[wx-manager-shelf] create error:', err)
    return response.fail(500, '创建失败：' + err.message)
  } finally {
    conn.release()
  }
}

// ==================== 内部方法 ====================

function extractIds(data) {
  if (data.ids && Array.isArray(data.ids) && data.ids.length > 0) {
    return data.ids
  }
  if (data.id) {
    return [data.id]
  }
  return []
}

async function updateSkus(goodsId, skus) {
  const existingRows = await db.query(
    `SELECT id FROM clothing_goods_sku WHERE goods_id = ? AND deleted = 0`,
    [goodsId]
  )
  const existingIds = new Set(existingRows.map(r => r.id))
  const submittedIds = new Set()

  let minPrice = null
  for (const sku of skus) {
    const price = parseFloat(sku.price) || 0
    if (price > 0 && (minPrice === null || price < minPrice)) {
      minPrice = price
    }

    if (sku.id) {
      // 更新
      await db.query(
        `UPDATE clothing_goods_sku SET color = ?, size = ?, price = ?, stock = ?
         WHERE id = ? AND goods_id = ?`,
        [sku.color || '', sku.size || '', price, sku.stock || 0, sku.id, goodsId]
      )
      submittedIds.add(sku.id)
    } else {
      // 新增
      await db.query(
        `INSERT INTO clothing_goods_sku (goods_id, color, size, price, stock, status, deleted, add_time)
         VALUES (?, ?, ?, ?, ?, 1, 0, NOW())`,
        [goodsId, sku.color || '', sku.size || '', price, sku.stock || 0]
      )
    }
  }

  // 删除未提交的 SKU
  for (const eid of existingIds) {
    if (!submittedIds.has(eid)) {
      await db.query(
        `UPDATE clothing_goods_sku SET deleted = 1 WHERE id = ?`,
        [eid]
      )
    }
  }

  // 更新最低零售价
  if (minPrice !== null) {
    await db.query(
      `UPDATE litemall_goods SET retail_price = ? WHERE id = ?`,
      [minPrice, goodsId]
    )
  }
}

module.exports = {
  category, list, detail, edit, publish, unpublish, batchDelete, unpublishAll, create,
}
