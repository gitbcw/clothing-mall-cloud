import request from '@/utils/request'

export function listShipper() {
  return request({ url: '/shipper/list', method: 'get' })
}

export function createShipper(data) {
  return request({ url: '/shipper/create', method: 'post', data })
}

export function updateShipper(data) {
  return request({ url: '/shipper/update', method: 'post', data })
}

export function deleteShipper(data) {
  return request({ url: '/shipper/delete', method: 'post', data })
}

export function toggleShipper(data) {
  return request({ url: '/shipper/toggle', method: 'post', data })
}
