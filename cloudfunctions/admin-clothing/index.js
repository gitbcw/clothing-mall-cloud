/**
 * admin-clothing 云函数入口
 */
const { response } = require('layer-base')
const { adminAuth } = require('layer-auth')
const { query } = require('layer-base').db

const { list: storeList, read: storeRead, create: storeCreate, update: storeUpdate, delete: storeDelete, all: storeAll } = require('./service/store')
const { list: guideList, read: guideRead, create: guideCreate, update: guideUpdate, delete: guideDelete } = require('./service/guide')
const { list: sceneList, read: sceneRead, create: sceneCreate, update: sceneUpdate, delete: sceneDelete, enable: sceneEnable, goods: sceneGoods, goodsUpdate: sceneGoodsUpdate } = require('./service/scene')
const { list: holidayList, read: holidayRead, create: holidayCreate, update: holidayUpdate, delete: holidayDelete, enable: holidayEnable, goods: holidayGoods, goodsUpdate: holidayGoodsUpdate } = require('./service/holiday')

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

const PUBLIC_ACTIONS = ['sceneGoods', 'sceneGoodsUpdate']

const routes = {
  storeList: { handler: storeList, permission: 'admin:clothing:store:list' },
  storeRead: { handler: storeRead, permission: 'admin:clothing:store:read' },
  storeCreate: { handler: storeCreate, permission: 'admin:clothing:store:create' },
  storeUpdate: { handler: storeUpdate, permission: 'admin:clothing:store:update' },
  storeDelete: { handler: storeDelete, permission: 'admin:clothing:store:delete' },
  storeAll: { handler: storeAll, permission: 'admin:clothing:store:list' },

  guideList: { handler: guideList, permission: 'admin:clothing:guide:list' },
  guideRead: { handler: guideRead, permission: 'admin:clothing:guide:read' },
  guideCreate: { handler: guideCreate, permission: 'admin:clothing:guide:create' },
  guideUpdate: { handler: guideUpdate, permission: 'admin:clothing:guide:update' },
  guideDelete: { handler: guideDelete, permission: 'admin:clothing:guide:delete' },

  sceneList: { handler: sceneList, permission: 'admin:clothing:scene:list' },
  sceneRead: { handler: sceneRead, permission: 'admin:clothing:scene:read' },
  sceneCreate: { handler: sceneCreate, permission: 'admin:clothing:scene:create' },
  sceneUpdate: { handler: sceneUpdate, permission: 'admin:clothing:scene:update' },
  sceneDelete: { handler: sceneDelete, permission: 'admin:clothing:scene:delete' },
  sceneEnable: { handler: sceneEnable, permission: 'admin:clothing:scene:enable' },
  sceneGoods: { handler: sceneGoods, permission: null },
  sceneGoodsUpdate: { handler: sceneGoodsUpdate, permission: null },

  holidayList: { handler: holidayList, permission: 'admin:clothing:holiday:list' },
  holidayRead: { handler: holidayRead, permission: 'admin:clothing:holiday:read' },
  holidayCreate: { handler: holidayCreate, permission: 'admin:clothing:holiday:create' },
  holidayUpdate: { handler: holidayUpdate, permission: 'admin:clothing:holiday:update' },
  holidayDelete: { handler: holidayDelete, permission: 'admin:clothing:holiday:delete' },
  holidayEnable: { handler: holidayEnable, permission: 'admin:clothing:holiday:enable' },
  holidayGoods: { handler: holidayGoods, permission: 'admin:clothing:holiday:list' },
  holidayGoodsUpdate: { handler: holidayGoodsUpdate, permission: 'admin:clothing:holiday:update' },
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
    console.error(`[admin-clothing] action=${action} error:`, err)
    return response.serious()
  }
}
