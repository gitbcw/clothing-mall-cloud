/**
 * 分类相关接口
 *
 * 迁移自 WxCatalogController
 * 接口：getFirstCategory, getSecondCategory, index, queryAll, current
 */

const { db, response } = require('layer-base')

function toCatCamel(r) {
  return {
    id: r.id, name: r.name, keywords: r.keywords, desc: r.desc,
    iconUrl: r.icon_url, picUrl: r.pic_url, level: r.level,
    pid: r.pid, sortOrder: r.sort_order,
    seasonSwitch: r.season_switch, enableSize: r.enable_size,
  }
}

/**
 * 根据当前月份获取季节
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/**
 * 根据季节过滤分类列表
 * season_switch 字段格式：逗号分隔的季节列表，如 "spring,summer" 或 "all"
 */
function filterBySeason(categories, season) {
  return categories.filter(cat => {
    const ss = cat.season_switch
    if (!ss) return true // 无配置则不过滤
    const seasons = ss.split(',').map(s => s.trim().toLowerCase())
    return seasons.includes('all') || seasons.includes(season)
  })
}

// ==================== 一级分类 ====================

async function getFirstCategory() {
  const rows = await db.query(
    `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
            \`level\`, sort_order
     FROM litemall_category WHERE level = 'L1' AND deleted = 0 AND enabled = 1 ORDER BY sort_order`
  )
  const season = getCurrentSeason()
  return response.ok(filterBySeason(rows, season).map(toCatCamel))
}

// ==================== 二级分类 ====================

async function getSecondCategory(data) {
  const id = data.id
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
            \`level\`, sort_order
     FROM litemall_category WHERE pid = ? AND deleted = 0 AND enabled = 1 ORDER BY sort_order`,
    [id]
  )
  const season = getCurrentSeason()
  return response.ok(filterBySeason(rows, season).map(toCatCamel))
}

// ==================== 分类详情页 ====================

async function index(data) {
  const id = data.id

  // 所有一级分类（带季节过滤）
  const categoryList = await db.query(
    `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
            \`level\`, sort_order
     FROM litemall_category WHERE level = 'L1' AND deleted = 0 AND enabled = 1 ORDER BY sort_order`
  )
  const season = getCurrentSeason()
  const filteredCategoryList = filterBySeason(categoryList, season)

  // 当前一级分类
  let currentCategory = filteredCategoryList[0] || null
  if (id) {
    const rows = await db.query(
      `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
              \`level\`, sort_order
       FROM litemall_category WHERE id = ? AND deleted = 0 AND enabled = 1`,
      [id]
    )
    if (rows.length > 0) currentCategory = rows[0]
  }

  // 当前一级分类下的二级分类（带季节过滤）
  let currentSubCategoryList = []
  if (currentCategory) {
    const subRows = await db.query(
      `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
              \`level\`, sort_order
       FROM litemall_category WHERE pid = ? AND deleted = 0 AND enabled = 1 ORDER BY sort_order`,
      [currentCategory.id]
    )
    currentSubCategoryList = filterBySeason(subRows, season)
  }

  return response.ok({
    categoryList: filteredCategoryList.map(toCatCamel),
    currentCategory: currentCategory ? toCatCamel(currentCategory) : null,
    currentSubCategoryList: currentSubCategoryList.map(toCatCamel),
  })
}

// ==================== 全部分类 ====================

async function queryAll() {
  const l1Rows = await db.query(
    `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
            \`level\`, sort_order
     FROM litemall_category WHERE level = 'L1' AND deleted = 0 AND enabled = 1 ORDER BY sort_order`
  )

  // 查所有 L1 下的 L2 子分类
  const l2Map = {}
  if (l1Rows.length > 0) {
    const l1Ids = l1Rows.map(c => c.id)
    const l2Rows = await db.query(
      `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
              \`level\`, sort_order
       FROM litemall_category WHERE pid IN (${l1Ids.map(() => '?').join(',')}) AND deleted = 0 AND enabled = 1 ORDER BY sort_order`,
      l1Ids
    )
    for (const row of l2Rows) {
      if (!l2Map[row.pid]) l2Map[row.pid] = []
      l2Map[row.pid].push(row)
    }
  }

  const categoryList = l1Rows.map(l1 => ({
    ...toCatCamel(l1),
    subCategoryList: (l2Map[l1.id] || []).map(toCatCamel),
  }))

  return response.ok(categoryList)
}

// ==================== 当前分类 ====================

async function current(data) {
  const id = data.id
  if (!id) return response.badArgument()

  const catRows = await db.query(
    `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
            \`level\`, sort_order
     FROM litemall_category WHERE id = ? AND deleted = 0 AND enabled = 1`,
    [id]
  )
  if (catRows.length === 0) return response.badArgument()

  const subRows = await db.query(
    `SELECT id, name, keywords, \`desc\`, season_switch, enable_size, pid, icon_url, pic_url,
            \`level\`, sort_order
     FROM litemall_category WHERE pid = ? AND deleted = 0 AND enabled = 1 ORDER BY sort_order`,
    [id]
  )

  return response.ok({ currentCategory: toCatCamel(catRows[0]), currentSubCategoryList: subRows.map(toCatCamel) })
}

module.exports = { getFirstCategory, getSecondCategory, index, queryAll, current }
