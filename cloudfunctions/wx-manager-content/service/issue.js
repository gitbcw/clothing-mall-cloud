/**
 * 管理端常见问题接口
 *
 * 迁移自 WxManagerIssueController
 * 接口：issueList, issueCreate, issueUpdate, issueDelete
 */

const { db, response } = require('layer-base')

function toIssueCamel(r) {
  return {
    id: r.id, question: r.question, answer: r.answer,
    addTime: r.add_time, updateTime: r.update_time,
  }
}

// ==================== 问题列表 ====================

async function issueList(data) {
  const question = data.question || ''
  const page = data.page || 1
  const limit = data.limit || 10
  const offset = (page - 1) * limit

  const sortWhiteList = ['add_time', 'update_time']
  const safeSort = sortWhiteList.includes(data.sort) ? data.sort : 'add_time'
  const safeOrder = data.order === 'asc' ? 'ASC' : 'DESC'

  let where = 'WHERE deleted = 0'
  const params = []

  if (question) {
    where += ' AND question LIKE ?'
    params.push(`%${question}%`)
  }

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM litemall_issue ${where}`,
    params
  )
  const total = countResult[0].total

  const rows = await db.query(
    `SELECT * FROM litemall_issue ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ${offset}, ${limit}`,
    params
  )

  return response.ok({
    list: rows.map(toIssueCamel),
    total,
    pages: Math.ceil(total / limit),
  })
}

// ==================== 创建问题 ====================

async function issueCreate(data) {
  const { question, answer } = data
  if (!question) return response.fail(401, '问题不能为空')
  if (!answer) return response.fail(401, '回答不能为空')

  const result = await db.query(
    `INSERT INTO litemall_issue (question, answer, deleted, add_time, update_time)
     VALUES (?, ?, 0, NOW(), NOW())`,
    [question, answer]
  )

  return response.ok({ id: result.insertId })
}

// ==================== 更新问题 ====================

async function issueUpdate(data) {
  const { id, question, answer } = data
  if (!id) return response.badArgument()
  if (!question) return response.fail(401, '问题不能为空')
  if (!answer) return response.fail(401, '回答不能为空')

  await db.query(
    `UPDATE litemall_issue SET question = ?, answer = ?, update_time = NOW() WHERE id = ?`,
    [question, answer, id]
  )

  return response.ok()
}

// ==================== 删除问题 ====================

async function issueDelete(data) {
  const { id } = data
  if (!id) return response.badArgument()

  await db.query(
    `UPDATE litemall_issue SET deleted = 1 WHERE id = ?`,
    [id]
  )

  return response.ok()
}

module.exports = {
  issueList, issueCreate, issueUpdate, issueDelete,
}
