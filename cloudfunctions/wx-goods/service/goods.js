/**
 * 商品相关接口
 *
 * 迁移自 WxGoodsController
 * 接口：detail, category, list, related, count
 */

const { db, response } = require('layer-base')
const { wxAuth } = require('layer-auth')

function toBrandCamel(r) {
  return {
    id: r.id, name: r.name, desc: r.desc, picUrl: r.pic_url,
    floorPrice: r.floor_price, sortOrder: r.sort_order,
  }
}

function toCatCamel(r) {
  return {
    id: r.id, name: r.name, keywords: r.keywords, desc: r.desc,
    iconUrl: r.icon_url, picUrl: r.pic_url, level: r.level,
    pid: r.pid, sortOrder: r.sort_order,
    seasonSwitch: r.season_switch, enableSize: r.enable_size,
  }
}

/**
 * 商品行 → 驼峰字段（匹配小程序前端期望）
 */
function toGoodsCamel(row) {
  const result = {
    id: row.id,
    goodsSn: row.goods_sn,
    name: row.name,
    categoryId: row.category_id,
    brandId: row.brand_id,
    gallery: typeof row.gallery === 'string' ? JSON.parse(row.gallery || '[]') : (row.gallery || []),
    keywords: row.keywords,
    brief: row.brief,
    isOnSale: row.is_on_sale,
    status: row.status,
    sortOrder: row.sort_order,
    picUrl: row.pic_url,
    shareUrl: row.share_url,
    isNew: !!row.is_new,
    isHot: !!row.is_hot,
    isSpecialPrice: !!row.is_special_price,
    specialPrice: row.special_price,
    isPresale: row.is_presale,
    unit: row.unit,
    counterPrice: row.counter_price,
    retailPrice: row.retail_price,
    addTime: row.add_time,
    updateTime: row.update_time,
  }
  // 详情页独有字段
  if (row.detail !== undefined) result.detail = row.detail
  if (row.scene_tags !== undefined) result.sceneTags = row.scene_tags
  if (row.goods_params !== undefined) result.goodsParams = row.goods_params
  return result
}

// ==================== 商品详情 ====================

async function detail(data, context) {
  const id = data.id
  if (!id) return response.badArgument()

  // 并发查询（替代 Java 线程池）
  const [
    goodsRows,
    attributeRows,
    specificationRows,
    productRows,
    issueRows,
  ] = await Promise.all([
    // 商品基本信息
    db.query(
      `SELECT id, goods_sn, name, category_id, brand_id, gallery, keywords, brief,
              is_on_sale, status, sort_order, pic_url, share_url,
              is_new, is_hot, is_special_price, special_price, is_presale,
              unit, counter_price, retail_price, add_time, update_time,
              detail, scene_tags, goods_params
       FROM litemall_goods WHERE id = ? AND deleted = 0 LIMIT 1`,
      [id]
    ),
    // 商品属性
    db.query(
      `SELECT id, goods_id, attribute, value
       FROM litemall_goods_attribute WHERE goods_id = ? AND deleted = 0`,
      [id]
    ),
    // 商品规格（原始扁平数据）
    db.query(
      `SELECT id, goods_id, specification, value, pic_url
       FROM litemall_goods_specification WHERE goods_id = ? AND deleted = 0`,
      [id]
    ),
    // SKU 产品列表
    db.query(
      `SELECT id, goods_id, specifications, price, number, url
       FROM litemall_goods_product WHERE goods_id = ? AND deleted = 0`,
      [id]
    ),
    // 通用问题（最多4条）
    db.query(
      `SELECT id, question, answer FROM litemall_issue WHERE deleted = 0 LIMIT 4`
    ),
  ])

  if (goodsRows.length === 0) return response.badArgument()

  const goods = goodsRows[0]

  // 品牌信息
  let brand = null
  if (goods.brand_id) {
    const brandRows = await db.query(
      `SELECT id, name, \`desc\`, pic_url FROM litemall_brand WHERE id = ?`,
      [goods.brand_id]
    )
    if (brandRows.length > 0) brand = toBrandCamel(brandRows[0])
  }

  // 分类信息 + 尺码开关（继承逻辑）
  let enableSize = true
  if (goods.category_id) {
    const catRows = await db.query(
      `SELECT enable_size, pid FROM litemall_category WHERE id = ?`,
      [goods.category_id]
    )
    if (catRows.length > 0) {
      const cat = catRows[0]
      if (cat.pid && cat.pid > 0) {
        // L2 分类：查找 L1 父分类
        const parentRows = await db.query(
          `SELECT enable_size FROM litemall_category WHERE id = ?`,
          [cat.pid]
        )
        if (parentRows.length > 0 && parentRows[0].enable_size != null) {
          enableSize = !!parentRows[0].enable_size
        }
      } else if (cat.enable_size != null) {
        enableSize = !!cat.enable_size
      }
    }
  }

  // 规格按 specification 字段分组（替代 Java VO 构建）
  const specMap = new Map()
  const specificationList = []
  for (const spec of specificationRows) {
    if (!specMap.has(spec.specification)) {
      const vo = { name: spec.specification, valueList: [spec] }
      specMap.set(spec.specification, vo)
      specificationList.push(vo)
    } else {
      specMap.get(spec.specification).valueList.push(spec)
    }
  }

  // SKU 的 specifications 字段是 JSON 字符串，解析为数组
  for (const product of productRows) {
    if (typeof product.specifications === 'string') {
      try { product.specifications = JSON.parse(product.specifications) } catch (e) { /* ignore */ }
    }
  }

  // 登录用户：记录足迹 + 查询收藏状态
  let userHasCollect = false
  const userId = context._userId
  if (userId) {
    await Promise.all([
      // 记录足迹（忽略错误）
      db.query(
        `INSERT INTO litemall_footprint (user_id, goods_id, add_time, update_time, deleted)
         VALUES (?, ?, NOW(), NOW(), 0)`,
        [userId, id]
      ).catch(() => {}),
      // 查询是否收藏
      db.query(
        `SELECT COUNT(*) as cnt FROM litemall_collect
         WHERE user_id = ? AND type = 0 AND value_id = ? AND deleted = 0`,
        [userId, id]
      ).then(rows => { userHasCollect = rows[0].cnt > 0 }),
    ])
  }

  return response.ok({
    info: toGoodsCamel(goods),
    userHasCollect,
    issue: issueRows,
    specificationList,
    productList: productRows,
    attribute: attributeRows,
    brand,
    enableSize,
    share: false,
    shareImage: goods.share_url,
  })
}

// ==================== 商品分类（详情页侧栏） ====================

async function category(data) {
  let id = data.id
  if (!id) {
    // 无 id 时取第一个一级分类
    const first = await db.query(
      `SELECT id FROM litemall_category WHERE level = 'L1' AND deleted = 0 ORDER BY sort_order LIMIT 1`
    )
    if (first.length === 0) return response.badArgument()
    id = first[0].id
  }

  const currentCat = await db.query(
    `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
            \`level\`, sort_order
     FROM litemall_category WHERE id = ? AND deleted = 0`,
    [id]
  )

  if (currentCat.length === 0) return response.badArgument()

  const cat = currentCat[0]
  let parentCategory = null
  let brotherCategory = []

  if (cat.level === 'L1') {
    // 一级分类：查同级分类
    brotherCategory = await db.query(
      `SELECT id, name, icon_url, pic_url FROM litemall_category
       WHERE level = 'L1' AND deleted = 0 ORDER BY sort_order`
    )
  } else if (cat.level === 'L2') {
    // 二级分类：查父分类 + 同级分类
    const parentRows = await db.query(
      `SELECT id, name, icon_url, pic_url FROM litemall_category
       WHERE id = ? AND deleted = 0`,
      [cat.pid]
    )
    if (parentRows.length > 0) parentCategory = parentRows[0]

    brotherCategory = await db.query(
      `SELECT id, name, icon_url, pic_url FROM litemall_category
       WHERE pid = ? AND deleted = 0 ORDER BY sort_order`,
      [cat.pid]
    )
  }

  return response.ok({
    currentCategory: toCatCamel(cat),
    parentCategory: parentCategory ? toCatCamel(parentCategory) : null,
    brotherCategory: brotherCategory.map(toCatCamel),
  })
}

// ==================== 商品列表 ====================

async function list(data, context) {
  const {
    categoryId, brandId, keyword, isNew, isHot, sceneId,
    page = 1, limit = 10, sort = 'default', order = 'desc',
  } = data

  const safePage = Math.max(1, parseInt(page) || 1)
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 10))
  const offset = (safePage - 1) * safeLimit
  const conditions = []
  const params = []
  let joinClause = ''

  // 场景筛选
  if (sceneId) {
    joinClause = 'INNER JOIN clothing_goods_scene cgs ON g.id = cgs.goods_id AND cgs.scene_id = ?'
    params.push(sceneId)
  }

  if (categoryId) { conditions.push('g.category_id = ?'); params.push(categoryId) }
  if (brandId) { conditions.push('g.brand_id = ?'); params.push(brandId) }
  if (isNew !== undefined && isNew !== null) { conditions.push('g.is_new = ?'); params.push(isNew ? 1 : 0) }
  if (isHot !== undefined && isHot !== null) { conditions.push('g.is_hot = ?'); params.push(isHot ? 1 : 0) }

  // 关键词搜索（OR: keywords LIKE 或 name LIKE）
  if (keyword) {
    conditions.push('(g.keywords LIKE ? OR g.name LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''

  // 排序逻辑
  let orderClause
  if (sort === 'default' && keyword) {
    // 关键词相关度排序
    orderClause = `CASE
      WHEN g.name = ? THEN 100
      WHEN g.name LIKE ? THEN 80
      WHEN g.name LIKE ? THEN 50
      WHEN g.keywords LIKE ? THEN 30
      WHEN g.keywords LIKE ? THEN 10
      ELSE 0
    END DESC, g.sort_order DESC, g.add_time DESC`
    params.push(keyword, `${keyword}%`, `%${keyword}%`, `${keyword}%`, `%${keyword}%`)
  } else if (sort === 'default') {
    orderClause = 'g.sort_order DESC, g.add_time DESC'
  } else {
    const allowedSorts = ['add_time', 'retail_price', 'name']
    const allowedOrders = ['asc', 'desc']
    const safeSort = allowedSorts.includes(sort) ? sort : 'add_time'
    const safeOrder = allowedOrders.includes(order) ? order : 'desc'
    orderClause = `g.${safeSort} ${safeOrder}`
  }

  const goodsSql = `
    SELECT g.id, g.goods_sn, g.name, g.category_id, g.brand_id, g.gallery, g.keywords, g.brief,
           g.is_on_sale, g.status, g.sort_order, g.pic_url, g.share_url,
           g.is_new, g.is_hot, g.is_special_price, g.special_price, g.is_presale,
           g.unit, g.counter_price, g.retail_price, g.add_time, g.update_time
    FROM litemall_goods g ${joinClause}
    WHERE g.status = 'published' AND g.deleted = 0 ${whereClause}
    ORDER BY ${orderClause}
    LIMIT ${offset}, ${safeLimit}`

  const countParams = params.slice() // 复制一份，不包含 offset/limit
  const countSql = `
    SELECT COUNT(*) as total
    FROM litemall_goods g ${joinClause}
    WHERE g.status = 'published' AND g.deleted = 0 ${whereClause}`

  const [goodsRows, countRows] = await Promise.all([
    db.query(goodsSql, params),
    db.query(countSql, countParams),
  ])

  // 构建尺码开关映射：从商品结果中提取分类 ID
  const catIdsInResult = [...new Set(goodsRows.map(g => g.category_id).filter(Boolean))]
  let enableSizeMap = {}
  if (catIdsInResult.length > 0) {
    const placeholders = catIdsInResult.map(() => '?').join(',')
    const catRows = await db.query(
      `SELECT id, enable_size, pid FROM litemall_category WHERE id IN (${placeholders}) AND deleted = 0`,
      catIdsInResult
    )
    for (const c of catRows) {
      if (c.pid && c.pid > 0) {
        const parentRows = await db.query(
          `SELECT enable_size FROM litemall_category WHERE id = ?`,
          [c.pid]
        )
        if (parentRows.length > 0 && parentRows[0].enable_size != null) {
          enableSizeMap[c.id] = !!parentRows[0].enable_size
        } else {
          enableSizeMap[c.id] = true
        }
      } else if (c.enable_size != null) {
        enableSizeMap[c.id] = !!c.enable_size
      } else {
        enableSizeMap[c.id] = true
      }
    }
  }

  // 登录用户：记录搜索历史
  const userId = context._userId
  if (userId && keyword) {
    await db.query(
      `INSERT INTO litemall_search_history (user_id, keyword, \`from\`, add_time, update_time, deleted)
       VALUES (?, ?, 'wx', NOW(), NOW(), 0)`,
      [userId, keyword]
    ).catch(() => {})
  }

  return response.ok({
    list: goodsRows.map(toGoodsCamel),
    total: countRows[0].total,
    page: safePage,
    limit: safeLimit,
    pages: Math.ceil(countRows[0].total / safeLimit),
    enableSizeMap,
  })
}

/**
 * 获取筛选条件下的分类 ID 列表
 */
async function getCatIds(brandId, isNew, isHot, keyword) {
  const conditions = []
  const params = []

  if (brandId) { conditions.push('brand_id = ?'); params.push(brandId) }
  if (isNew !== undefined && isNew !== null) { conditions.push('is_new = ?'); params.push(isNew ? 1 : 0) }
  if (isHot !== undefined && isHot !== null) { conditions.push('is_hot = ?'); params.push(isHot ? 1 : 0) }

  let whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1'

  if (keyword) {
    whereClause = `(${conditions.length > 0 ? conditions.join(' AND ') + ' AND ' : ''}(keywords LIKE ? OR name LIKE ?))`
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  const rows = await db.query(
    `SELECT DISTINCT category_id FROM litemall_goods
     WHERE ${whereClause} AND status = 'published' AND deleted = 0`,
    params
  )
  return rows.map(r => r.category_id).filter(Boolean)
}

// ==================== 相关商品 ====================

async function related(data) {
  const id = data.id
  if (!id) return response.badArgument()

  // 先查当前商品
  const goodsRows = await db.query(
    `SELECT category_id FROM litemall_goods WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (goodsRows.length === 0) return response.ok([])

  const categoryId = goodsRows[0].category_id
  if (!categoryId) return response.ok([])

  // 查同类商品，排除当前商品
  const rows = await db.query(
    `SELECT id, name, brief, pic_url, is_hot, is_new, counter_price, retail_price, category_id
     FROM litemall_goods
     WHERE category_id = ? AND id != ? AND status = 'published' AND deleted = 0
     ORDER BY add_time DESC LIMIT 6`,
    [categoryId, id]
  )

  return response.ok(rows.map(toGoodsCamel))
}

// ==================== 商品总数 ====================

async function count() {
  const rows = await db.query(
    `SELECT COUNT(*) as total FROM litemall_goods WHERE status = 'published' AND deleted = 0`
  )
  return response.ok(rows[0].total)
}

module.exports = { detail, category, list, related, count }
