/**
 * admin-goods 云函数入口
 *
 * 商品管理：goods/brand/category/shipper
 */

const { response, db } = require('layer-base')
const { loadConfigs, getConfig } = require('layer-base').systemConfig
const { adminAuth } = require('layer-auth')
const { recognizeTag: aiRecognizeTag, recognizeImage: aiRecognizeImage } = require('layer-wechat/lib/ai')

const { list, catAndBrand, detail, findBySn, create, update, delete: goodsDelete, publish, unpublish, unpublishAll, cancelSpecialPrice } = require('./service/goods')
const { list: brandList, create: brandCreate, read: brandRead, update: brandUpdate, delete: brandDelete } = require('./service/brand')
const { list: categoryList, l1: categoryL1, read: categoryRead, create: categoryCreate, update: categoryUpdate, delete: categoryDelete } = require('./service/category')
const { list: shipperList, create: shipperCreate, read: shipperRead, update: shipperUpdate, delete: shipperDelete, toggle: shipperToggle } = require('./service/shipper')

// ==================== AI 识别 ====================

const COS_BASE = 'https://636c-clo-test-4g8ukdond34672de-1258700476.tcb.qcloud.la/'

function getFileUrl(fileID) {
  if (!fileID) throw new Error('文件路径为空')
  if (fileID.startsWith('http')) return fileID
  if (fileID.startsWith('cloud://')) {
    const match = fileID.match(/^cloud:\/\/[^/]+\/(.+)$/)
    if (match) return COS_BASE + match[1]
  }
  return COS_BASE + fileID
}

async function recognizeImage(data) {
  const enabled = getConfig('litemall_ai_enabled')
  if (enabled !== 'true' && enabled !== '1') return response.fail(501, 'AI 识别功能未启用')
  if (!data.fileID) return response.badArgument()

  const [catRows, sceneRows] = await Promise.all([
    db.query('SELECT name FROM litemall_category WHERE level = ? AND deleted = 0 ORDER BY sort_order', ['L1']),
    db.query('SELECT name FROM clothing_scene WHERE enabled = 1 AND deleted = 0 ORDER BY sort_order'),
  ])
  const imageUrl = getFileUrl(data.fileID)
  const result = await aiRecognizeImage(imageUrl, catRows.map(r => r.name), sceneRows.map(r => r.name))
  return response.ok(result)
}

async function recognizeTag(data) {
  const enabled = getConfig('litemall_ai_enabled')
  if (enabled !== 'true' && enabled !== '1') return response.fail(501, 'AI 识别功能未启用')
  if (!data.fileID) return response.badArgument()

  const imageUrl = getFileUrl(data.fileID)
  const result = await aiRecognizeTag(imageUrl)
  return response.ok(result)
}

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
  goodsCancelSpecialPrice: { handler: cancelSpecialPrice, permission: 'admin:goods:update' },

  // AI 识别
  goodsRecognizeImage: { handler: recognizeImage, permission: 'admin:goods:create' },
  goodsRecognizeTag:   { handler: recognizeTag,   permission: 'admin:goods:create' },

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

  // AI 识别需要加载系统配置
  if (action === 'goodsRecognizeImage' || action === 'goodsRecognizeTag') {
    await loadConfigs()
  }

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
