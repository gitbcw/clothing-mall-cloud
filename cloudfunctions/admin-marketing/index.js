/**
 * admin-marketing 云函数入口
 *
 * 营销管理：coupon/outfit
 */

const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')

const { query } = require('layer-base').db

const {
  list: couponList, listuser: couponListuser,
  create: couponCreate, read: couponRead,
  update: couponUpdate, delete: couponDelete,
  assign: couponAssign,
} = require('./service/coupon')

const {
  list: outfitList, read: outfitRead,
  create: outfitCreate, update: outfitUpdate,
  delete: outfitDelete, status: outfitStatus,
} = require('./service/outfit')

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

const routes = {
  // 优惠券
  couponList:    { handler: couponList,    permission: 'admin:coupon:list' },
  couponListuser:{ handler: couponListuser, permission: 'admin:coupon:listuser' },
  couponCreate:  { handler: couponCreate,  permission: 'admin:coupon:create' },
  couponRead:    { handler: couponRead,    permission: 'admin:coupon:read' },
  couponUpdate:  { handler: couponUpdate,  permission: 'admin:coupon:update' },
  couponDelete:  { handler: couponDelete,  permission: 'admin:coupon:delete' },
  couponAssign:  { handler: couponAssign,  permission: 'admin:coupon:assign' },

  // 穿搭推荐
  outfitList:    { handler: outfitList,    permission: 'admin:outfit:list' },
  outfitRead:    { handler: outfitRead,    permission: 'admin:outfit:read' },
  outfitCreate:  { handler: outfitCreate,  permission: 'admin:outfit:create' },
  outfitUpdate:  { handler: outfitUpdate,  permission: 'admin:outfit:update' },
  outfitDelete:  { handler: outfitDelete,  permission: 'admin:outfit:delete' },
  outfitStatus:  { handler: outfitStatus,  permission: 'admin:outfit:update' },
}

exports.main = async (event, context) => {
  const { action, data } = event
  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  const authResult = await adminAuth.adminAuthMiddleware(event)
  if (authResult) return authResult

  if (route.permission) {
    const has = await checkPermission(event._admin, route.permission)
    if (!has) return response.unauthz()
  }

  context._adminId = event._adminId
  context._admin = event._admin

  try {
    return await route.handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-marketing] action=${action} error:`, err)
    return response.serious()
  }
}
