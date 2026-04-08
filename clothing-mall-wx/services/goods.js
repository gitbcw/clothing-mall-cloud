/**
 * 商品相关 API
 */
const { request } = require('../utils/util.js')
const api = require('../config/api.js')

module.exports = {
  // 获取首页数据
  getIndexData() {
    return request(api.IndexUrl)
  },

  // 获取商品列表
  getGoodsList(params) {
    return request(api.GoodsList, params)
  },

  // 获取商品分类
  getGoodsCategory(id) {
    return request(api.GoodsCategory, { id })
  },

  // 获取商品详情
  getGoodsDetail(id) {
    return request(api.GoodsDetail, { id })
  },

  // 获取关联商品
  getGoodsRelated(id) {
    return request(api.GoodsRelated, { id })
  },

  // 获取商品总数
  getGoodsCount() {
    return request(api.GoodsCount)
  },

  // 添加/取消收藏
  toggleCollect(goodsId) {
    return request(api.CollectAddOrDelete, { valueId: goodsId, type: 0 }, 'POST')
  },

  // 获取收藏列表
  getCollectList(params) {
    return request(api.CollectList, params)
  },

  // 获取商品 SKU 列表
  getSkuList(goodsId) {
    return request(api.ClothingSkuList, { goodsId })
  },

  // 检查 SKU 库存
  checkSkuStock(data) {
    return request(api.ClothingSkuCheckStock, data, 'POST')
  }
}
