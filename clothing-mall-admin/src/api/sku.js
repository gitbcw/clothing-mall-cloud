import request from '@/utils/request'

export function listStore(query) {
  return request({
    url: '/clothing/store/list',
    method: 'get',
    params: query
  })
}

export function createStore(data) {
  return request({
    url: '/clothing/store/create',
    method: 'post',
    data
  })
}

export function updateStore(data) {
  return request({
    url: '/clothing/store/update',
    method: 'post',
    data
  })
}

export function deleteStore(data) {
  return request({
    url: '/clothing/store/delete',
    method: 'post',
    data
  })
}

export function listGuide(query) {
  return request({
    url: '/clothing/guide/list',
    method: 'get',
    params: query
  })
}

export function createGuide(data) {
  return request({
    url: '/clothing/guide/create',
    method: 'post',
    data
  })
}

export function updateGuide(data) {
  return request({
    url: '/clothing/guide/update',
    method: 'post',
    data
  })
}

export function deleteGuide(data) {
  return request({
    url: '/clothing/guide/delete',
    method: 'post',
    data
  })
}

