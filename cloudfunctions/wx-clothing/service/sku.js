/**
 * 服装 SKU 接口
 *
 * 迁移自 WxClothingSkuController
 * 接口：list, sizes, detail, query, checkStock
 */

const { db, response } = require('layer-base')

function toSkuCamel(r) {
  return {
    id: r.id, goodsId: r.goods_id, skuCode: r.sku_code,
    color: r.color, colorImage: r.color_image, size: r.size,
    price: r.price, stock: r.stock, barCode: r.bar_code,
    isDefault: !!r.is_default, addTime: r.add_time, updateTime: r.update_time,
  }
}

// ==================== SKU 列表（含颜色/尺码去重） ====================

async function skuList(data) {
  const { goodsId } = data
  if (!goodsId) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM clothing_goods_sku WHERE goods_id = ? AND deleted = 0`,
    [goodsId]
  )

  // 去重颜色列表（取第一个有图的 SKU）
  const colorMap = new Map()
  for (const sku of rows) {
    if (!colorMap.has(sku.color)) {
      colorMap.set(sku.color, {
        color: sku.color,
        colorImage: sku.color_image || sku.image_url || '',
      })
    }
  }

  // 去重尺码列表
  const sizeSet = new Set()
  for (const sku of rows) {
    if (sku.size) sizeSet.add(sku.size)
  }

  return response.ok({
    skuList: rows.map(toSkuCamel),
    colorList: Array.from(colorMap.values()),
    sizeList: Array.from(sizeSet),
  })
}

// ==================== 按颜色筛选尺码 ====================

async function skuSizes(data) {
  const { goodsId, color } = data
  if (!goodsId || !color) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM clothing_goods_sku WHERE goods_id = ? AND color = ? AND deleted = 0`,
    [goodsId, color]
  )

  return response.ok(rows.map(toSkuCamel))
}

// ==================== SKU 详情 ====================

async function skuDetail(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM clothing_goods_sku WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(toSkuCamel(rows[0]))
}

// ==================== 按商品+颜色+尺码查询 SKU ====================

async function skuQuery(data) {
  const { goodsId, color, size } = data
  if (!goodsId || !color || !size) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM clothing_goods_sku WHERE goods_id = ? AND color = ? AND size = ? AND deleted = 0 LIMIT 1`,
    [goodsId, color, size]
  )
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(toSkuCamel(rows[0]))
}

// ==================== 检查库存 ====================

async function skuCheckStock(data) {
  const { id, num } = data
  if (!id || num == null) return response.badArgument()

  const rows = await db.query(
    `SELECT stock FROM clothing_goods_sku WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  const stock = rows[0].stock || 0
  return response.ok({
    inStock: stock >= num,
    stock,
  })
}

module.exports = { skuList, skuSizes, skuDetail, skuQuery, skuCheckStock }
