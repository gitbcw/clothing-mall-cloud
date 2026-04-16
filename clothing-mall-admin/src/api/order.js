import request from '@/utils/request'
import Qs from 'qs'

export function listOrder(query) {
  return request({
    url: '/order/list',
    method: 'get',
    params: query,
    paramsSerializer: {
      serialize: (params) => Qs.stringify(params, { arrayFormat: 'repeat' })
    }
  })
}

export function listOrderCount() {
  return request({
    url: '/order/overview',
    method: 'get'
  })
}

export function detailOrder(id) {
  return request({
    url: '/order/detail',
    method: 'get',
    params: { id }
  })
}

export function shipOrder(data) {
  return request({
    url: '/order/ship',
    method: 'post',
    data
  })
}

export function refundOrder(data) {
  return request({
    url: '/order/refund',
    method: 'post',
    data
  })
}

export function payOrder(data) {
  return request({
    url: '/order/pay',
    method: 'post',
    data
  })
}

export function deleteOrder(data) {
  return request({
    url: '/order/delete',
    method: 'post',
    data
  })
}

export function replyComment(data) {
  return request({
    url: '/order/reply',
    method: 'post',
    data
  })
}

export function listChannel(id) {
  return request({
    url: '/order/channel',
    method: 'get'
  })
}

export function confirmOrder(data) {
  return request({
    url: '/order/confirm',
    method: 'post',
    data
  })
}

export function verifyOrder(data) {
  return request({
    url: '/order/verify',
    method: 'post',
    data
  })
}
