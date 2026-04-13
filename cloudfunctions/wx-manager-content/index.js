/**
 * wx-manager-content 云函数 — 小程序管理端内容管理
 *
 * 合并 WxManagerSceneController + WxManagerOutfitController + WxManagerIssueController
 * 18 个接口：场景8 + 穿搭6 + 问题4
 */

const { response } = require('layer-base')
const { wxAuth } = require('layer-auth')
const { managerAuth } = require('layer-auth')

const {
  sceneList, sceneRead, sceneCreate, sceneUpdate, sceneDelete, sceneEnable, sceneGoods, sceneGoodsUpdate,
} = require('./service/scene')

const {
  outfitList, outfitRead, outfitCreate, outfitUpdate, outfitDelete, outfitStatus,
} = require('./service/outfit')

const {
  issueList, issueCreate, issueUpdate, issueDelete,
} = require('./service/issue')

const routes = {
  // 场景
  sceneList, sceneRead, sceneCreate, sceneUpdate, sceneDelete, sceneEnable, sceneGoods, sceneGoodsUpdate,

  // 穿搭
  outfitList, outfitRead, outfitCreate, outfitUpdate, outfitDelete, outfitStatus,

  // 问题
  issueList, issueCreate, issueUpdate, issueDelete,
}

exports.main = async (event, context) => {
  // CloudBase 将 OPENID 放在 event.userInfo.openId，注入到 context 供 layer-auth 使用
  const openId = (event.userInfo && event.userInfo.openId) || null
  if (openId && !context.OPENID) {
    context.OPENID = openId
  }

  const { action, data } = event

  const handler = routes[action]
  if (!handler) {
    return response.fail(404, `未知接口: ${action}`)
  }

  // 登录校验
  const authResult = await wxAuth.wxAuthMiddleware(event, context)
  if (authResult) return authResult

  // 管理员权限校验
  const permResult = await managerAuth.managerAuthMiddleware(event)
  if (permResult) return permResult

  context._userId = event._userId
  context._user = event._user
  context._adminId = event._adminId

  try {
    return await handler(data || {}, context)
  } catch (err) {
    console.error(`[wx-manager-content] action=${action} error:`, err)
    return response.serious()
  }
}
