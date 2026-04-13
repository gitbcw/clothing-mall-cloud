/**
 * 搜索相关接口
 *
 * 迁移自 WxSearchController
 * 接口：index, helper, clearhistory
 */

const { db, response } = require('layer-base')

function toCatCamel(r) {
  return {
    id: r.id, name: r.name, iconUrl: r.icon_url, picUrl: r.pic_url,
    sortOrder: r.sort_order,
  }
}

function toSceneCamel(r) {
  return {
    id: r.id, name: r.name, icon: r.icon, posterUrl: r.poster_url,
    description: r.description, sortOrder: r.sort_order,
  }
}

// ==================== 搜索页初始化 ====================

async function index(data, context) {
  const userId = context._userId

  // 并发查询
  const [
    hotKeywordRows,
    categoryRows,
    sceneRows,
  ] = await Promise.all([
    // 热门关键词 Top10（最近30天）
    db.query(
      `SELECT keyword, COUNT(*) as cnt
       FROM litemall_search_history
       WHERE deleted = 0 AND add_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY keyword ORDER BY cnt DESC LIMIT 10`
    ),
    // 一级分类
    db.query(
      `SELECT id, name, icon_url, pic_url
       FROM litemall_category WHERE level = 'L1' AND deleted = 0 ORDER BY sort_order`
    ),
    // 启用的场景
    db.query(
      `SELECT id, name, icon, poster_url, description
       FROM clothing_scene WHERE enabled = 1 AND deleted = 0 ORDER BY sort_order, id`
    ),
  ])

  // 默认关键词：取热门第1条
  const defaultKeyword = hotKeywordRows.length > 0 ? hotKeywordRows[0].keyword : ''

  // 用户搜索历史
  let historyKeywordList = []
  if (userId) {
    const historyRows = await db.query(
      `SELECT DISTINCT keyword FROM litemall_search_history
       WHERE user_id = ? AND deleted = 0`,
      [userId]
    )
    historyKeywordList = historyRows.map(r => r.keyword)
  }

  return response.ok({
    defaultKeyword,
    historyKeywordList,
    hotKeywordList: hotKeywordRows.map(r => r.keyword),
    filterCategoryList: categoryRows.map(toCatCamel),
    sceneList: sceneRows.map(toSceneCamel),
  })
}

// ==================== 搜索建议 ====================

async function helper(data) {
  const keyword = data.keyword
  if (!keyword) return response.badArgument()

  const page = data.page || 1
  const limit = data.limit || 10

  const rows = await db.query(
    `SELECT DISTINCT keywords FROM litemall_goods
     WHERE deleted = 0 AND status = 'published'
       AND keywords IS NOT NULL AND keywords != ''
       AND keywords LIKE ?
     LIMIT ?`,
    [`%${keyword}%`, limit]
  )

  // 按逗号拆分 keywords 字段，去重
  const keywordSet = new Set()
  for (const row of rows) {
    if (row.keywords) {
      row.keywords.split(',').forEach(k => {
        k = k.trim()
        if (k && k.toLowerCase().includes(keyword.toLowerCase())) {
          keywordSet.add(k)
        }
      })
    }
  }

  return response.ok([...keywordSet].slice(0, limit))
}

// ==================== 清除搜索历史 ====================

async function clearhistory(data, context) {
  const userId = context._userId
  if (!userId) return response.unlogin()

  await db.query(
    `UPDATE litemall_search_history SET deleted = 1 WHERE user_id = ?`,
    [userId]
  )

  return response.ok()
}

module.exports = { index, helper, clearhistory }
