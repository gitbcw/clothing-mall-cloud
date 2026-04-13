/**
 * admin-auth/service/role.js
 *
 * 角色权限管理
 */

const { db, response, paginate } = require('layer-base')
const { query, execute } = db

const SORT_WHITELIST = ['id', 'name', 'add_time']

function safeSort(sort, order, whitelist) {
  const s = whitelist.includes(sort) ? sort : 'id'
  const o = order === 'asc' ? 'ASC' : 'DESC'
  return { sort: s, order: o }
}

/**
 * 角色列表（分页）
 */
async function list(data) {
  const { page, limit, offset } = paginate.parsePage({ data })

  const where = []
  const params = []
  if (data.name) {
    where.push('name LIKE ?')
    params.push(`%${data.name}%`)
  }
  where.push('deleted = 0')
  const whereClause = where.join(' AND ')

  const { sort, order } = safeSort(data.sort, data.order, SORT_WHITELIST)

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM litemall_role WHERE ${whereClause}`,
    params
  )
  const total = countRows[0] ? countRows[0].total : 0

  const sql = paginate.appendLimit(
    `SELECT * FROM litemall_role WHERE ${whereClause} ORDER BY ${sort} ${order}`,
    offset, limit
  )
  const listRows = await query(sql, params)

  return response.okList(listRows, total, page, limit)
}

/**
 * 角色选项（下拉选择，无分页）
 */
async function options(data) {
  const type = data.type || 'admin'
  let sql = 'SELECT id, name FROM litemall_role WHERE deleted = 0 AND enabled = 1'

  if (type === 'user') {
    sql += " AND (type = 'user' OR type IS NULL)"
  }

  sql += ' ORDER BY id ASC'

  const rows = await query(sql)
  const options = rows.map(r => ({ value: r.id, label: r.name }))

  return response.ok(options)
}

/**
 * 查看角色详情
 */
async function read(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await query(
    'SELECT * FROM litemall_role WHERE id = ? AND deleted = 0',
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(rows[0])
}

/**
 * 创建角色
 */
async function create(data) {
  const { name, desc, enabled } = data
  if (!name) return response.badArgument()

  const result = await execute(
    'INSERT INTO litemall_role (name, `desc`, enabled, add_time, update_time, deleted) VALUES (?, ?, ?, NOW(), NOW(), 0)',
    [name, desc || '', enabled !== false ? 1 : 0]
  )

  return response.ok({ id: result.insertId })
}

/**
 * 更新角色
 */
async function update(data) {
  const { id, name, desc, enabled } = data
  if (!id) return response.badArgument()

  const sets = []
  const params = []
  if (name !== undefined) {
    sets.push('name = ?')
    params.push(name)
  }
  if (desc !== undefined) {
    sets.push('`desc` = ?')
    params.push(desc)
  }
  if (enabled !== undefined) {
    sets.push('enabled = ?')
    params.push(enabled ? 1 : 0)
  }
  sets.push("update_time = NOW()")

  params.push(id)
  const result = await execute(
    `UPDATE litemall_role SET ${sets.join(', ')} WHERE id = ? AND deleted = 0`,
    params
  )
  if (result.affectedRows === 0) return response.updatedDataFailed()

  return response.ok()
}

/**
 * 删除角色
 * 保护：如果有管理员正在使用该角色，则拒绝删除
 */
async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()

  // 检查是否有管理员使用该角色
  const admins = await query(
    'SELECT id, username FROM litemall_admin WHERE deleted = 0'
  )

  for (const admin of admins) {
    const roleIds = admin.role_ids ? JSON.parse(admin.role_ids) : []
    if (roleIds.includes(id)) {
      return response.fail(640, '当前角色存在管理员，不能删除')
    }
  }

  const result = await execute(
    'UPDATE litemall_role SET deleted = 1 WHERE id = ? AND deleted = 0',
    [id]
  )
  if (result.affectedRows === 0) return response.updatedDataFailed()

  return response.ok()
}

/**
 * 获取权限分配信息
 * 返回 systemPermissions / assignedPermissions / curPermissions
 *
 * litemall_permission 表结构：id, role_id, permission, add_time, update_time, deleted
 * 每行代表一个角色-权限分配
 */
async function getPermissions(data, context) {
  const { roleId } = data
  if (!roleId) return response.badArgument()

  // 获取所有系统权限（去重）
  const allPerms = await query(
    'SELECT DISTINCT permission FROM litemall_permission WHERE deleted = 0 ORDER BY permission ASC'
  )
  const systemPermissions = allPerms.map(p => p.permission)

  // 获取目标角色已分配的权限
  const assigned = await query(
    'SELECT id, permission FROM litemall_permission WHERE role_id = ? AND deleted = 0',
    [roleId]
  )
  const assignedPermissions = assigned.map(a => a.permission)

  // 获取当前登录管理员的权限
  let curPermissions = []
  const currentAdmin = context._admin
  if (currentAdmin && currentAdmin.roleIds) {
    if (currentAdmin.roleIds.includes(1)) {
      // 超级管理员拥有所有权限
      curPermissions = systemPermissions
    } else if (currentAdmin.roleIds.length > 0) {
      const placeholders = currentAdmin.roleIds.map(() => '?').join(',')
      const curPermRows = await query(
        `SELECT DISTINCT permission FROM litemall_permission WHERE role_id IN (${placeholders}) AND deleted = 0`,
        currentAdmin.roleIds
      )
      curPermissions = curPermRows.map(r => r.permission)
    }
  }

  // 检查当前管理员是否是超级管理员（用于前端控制）
  const isSuper = currentAdmin && currentAdmin.roleIds && currentAdmin.roleIds.includes(1)

  return response.ok({
    systemPermissions,
    assignedPermissions: isSuper ? systemPermissions : assignedPermissions,
    curPermissions,
  })
}

/**
 * 更新角色权限
 * 保护：超级权限角色不允许修改
 *
 * permissions: 权限字符串数组，如 ["admin:admin:list", "admin:admin:create"]
 */
async function updatePermissions(data, context) {
  const { roleId, permissions } = data
  if (!roleId || !Array.isArray(permissions)) return response.badArgument()

  // 检查目标角色是否是超级管理员角色（id=1）
  if (roleId === 1) {
    return response.fail(641, '超级管理员角色不能修改')
  }

  // 删除旧权限
  await execute('DELETE FROM litemall_permission WHERE role_id = ? AND deleted = 0', [roleId])

  // 插入新权限
  if (permissions.length > 0) {
    const values = permissions.map(p => `(?, ?)`).join(',')
    const params = permissions.flatMap(p => [roleId, p])
    await execute(
      `INSERT INTO litemall_permission (role_id, permission, add_time, update_time, deleted) VALUES ${values}`,
      params
    )
  }

  return response.ok()
}

module.exports = {
  list, options, read, create, update, delete: deleteFn,
  getPermissions, updatePermissions,
}
