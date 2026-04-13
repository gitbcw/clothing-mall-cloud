/**
 * admin-system/service/region.js
 *
 * 地区管理：按父 ID 查询 + 完整树形结构
 */

const { db, response } = require('layer-base')
const { query } = db

/**
 * 按父 ID 查询子地区列表
 */
async function clist(data) {
  const { id } = data
  if (id === undefined || id === null) return response.badArgument()

  const rows = await query(
    'SELECT id, pid, name, type, code FROM litemall_region WHERE pid = ?',
    [id]
  )

  return response.okList(rows)
}

/**
 * 获取完整省市区树形结构
 * type: 1=省, 2=市, 3=区, 4=街道（排除）
 */
async function list() {
  const rows = await query(
    'SELECT id, pid, name, type, code FROM litemall_region WHERE type != 4 ORDER BY type ASC, id ASC'
  )

  // 按类型分组
  const provinces = rows.filter(r => r.type === 1)
  const cities = rows.filter(r => r.type === 2)
  const districts = rows.filter(r => r.type === 3)

  // 构建市 → 区映射
  const districtMap = {}
  for (const d of districts) {
    if (!districtMap[d.pid]) districtMap[d.pid] = []
    districtMap[d.pid].push({ id: d.id, name: d.name, type: d.type, code: d.code, children: [] })
  }

  // 构建省 → 市映射
  const cityMap = {}
  for (const c of cities) {
    cityMap[c.pid] = cityMap[c.pid] || []
    cityMap[c.pid].push({
      id: c.id, name: c.name, type: c.type, code: c.code,
      children: districtMap[c.id] || [],
    })
  }

  // 构建最终树
  const tree = provinces.map(p => ({
    id: p.id, name: p.name, type: p.type, code: p.code,
    children: cityMap[p.id] || [],
  }))

  return response.okList(tree)
}

module.exports = { clist, list }
