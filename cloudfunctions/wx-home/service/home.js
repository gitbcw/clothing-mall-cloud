/**
 * 首页数据接口
 *
 * 迁移自 WxHomeController
 * 接口：index, about, cache
 */

const { db, response } = require('layer-base')
const { getConfig, loadConfigs } = require('layer-base').systemConfig

// ==================== 首页数据 ====================

async function index(data, context) {
  // 加载系统配置到内存（修复冷启动 getConfig 返回 null 的问题）
  await loadConfigs()

  const ACTIVITY_LIMIT = 8
  const addedIds = new Set()
  let titleType = 'weekly'

  // 并发查询
  const [hotGoodsRows, outfitRows, holidayRows, specialPriceRows] = await Promise.all([
    // 热门商品（最新50个已发布商品）
    db.query(
      `SELECT id, name, brief, pic_url, is_hot, is_new, counter_price, retail_price, category_id
       FROM litemall_goods
       WHERE status = 'published' AND deleted = 0
       ORDER BY add_time DESC LIMIT 50`
    ),
    // 穿搭推荐
    db.query(
      `SELECT id, title, description, cover_pic, goods_ids, brand_color, brand_position,
              float_position, sort_order
       FROM litemall_outfit
       WHERE status = 1 AND deleted = 0
       ORDER BY sort_order ASC, add_time DESC`
    ),
    // 活跃节日
    db.query(
      `SELECT id, name, start_date, end_date, sort_order
       FROM clothing_holiday
       WHERE deleted = 0 AND enabled = 1
         AND start_date <= CURDATE() AND end_date >= CURDATE()
       ORDER BY sort_order ASC, id ASC`
    ),
    // 特价商品
    db.query(
      `SELECT id, name, brief, pic_url, is_hot, is_new, counter_price, retail_price,
              special_price, category_id
       FROM litemall_goods
       WHERE is_special_price = 1 AND status = 'published' AND deleted = 0
       ORDER BY add_time DESC LIMIT ${ACTIVITY_LIMIT}`
    ),
  ])

  // === 构建活动位 ===
  const activityGoods = []

  // 第一优先：节日商品
  if (holidayRows.length > 0) {
    titleType = 'holiday'
    for (const holiday of holidayRows) {
      if (activityGoods.length >= ACTIVITY_LIMIT) break
      const goodsIds = await db.query(
        `SELECT goods_id FROM clothing_holiday_goods WHERE holiday_id = ?`,
        [holiday.id]
      )
      for (const { goods_id } of goodsIds) {
        if (activityGoods.length >= ACTIVITY_LIMIT) break
        if (addedIds.has(goods_id)) continue
        const goods = await findPublishedGoods(goods_id)
        if (goods) {
          addedIds.add(goods_id)
          activityGoods.push(pickGoodsFields(goods))
        }
      }
    }
  }

  // 第二优先：特价商品（补充不足8条）
  if (activityGoods.length < ACTIVITY_LIMIT && activityGoods.length > 0) {
    // 已有节日商品，用特价补充
  } else if (activityGoods.length === 0 && specialPriceRows.length > 0) {
    titleType = 'special'
    for (const goods of specialPriceRows) {
      if (activityGoods.length >= ACTIVITY_LIMIT) break
      if (addedIds.has(goods.id)) continue
      addedIds.add(goods.id)
      activityGoods.push(pickGoodsFields(goods))
    }
  }

  // 第三优先：随机商品（完全没数据时）
  if (activityGoods.length === 0) {
    titleType = 'weekly'
    const allGoods = await db.query(
      `SELECT id, name, brief, pic_url, is_hot, is_new, counter_price, retail_price, category_id
       FROM litemall_goods
       WHERE status = 'published' AND deleted = 0
       ORDER BY add_time DESC LIMIT ${ACTIVITY_LIMIT * 2}`
    )
    // 随机打乱
    for (let i = allGoods.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[allGoods[i], allGoods[j]] = [allGoods[j], allGoods[i]]
    }
    for (const goods of allGoods.slice(0, ACTIVITY_LIMIT)) {
      activityGoods.push(pickGoodsFields(goods))
    }
  }

  // === 构建穿搭推荐 ===
  const outfitList = []
  for (const outfit of outfitRows) {
    let goodsIdList = []
    if (outfit.goods_ids) {
      const raw = typeof outfit.goods_ids === 'string'
        ? outfit.goods_ids
        : JSON.stringify(outfit.goods_ids)
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) goodsIdList = parsed
      } catch (e) { /* ignore */ }
    }

    const outfitGoods = []
    for (const gid of goodsIdList) {
      if (outfitGoods.length >= 10) break // 每个穿搭最多10个商品
      const goods = await findPublishedGoods(gid)
      if (goods) {
        outfitGoods.push({
          id: goods.id,
          name: goods.name,
          picUrl: goods.pic_url,
          retailPrice: goods.retail_price,
        })
      }
    }

    outfitList.push({
      id: outfit.id,
      title: outfit.title,
      coverPic: outfit.cover_pic,
      brandColor: outfit.brand_color,
      brandPosition: outfit.brand_position,
      floatPosition: outfit.float_position,
      sortOrder: outfit.sort_order,
      goods: outfitGoods,
    })
  }

  return response.ok({
    hotGoodsList: hotGoodsRows.map(g => ({
      id: g.id, name: g.name, brief: g.brief, picUrl: g.pic_url,
      isHot: !!g.is_hot, isNew: !!g.is_new,
      counterPrice: g.counter_price, retailPrice: g.retail_price, categoryId: g.category_id,
    })),
    outfitList,
    homeActivity: { goods: activityGoods, titleType },
    systemConfig: {
      activityBgImage: getConfig('litemall_home_activity_bg_image') || '',
    },
  })
}

/**
 * 查询已发布的商品（含详情字段）
 */
async function findPublishedGoods(id) {
  const rows = await db.query(
    `SELECT id, name, brief, pic_url, is_hot, is_new, counter_price, retail_price,
            special_price, category_id
     FROM litemall_goods WHERE id = ? AND status = 'published' AND deleted = 0 LIMIT 1`,
    [id]
  )
  return rows.length > 0 ? rows[0] : null
}

/**
 * 提取活动位需要的商品字段
 */
function pickGoodsFields(goods) {
  return {
    id: goods.id,
    name: goods.name,
    picUrl: goods.pic_url,
    retailPrice: goods.retail_price,
    counterPrice: goods.counter_price,
    specialPrice: goods.special_price,
  }
}

// ==================== 商城介绍 ====================

async function about() {
  return response.ok({
    name: getConfig('litemall_mall_name') || '',
    address: getConfig('litemall_mall_address') || '',
    phone: getConfig('litemall_mall_phone') || '',
    qq: getConfig('litemall_mall_qq') || '',
    longitude: getConfig('litemall_mall_longitude') || '',
    latitude: getConfig('litemall_mall_latitude') || '',
  })
}

// ==================== 清除首页缓存（云函数无状态，空实现） ====================

async function cache(data) {
  if (data.key !== 'litemall_cache') {
    return response.badArgument()
  }
  return response.ok('缓存已清除')
}

module.exports = { index, about, cache }
