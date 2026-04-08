import request from '@/utils/request'
import Qs from 'qs'

export function listAftersale(query) {
  return request({
    url: '/aftersale/list',
    method: 'get',
    params: query,
    paramsSerializer: {
      serialize: (params) => Qs.stringify(params, { arrayFormat: 'repeat' })
    }
  })
}

export function listAftersaleCount() {
  return request({
    url: '/aftersale/overview',
    method: 'get'
  })
}

export function receptAftersale(data) {
  return request({
    url: '/aftersale/recept',
    method: 'post',
    data
  })
}

export function batchReceptAftersale(data) {
  return request({
    url: '/aftersale/batch-recept',
    method: 'post',
    data
  })
}

export function rejectAftersale(data) {
  return request({
    url: '/aftersale/reject',
    method: 'post',
    data
  })
}

export function batchRejectAftersale(data) {
  return request({
    url: '/aftersale/batch-reject',
    method: 'post',
    data
  })
}

export function refundAftersale(data) {
  return request({
    url: '/aftersale/refund',
    method: 'post',
    data
  })
}

export function shipAftersale(data) {
  return request({
    url: '/aftersale/ship',
    method: 'post',
    data
  })
}

export function completeAftersale(data) {
  return request({
    url: '/aftersale/complete',
    method: 'post',
    data
  })
}
