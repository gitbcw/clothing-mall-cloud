/**
 * admin-goods/service/goods.js
 *
 * 商品管理：list/catAndBrand/read/create/update/delete/detail/findBySn/publish/unpublish/unpublishAll
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const BIT_FIELDS = ['is_new', 'is_hot', 'is_on_sale', 'is_special_price', 'deleted']
const ACCESSORY_CATEGORY_CONDITION = `(c.id IS NOT NULL AND (c.name = '饰品' OR c.name LIKE '%首饰%' OR c.keywords LIKE '%饰品%' OR c.keywords LIKE '%首饰%'))`

function normalizeBitFields(row) {
  for (const key of BIT_FIELDS) {
    const val = row[key]
    if (val == null) continue
    // mysql2 execute() 不触发 typeCast，BIT(1) 返回 Buffer；Buffer 是 truthy 不能直接 !!
    row[key] = Buffer.isBuffer(val) ? val[0] === 1 : !!val
  }
  return row
}

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
  if (data.status !== undefined && data.status !== '') { where.push('g.status = ?'); params.push(data.status) }
  if (data.is_special_price) { where.push('g.is_special_price = 1') }
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

  // 各状态 tab 计数
  const [allCount, draftCount, pendingCount, publishedCount] = await Promise.all([
    query('SELECT COUNT(*) AS total FROM litemall_goods WHERE deleted = 0'),
    query("SELECT COUNT(*) AS total FROM litemall_goods WHERE deleted = 0 AND status = 'draft'"),
    query("SELECT COUNT(*) AS total FROM litemall_goods WHERE deleted = 0 AND status = 'pending'"),
    query("SELECT COUNT(*) AS total FROM litemall_goods WHERE deleted = 0 AND status = 'published'"),
  ])

  return response.ok({
    list: listRows.map(normalizeBitFields),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
    allCount: allCount[0].total,
    draftCount: draftCount[0].total,
    pendingCount: pendingCount[0].total,
    publishedCount: publishedCount[0].total,
  })
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

  const [specifications, attributes, products, skuList] = await Promise.all([
    query('SELECT * FROM litemall_goods_specification WHERE goods_id = ? AND deleted = 0', [id]),
    query('SELECT * FROM litemall_goods_attribute WHERE goods_id = ? AND deleted = 0', [id]),
    query('SELECT * FROM litemall_goods_product WHERE goods_id = ? AND deleted = 0', [id]),
    query('SELECT * FROM clothing_goods_sku WHERE goods_id = ? AND deleted = 0', [id]),
  ])

  return response.ok({
    goods: normalizeBitFields(goods[0]),
    specifications,
    attributes,
    products,
    skuList,
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

  return response.ok(normalizeBitFields(rows[0]))
}

/**
 * 创建商品（商品 + 规格 + 参数 + 货品）
 */
async function create(data) {
  const { goods, specifications, attributes, products } = data
  if (!goods || !goods.name) return response.badArgument()

  const status = goods.status || 'draft'
  const retailPrice = goods.retail_price || 0

  const result = await execute(
    'INSERT INTO litemall_goods (name, goods_sn, category_id, brand_id, gallery, pic_url, detail, keywords, brief, status, is_new, is_hot, sort_order, retail_price, counter_price, special_price, is_special_price, scene_tags, goods_params, add_time, update_time, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)',
    [
      goods.name, goods.goods_sn || '', goods.category_id || 0, goods.brand_id || 0,
      JSON.stringify(goods.gallery || []), goods.pic_url || '', goods.detail || '',
      goods.keywords || '', goods.brief || '',
      status,
      goods.is_new ? 1 : 0, goods.is_hot ? 1 : 0,
      goods.sort_order || 100,
      retailPrice,
      goods.counter_price || null,
      goods.special_price || null, goods.special_price ? 1 : 0,
      goods.scene_tags ? JSON.stringify(goods.scene_tags) : null,
      goods.goods_params ? JSON.stringify(goods.goods_params) : null,
    ]
  )

  const goodsId = result.insertId
  await _saveSpecs(goodsId, specifications)
  await _saveAttrs(goodsId, attributes)
  await _saveProducts(goodsId, products)
  await _syncSceneTags(goodsId, goods.scene_tags)

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
  if (goods.category_id !== undefined) { sets.push('category_id = ?'); params.push(goods.category_id) }
  if (goods.brand_id !== undefined) { sets.push('brand_id = ?'); params.push(goods.brand_id) }
  if (goods.gallery !== undefined) { sets.push('gallery = ?'); params.push(JSON.stringify(goods.gallery)) }
  if (goods.pic_url !== undefined) { sets.push('pic_url = ?'); params.push(goods.pic_url) }
  if (goods.detail !== undefined) { sets.push('detail = ?'); params.push(goods.detail) }
  if (goods.keywords !== undefined) { sets.push('keywords = ?'); params.push(goods.keywords) }
  if (goods.brief !== undefined) { sets.push('brief = ?'); params.push(goods.brief) }
  if (goods.status !== undefined) { sets.push('status = ?'); params.push(goods.status) }
  if (goods.is_on_sale !== undefined) { sets.push('is_on_sale = ?'); params.push(goods.is_on_sale ? 1 : 0) }
  if (goods.is_new !== undefined) { sets.push('is_new = ?'); params.push(goods.is_new ? 1 : 0) }
  if (goods.is_hot !== undefined) { sets.push('is_hot = ?'); params.push(goods.is_hot ? 1 : 0) }
  if (goods.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(goods.sort_order) }
  if (goods.retail_price !== undefined) { sets.push('retail_price = ?'); params.push(goods.retail_price) }
  if (goods.counter_price !== undefined) { sets.push('counter_price = ?'); params.push(goods.counter_price) }
  if (goods.special_price !== undefined) { sets.push('special_price = ?'); params.push(goods.special_price) }
  if (goods.is_special_price !== undefined) { sets.push('is_special_price = ?'); params.push(goods.is_special_price ? 1 : 0) }
  if (goods.scene_tags !== undefined) { sets.push('scene_tags = ?'); params.push(JSON.stringify(goods.scene_tags)) }
  if (goods.goods_params !== undefined) { sets.push('goods_params = ?'); params.push(JSON.stringify(goods.goods_params)) }
  if (goods.share_url !== undefined) { sets.push('share_url = ?'); params.push(goods.share_url) }
  sets.push('update_time = NOW()')

  params.push(goods.id)
  await execute(`UPDATE litemall_goods SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`, params)

  if (specifications) await _saveSpecs(goods.id, specifications)
  if (attributes) await _saveAttrs(goods.id, attributes)
  if (products) await _saveProducts(goods.id, products)
  if (goods.scene_tags !== undefined || goods.category_id !== undefined) {
    let sceneTags = goods.scene_tags
    if (sceneTags === undefined) {
      const sceneRows = await query('SELECT scene_tags FROM litemall_goods WHERE id = ? AND deleted = 0', [goods.id])
      sceneTags = parseSceneTags(sceneRows[0] ? sceneRows[0].scene_tags : null)
    }
    await _syncSceneTags(goods.id, sceneTags)
  }

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
  await execute(`UPDATE litemall_goods SET status = 'published', update_time = NOW() WHERE id IN (${placeholders}) AND deleted = 0`, ids)
  return response.ok()
}

/**
 * 下架
 */
async function unpublish(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  const placeholders = ids.map(() => '?').join(',')
  await execute(`UPDATE litemall_goods SET status = 'pending', update_time = NOW() WHERE id IN (${placeholders}) AND deleted = 0`, ids)
  return response.ok()
}

/**
 * 一键下架
 */
async function unpublishAll() {
  await execute("UPDATE litemall_goods SET status = 'pending', update_time = NOW() WHERE deleted = 0 AND status = 'published'")
  return response.ok()
}

/**
 * 批量设置特价
 */
async function setSpecialPrice(data) {
  const { ids, specialPrice } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  const placeholders = ids.map(() => '?').join(',')
  if (specialPrice !== undefined && specialPrice !== null) {
    await execute(
      `UPDATE litemall_goods SET is_special_price = 1, special_price = ?, update_time = NOW() WHERE id IN (${placeholders}) AND deleted = 0`,
      [specialPrice, ...ids]
    )
  } else {
    await execute(
      `UPDATE litemall_goods SET is_special_price = 1, update_time = NOW() WHERE id IN (${placeholders}) AND deleted = 0`,
      ids
    )
  }
  return response.ok()
}

/**
 * 批量取消特价
 */
async function cancelSpecialPrice(data) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  const placeholders = ids.map(() => '?').join(',')
  await execute(
    `UPDATE litemall_goods SET is_special_price = 0, special_price = NULL, update_time = NOW() WHERE id IN (${placeholders}) AND deleted = 0`,
    ids
  )
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

/**
 * 同步场景标签到 clothing_goods_scene 关联表
 * sceneTags: 场景名称数组，如 ['日常通勤', '约会聚餐']
 */
async function _syncSceneTags(goodsId, sceneTags) {
  // 先清除该商品的所有场景关联
  await execute('DELETE FROM clothing_goods_scene WHERE goods_id = ?', [goodsId])

  if (await _isAccessoryGoods(goodsId)) {
    await execute('UPDATE litemall_goods SET scene_tags = NULL WHERE id = ?', [goodsId])
    return
  }

  // 没有 sceneTags 则仅清除
  if (!sceneTags || !Array.isArray(sceneTags) || sceneTags.length === 0) return

  // 查找场景名称对应的 scene_id
  const names = [...new Set(sceneTags.map(tag => String(tag || '').trim()).filter(Boolean))]
  if (names.length === 0) return

  const placeholders = names.map(() => '?').join(',')
  const scenes = await db.query(
    `SELECT id, name FROM clothing_scene WHERE name IN (${placeholders}) AND deleted = 0`,
    names
  )

  if (scenes.length === 0) return

  // 批量插入关联
  const values = scenes.map(s => `(${goodsId}, ${s.id}, NOW(), 0)`).join(',')
  await execute(`INSERT IGNORE INTO clothing_goods_scene (goods_id, scene_id, add_time, deleted) VALUES ${values}`)
}

async function _isAccessoryGoods(goodsId) {
  const rows = await query(
    `SELECT g.id
     FROM litemall_goods g
     JOIN litemall_category c ON c.id = g.category_id AND c.deleted = 0
     WHERE g.id = ? AND ${ACCESSORY_CATEGORY_CONDITION}
     LIMIT 1`,
    [goodsId]
  )
  return rows.length > 0
}

function parseSceneTags(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

module.exports = { list, catAndBrand, detail, findBySn, create, update, delete: deleteFn, publish, unpublish, unpublishAll, cancelSpecialPrice, setSpecialPrice }
