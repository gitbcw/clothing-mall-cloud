/**
 * admin-goods/service/goods.js
 *
 * 商品管理：list/catAndBrand/read/create/update/delete/detail/findBySn/publish/unpublish/unpublishAll
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'name', 'add_time', 'update_time', 'sort_order', 'price']
function safeSort(sort, order) {
  const s = SORT_WHITELIST.includes(sort) ? sort : 'add_time'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

/**
 * 商品列表（分页）
 */
async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })

  const where = []
  const params = []
  if (data.goodsId) { where.push('g.id = ?'); params.push(data.goodsId) }
  if (data.goodsSn) { where.push('g.goods_sn LIKE ?'); params.push(`%${data.goodsSn}%`) }
  if (data.name) { where.push('g.name LIKE ?'); params.push(`%${data.name}%`) }
  if (data.status !== undefined && data.status !== '') { where.push('g.is_on_sale = ?'); params.push(data.status) }
  where.push('g.deleted = 0')
  const whereClause = where.join(' AND ')

  const { sort, order } = safeSort(data.sort, data.order)

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_goods g WHERE ${whereClause}`, params
  )
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT g.* FROM litemall_goods g WHERE ${whereClause} ORDER BY g.${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

/**
 * 分类和品牌列表（无分页，用于商品编辑页下拉）
 */
async function catAndBrand() {
  const [categories, brands] = await Promise.all([
    query('SELECT id, name, pid, level FROM litemall_category WHERE deleted = 0 AND pid = 0 ORDER BY sort_order ASC'),
    query('SELECT id, name, pic_url FROM litemall_brand WHERE deleted = 0 ORDER BY sort_order ASC'),
  ])

  return response.ok({ categoryList: categories, brandList: brands })
}

/**
 * 商品详情
 */
async function detail(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const goods = await query('SELECT * FROM litemall_goods WHERE id = ? AND deleted = 0', [id])
  if (goods.length === 0) return response.badArgumentValue()

  const [specifications, attributes, products] = await Promise.all([
    query('SELECT * FROM litemall_goods_specification WHERE goods_id = ? AND deleted = 0', [id]),
    query('SELECT * FROM litemall_goods_attribute WHERE goods_id = ? AND deleted = 0', [id]),
    query('SELECT * FROM litemall_goods_product WHERE goods_id = ? AND deleted = 0', [id]),
  ])

  return response.ok({
    goods: goods[0],
    specifications,
    attributes,
    products,
  })
}

/**
 * 按货号查询
 */
async function findBySn(data) {
  const { goodsSn } = data
  if (!goodsSn) return response.badArgument()

  const rows = await query('SELECT * FROM litemall_goods WHERE goods_sn = ? AND deleted = 0', [goodsSn])
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(rows[0])
}

/**
 * 创建商品（商品 + 规格 + 参数 + 货品）
 */
async function create(data) {
  const { goods, specifications, attributes, products } = data
  if (!goods || !goods.name) return response.badArgument()

  const result = await execute(
    'INSERT INTO litemall_goods (name, goods_sn, cat_id, brand_id, gallery, pic_url, detail, keywords, brief, is_on_sale, is_new, is_hot, sort_order, price, counter_price, retail_price, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [
      goods.name, goods.goods_sn || '', goods.cat_id || 0, goods.brand_id || 0,
      JSON.stringify(goods.gallery || []), goods.pic_url || '', goods.detail || '',
      goods.keywords || '', goods.brief || '',
      goods.is_on_sale !== false ? 1 : 0, goods.is_new ? 1 : 0, goods.is_hot ? 1 : 0,
      goods.sort_order || 100, goods.price || 0, goods.counter_price || 0, goods.retail_price || 0,
    ]
  )

  const goodsId = result.insertId
  await _saveSpecs(goodsId, specifications)
  await _saveAttrs(goodsId, attributes)
  await _saveProducts(goodsId, products)

  return response.ok({ id: goodsId })
}

/**
 * 更新商品
 */
async function update(data) {
  const { goods, specifications, attributes, products } = data
  if (!goods || !goods.id) return response.badArgument()

  const sets = []
  const params = []
  if (goods.name !== undefined) { sets.push('name = ?'); params.push(goods.name) }
  if (goods.goods_sn !== undefined) { sets.push('goods_sn = ?'); params.push(goods.goods_sn) }
  if (goods.cat_id !== undefined) { sets.push('cat_id = ?'); params.push(goods.cat_id) }
  if (goods.brand_id !== undefined) { sets.push('brand_id = ?'); params.push(goods.brand_id) }
  if (goods.gallery !== undefined) { sets.push('gallery = ?'); params.push(JSON.stringify(goods.gallery)) }
  if (goods.pic_url !== undefined) { sets.push('pic_url = ?'); params.push(goods.pic_url) }
  if (goods.detail !== undefined) { sets.push('detail = ?'); params.push(goods.detail) }
  if (goods.keywords !== undefined) { sets.push('keywords = ?'); params.push(goods.keywords) }
  if (goods.brief !== undefined) { sets.push('brief = ?'); params.push(goods.brief) }
  if (goods.is_on_sale !== undefined) { sets.push('is_on_sale = ?'); params.push(goods.is_on_sale ? 1 : 0) }
  if (goods.is_new !== undefined) { sets.push('is_new = ?'); params.push(goods.is_new ? 1 : 0) }
  if (goods.is_hot !== undefined) { sets.push('is_hot = ?'); params.push(goods.is_hot ? 1 : 0) }
  if (goods.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(goods.sort_order) }
  if (goods.price !== undefined) { sets.push('price = ?'); params.push(goods.price) }
  if (goods.counter_price !== undefined) { sets.push('counter_price = ?'); params.push(goods.counter_price) }
  if (goods.retail_price !== undefined) { sets.push('retail_price = ?'); params.push(goods.retail_price) }
  sets.push('update_time = NOW()')

  params.push(goods.id)
  await execute(`UPDATE litemall_goods SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)

  if (specifications) await _saveSpecs(goods.id, specifications)
  if (attributes) await _saveAttrs(goods.id, attributes)
  if (products) await _saveProducts(goods.id, products)

  return response.ok()
}

/**
 * 删除商品（逻辑删除）
 */
async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()

  await execute('UPDATE litemall_goods SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

/**
 * 上架
 */
async function publish(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  const placeholders = ids.map(() => '?').join(',')
  await execute(`UPDATE litemall_goods SET is_on_sale = 1, update_time = NOW() WHERE id IN (${placeholders}) AND deleted = 0`, ids)
  return response.ok()
}

/**
 * 下架
 */
async function unpublish(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  const placeholders = ids.map(() => '?').join(',')
  await execute(`UPDATE litemall_goods SET is_on_sale = 0, update_time = NOW() WHERE id IN (${placeholders}) AND deleted = 0`, ids)
  return response.ok()
}

/**
 * 一键下架
 */
async function unpublishAll() {
  await execute('UPDATE litemall_goods SET is_on_sale = 0, update_time = NOW() WHERE deleted = 0')
  return response.ok()
}

// --- 内部辅助函数 ---

async function _saveSpecs(goodsId, specs) {
  if (!Array.isArray(specs)) return
  await execute('DELETE FROM litemall_goods_specification WHERE goods_id = ?', [goodsId])
  for (const spec of specs) {
    await execute(
      'INSERT INTO litemall_goods_specification (goods_id, specification, value, pic_url, add_time, update_time, deleted) VALUES (?, ?, ?, ?, NOW(), NOW(), 0)',
      [goodsId, spec.specification || '', spec.value || '', spec.pic_url || '']
    )
  }
}

async function _saveAttrs(goodsId, attrs) {
  if (!Array.isArray(attrs)) return
  await execute('DELETE FROM litemall_goods_attribute WHERE goods_id = ?', [goodsId])
  for (const attr of attrs) {
    await execute(
      'INSERT INTO litemall_goods_attribute (goods_id, attribute, value, add_time, update_time, deleted) VALUES (?, ?, ?, NOW(), NOW(), 0)',
      [goodsId, attr.attribute || '', attr.value || '']
    )
  }
}

async function _saveProducts(goodsId, products) {
  if (!Array.isArray(products)) return
  await execute('DELETE FROM litemall_goods_product WHERE goods_id = ?', [goodsId])
  for (const p of products) {
    await execute(
      'INSERT INTO litemall_goods_product (goods_id, goods_sn, goods_name, specifications, price, number, url, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
      [goodsId, p.goods_sn || '', p.goods_name || '', p.specifications ? JSON.stringify(p.specifications) : '{}', p.price || 0, p.number || '', p.url || '']
    )
  }
}

module.exports = { list, catAndBrand, detail, findBySn, create, update, delete: deleteFn, publish, unpublish, unpublishAll }
