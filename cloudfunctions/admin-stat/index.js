/**
 * admin-stat 云函数入口
 */
const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')
const { query } = require('layer-base').db

const {
  statUser, statOrder, statGoods, statGrowth, statRetention, statActiveUsers,
  statTrackerOverview, statTrackerTrend, statTrackerPages,
  statRevenueOverview, statRevenueScene, statRevenueCategory,
  statRevenueSeasonOverview, statRevenueSeasonHotGoods,
} = require('./service/stat')
const { info: dashboardInfo } = require('./service/dashboard')
const { list: historyList } = require('./service/history')

async function checkPermission(admin, permission) {
  if (!admin || !admin.roleIds || admin.roleIds.length === 0) return false
  if (admin.roleIds.includes(1)) return true
  const placeholders = admin.roleIds.map(() => '?').join(',')
  const rows = await query(
    `SELECT id FROM litemall_permission WHERE role_id IN (${placeholders}) AND permission = ? AND deleted = 0`,
    [...admin.roleIds, permission]
  )
  return rows.length > 0
}

const PUBLIC_ACTIONS = ['dashboardInfo']

const routes = {
  statUser: { handler: statUser, permission: 'admin:stat:user' },
  statOrder: { handler: statOrder, permission: 'admin:stat:order' },
  statGoods: { handler: statGoods, permission: 'admin:stat:goods' },
  statGrowth: { handler: statGrowth, permission: 'admin:stat:growth' },
  statRetention: { handler: statRetention, permission: 'admin:stat:growth' },
  statActiveUsers: { handler: statActiveUsers, permission: 'admin:stat:growth' },
  statTrackerOverview: { handler: statTrackerOverview, permission: 'admin:stat:tracker' },
  statTrackerTrend: { handler: statTrackerTrend, permission: 'admin:stat:tracker' },
  statTrackerPages: { handler: statTrackerPages, permission: 'admin:stat:tracker' },
  statRevenueOverview: { handler: statRevenueOverview, permission: 'admin:stat:order' },
  statRevenueScene: { handler: statRevenueScene, permission: 'admin:stat:order' },
  statRevenueCategory: { handler: statRevenueCategory, permission: 'admin:stat:order' },
  statRevenueSeasonOverview: { handler: statRevenueSeasonOverview, permission: 'admin:stat:order' },
  statRevenueSeasonHotGoods: { handler: statRevenueSeasonHotGoods, permission: 'admin:stat:order' },
  dashboardInfo: { handler: dashboardInfo, permission: null },
  historyList: { handler: historyList, permission: 'admin:history:list' },
}

exports.main = async (event, context) => {
  const { action, data } = event
  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  if (!PUBLIC_ACTIONS.includes(action)) {
    const authResult = await adminAuth.adminAuthMiddleware(event)
    if (authResult) return authResult
    if (route.permission) {
      const has = await checkPermission(event._admin, route.permission)
      if (!has) return response.unauthz()
    }
    context._adminId = event._adminId
    context._admin = event._admin
  }

  try {
    return await route.handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-stat] action=${action} error:`, err)
    return response.serious()
  }
}
