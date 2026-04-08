/**
 * 地址相关 API
 */
const { request } = require('../utils/util.js')
const api = require('../config/api.js')

module.exports = {
  // 获取地址列表
  getAddressList() {
    return request(api.AddressList)
  },

  // 获取地址详情
  getAddressDetail(id) {
    return request(api.AddressDetail, { id })
  },

  // 保存地址
  saveAddress(data) {
    return request(api.AddressSave, data, 'POST')
  },

  // 删除地址
  deleteAddress(id) {
    return request(api.AddressDelete, { id }, 'POST')
  },

  // 获取区域列表
  getRegionList(pid) {
    return request(api.RegionList, { pid })
  }
}
