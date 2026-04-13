/**
 * admin-goods 云函数入口
 *
 * 商品管理：goods/brand/category/shipper
 */

const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')

const { list, catAndBrand, detail, findBySn, create, update, delete: goodsDelete, publish, unpublish, unpublishAll } = require('./service/goods')
const { list: brandList, create: brandCreate, read: brandRead, update: brandUpdate, delete: brandDelete } = require('./service/brand')
const { list: categoryList, l1: categoryL1, read: categoryRead, create: categoryCreate, update: categoryUpdate, delete: categoryDelete } = require('./service/category')
const { list: shipperList, create: shipperCreate, read: shipperRead, update: shipperUpdate, delete: shipperDelete, toggle: shipperToggle } = require('./service/shipper')

const { query } = require('layer-base').db
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
  // 商品
  goodsList:        { handler: list,          permission: 'admin:goods:list' },
  catAndBrand,       // 无权限
  goodsDetail:      { handler: detail,       permission: 'admin:goods:read' },
  goodsFindBySn:    { handler: findBySn,     permission: 'admin:goods:read' },
  goodsCreate:      { handler: create,       permission: 'admin:goods:create' },
  goodsUpdate:      { handler: update,       permission: 'admin:goods:update' },
  goodsDelete:      { handler: goodsDelete,  permission: 'admin:goods:delete' },
  goodsPublish:     { handler: publish,      permission: 'admin:goods:update' },
  goodsUnpublish:   { handler: unpublish,    permission: 'admin:goods:update' },
  goodsUnpublishAll:{ handler: unpublishAll, permission: 'admin:goods:update' },

  // 品牌
  brandList:   { handler: brandList,   permission: 'admin:brand:list' },
  brandCreate: { handler: brandCreate, permission: 'admin:brand:create' },
  brandRead:   { handler: brandRead,   permission: 'admin:brand:read' },
  brandUpdate: { handler: brandUpdate, permission: 'admin:brand:update' },
  brandDelete: { handler: brandDelete, permission: 'admin:brand:delete' },

  // 分类
  categoryList:   { handler: categoryList,   permission: 'admin:category:list' },
  categoryL1:     { handler: categoryL1,     permission: 'admin:category:list' },
  categoryRead:   { handler: categoryRead,   permission: 'admin:category:read' },
  categoryCreate: { handler: categoryCreate, permission: 'admin:category:create' },
  categoryUpdate: { handler: categoryUpdate, permission: 'admin:category:update' },
  categoryDelete: { handler: categoryDelete, permission: 'admin:category:delete' },

  // 物流
  shipperList:   { handler: shipperList,   permission: 'admin:shipper:list' },
  shipperCreate: { handler: shipperCreate, permission: 'admin:shipper:create' },
  shipperRead:   { handler: shipperRead,   permission: 'admin:shipper:list' },
  shipperUpdate: { handler: shipperUpdate, permission: 'admin:shipper:update' },
  shipperDelete: { handler: shipperDelete, permission: 'admin:shipper:delete' },
  shipperToggle: { handler: shipperToggle, permission: 'admin:shipper:update' },
}

exports.main = async (event, context) => {
  const { action, data } = event
  const route = routes[action]
  if (!route) return response.fail(404, `未知接口: ${action}`)

  const handler = typeof route === 'function' ? route : route.handler

  // catAndBrand 无需登录
  if (action === 'catAndBrand') {
    try { return await handler(data || {}, context) }
    catch (err) { console.error(`[admin-goods] action=${action} error:`, err); return response.serious() }
  }

  const authResult = await adminAuth.adminAuthMiddleware(event)
  if (authResult) return authResult

  if (route.permission) {
    const has = await checkPermission(event._admin, route.permission)
    if (!has) return response.unauthz()
  }

  context._adminId = event._adminId
  context._admin = event._admin

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[admin-goods] action=${action} error:`, err)
    return response.serious()
  }
}
