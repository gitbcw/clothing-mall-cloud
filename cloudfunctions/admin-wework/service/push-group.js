/**
 * admin-wework/service/push-group.js — 推送组 CRUD
 */
const { db, response, paginate } = require('layer-base')
const { query, execute } = db

async function list(data) {
  const rows = await query('SELECT id, name, type, member_count, add_time, update_time FROM litemall_push_group WHERE deleted = 0 ORDER BY id ASC')
  return response.okList(rows, rows.length, 1, rows.length)
}

async function detail(data) {
  const { id } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT * FROM litemall_push_group WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  const group = rows[0]
  const memberRows = await query('SELECT user_id FROM litemall_push_group_member WHERE group_id = ? AND deleted = 0', [id])
  group.members = memberRows.map(m => m.user_id)
  return response.ok(group)
}

async function create(data) {
  const { name, type, memberIds } = data
  if (!name) return response.badArgument()
  const result = await execute(
    'INSERT INTO litemall_push_group (name, type, member_count, add_time, update_time, deleted) VALUES (?, ?, ?, NOW(), NOW(), 0)',
    [name, type || 'manual', Array.isArray(memberIds) ? memberIds.length : 0]
  )
  const groupId = result.insertId

  if (Array.isArray(memberIds) && memberIds.length > 0) {
    const values = memberIds.map(uid => `(${groupId}, ${uid})`).join(',')
    await execute(`INSERT INTO litemall_push_group_member (group_id, user_id) VALUES ${values}`)
  }

  return response.ok({ id: groupId })
}

async function update(data) {
  const { id, name, type, memberIds } = data
  if (!id) return response.badArgument()
  const rows = await query('SELECT id FROM litemall_push_group WHERE id = ? AND deleted = 0', [id])
  if (rows.length === 0) return response.badArgumentValue()

  const sets = []
  const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (type !== undefined) { sets.push('type = ?'); params.push(type) }
  if (memberIds !== undefined) { sets.push('member_count = ?'); params.push(Array.isArray(memberIds) ? memberIds.length : 0) }
  sets.push('update_time = NOW()')
  params.push(id)
  await execute(`UPDATE litemall_push_group SET ${sets.join(', ')} WHERE id = ?`, params)

  if (memberIds !== undefined) {
    await execute('DELETE FROM litemall_push_group_member WHERE group_id = ?', [id])
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const values = memberIds.map(uid => `(${id}, ${uid})`).join(',')
      await execute(`INSERT INTO litemall_push_group_member (group_id, user_id) VALUES ${values}`)
    }
  }

  return response.ok()
}

async function deleteFn(data) {
  const { id } = data
  if (!id) return response.badArgument()
  await execute('DELETE FROM litemall_push_group_member WHERE group_id = ?', [id])
  await execute('UPDATE litemall_push_group SET deleted = 1 WHERE id = ? AND deleted = 0', [id])
  return response.ok()
}

module.exports = { list, detail, create, update, delete: deleteFn }
