/**
 * admin-auth/service/profile.js
 *
 * 个人设置：修改密码 + 通知管理
 */

const bcrypt = require('bcryptjs')
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

/**
 * 修改密码
 */
async function password(data, context) {
  const { oldPassword, newPassword } = data
  if (!oldPassword || !newPassword) return response.badArgument()
  if (newPassword.length < 6) return response.fail(602, '新密码不能少于6位')

  const adminId = context._adminId

  // 查当前密码
  const rows = await query('SELECT password FROM litemall_admin WHERE id = ?', [adminId])
  if (rows.length === 0) return response.unlogin()

  // 校验旧密码
  const match = bcrypt.compareSync(oldPassword, rows[0].password)
  if (!match) return response.fail(605, '账号密码错误')

  // 更新新密码
  const hashedPassword = bcrypt.hashSync(newPassword, 10)
  await execute('UPDATE litemall_admin SET password = ?, update_time = NOW() WHERE id = ?', [hashedPassword, adminId])

  return response.ok()
}

/**
 * 未读通知数量
 */
async function nnotice(data, context) {
  const adminId = context._adminId
  const rows = await query(
    'SELECT COUNT(*) AS cnt FROM litemall_notice_admin WHERE admin_id = ? AND read_time IS NULL AND deleted = 0',
    [adminId]
  )
  return response.ok(rows[0] ? rows[0].cnt : 0)
}

/**
 * 通知列表（分页）
 */
async function lsnotice(data, context) {
  const adminId = context._adminId
  const { page, limit, offset } = paginate.parsePage({ data })

  const where = ['na.admin_id = ?']
  const params = [adminId]

  if (data.title) {
    where.push('n.title LIKE ?')
    params.push(`%${data.title}%`)
  }

  const whereClause = where.join(' AND ')

  // 查总数
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_notice_admin na
     INNER JOIN litemall_notice n ON na.notice_id = n.id
     WHERE ${whereClause} AND na.deleted = 0`,
    params
  )
  const total = countRows[0] ? countRows[0].total : 0

  // 查列表
  const sql = paginate.appendLimit(
    `SELECT na.id, na.notice_id, na.read_time, n.title, n.content, n.add_time
     FROM litemall_notice_admin na
     INNER JOIN litemall_notice n ON na.notice_id = n.id
     WHERE ${whereClause} AND na.deleted = 0
     ORDER BY n.add_time DESC`,
    offset, limit
  )
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

/**
 * 查看通知详情
 */
async function catnotice(data, context) {
  const { noticeId } = data
  if (!noticeId) return response.badArgument()

  const adminId = context._adminId

  // 查通知
  const notices = await query(
    'SELECT n.title, n.content, n.add_time, a.username, a.avatar FROM litemall_notice n LEFT JOIN litemall_admin a ON a.id = 0 WHERE n.id = ? AND n.deleted = 0',
    [noticeId]
  )
  if (notices.length === 0) return response.badArgumentValue()

  const notice = notices[0]

  // 标记为已读
  await execute(
    'UPDATE litemall_notice_admin SET read_time = NOW() WHERE admin_id = ? AND notice_id = ? AND read_time IS NULL',
    [adminId, noticeId]
  )

  return response.ok({
    title: notice.title,
    content: notice.content,
    time: notice.add_time,
    admin: notice.username || '系统',
    avatar: notice.avatar,
  })
}

/**
 * 批量标记已读
 */
async function bcatnotice(data, context) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  const adminId = context._adminId
  const placeholders = ids.map(() => '?').join(',')

  await execute(
    `UPDATE litemall_notice_admin SET read_time = NOW() WHERE admin_id = ? AND notice_id IN (${placeholders}) AND read_time IS NULL`,
    [adminId, ...ids]
  )

  return response.ok()
}

/**
 * 删除单条通知
 */
async function rmnotice(data, context) {
  const { id } = data
  if (!id) return response.badArgument()

  await execute(
    'UPDATE litemall_notice_admin SET deleted = 1 WHERE id = ? AND admin_id = ?',
    [id, context._adminId]
  )

  return response.ok()
}

/**
 * 批量删除通知
 */
async function brmnotice(data, context) {
  const { ids } = data
  if (!Array.isArray(ids) || ids.length === 0) return response.badArgument()

  const adminId = context._adminId
  const placeholders = ids.map(() => '?').join(',')

  await execute(
    `UPDATE litemall_notice_admin SET deleted = 1 WHERE admin_id = ? AND id IN (${placeholders})`,
    [adminId, ...ids]
  )

  return response.ok()
}

module.exports = { password, nnotice, lsnotice, catnotice, bcatnotice, rmnotice, brmnotice }
