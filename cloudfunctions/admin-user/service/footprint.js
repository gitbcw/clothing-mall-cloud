/**
 * admin-user/service/footprint.js — 用户足迹列表
 */
const { db, response, paginate } = require('layer-base')
const { query } = db

async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })
  const where = ['f.deleted = 0']
  const params = []
  if (data.userId) { where.push('f.user_id = ?'); params.push(data.userId) }
  const whereClause = where.join(' AND ')

  const countRows = await query(`SELECT COUNT(*) AS total FROM litemall_footprint f WHERE ${whereClause}`, params)
  const total = countRows[0] ? countRows[0].total : 0
  const sql = paginate.appendLimit(
    `SELECT f.id, f.user_id, f.goods_id, f.add_time, f.update_time,
            u.nickname AS user_name, g.name AS goods_name, g.pic_url AS goods_pic_url
     FROM litemall_footprint f
     LEFT JOIN litemall_user u ON f.user_id = u.id
     LEFT JOIN litemall_goods g ON f.goods_id = g.id
     WHERE ${whereClause} ORDER BY f.add_time DESC`,
    offset, limit
  )
  const listRows = await query(sql, params)
  return response.okList(listRows, total, page, limit)
}

module.exports = { list }
