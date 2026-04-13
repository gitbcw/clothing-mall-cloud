/**
 * 分页工具 — 替代 Java PageHelper
 *
 * 从 event 中提取分页参数，返回 LIMIT/OFFSET 值。
 * 兼容两种参数风格：
 *   1. page/limit（前端通用）
 *   2. pageNum/pageSize（管理后台风格）
 */

function parsePage(event) {
  const data = event.data || event
  const page = parseInt(data.page || data.pageNum || '1', 10)
  const limit = parseInt(data.limit || data.pageSize || '10', 10)

  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 100), // 上限 100
    offset: Math.max(0, (Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 100)),
  }
}

/**
 * 在 SQL 末尾追加 LIMIT/OFFSET
 */
function appendLimit(sql, offset, limit) {
  return `${sql} LIMIT ${limit} OFFSET ${offset}`
}

module.exports = { parsePage, appendLimit }
