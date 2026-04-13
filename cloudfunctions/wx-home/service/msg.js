/**
 * 微信消息接口
 *
 * 迁移自 WxMsgController
 * 接口：config (GET/POST)
 *
 * 注意：云函数模式下，微信消息接收通过云开发消息推送能力处理，
 * 此处仅保留接口结构，实际逻辑在云开发控制台配置。
 */

const { response } = require('layer-base')

// GET: 微信服务器 Token 校验（云函数模式下不需要）
async function configGet() {
  return response.ok('success')
}

// POST: 微信消息接收（云函数模式下由云开发消息推送处理）
async function configPost() {
  return response.ok('success')
}

module.exports = { configGet, configPost }
