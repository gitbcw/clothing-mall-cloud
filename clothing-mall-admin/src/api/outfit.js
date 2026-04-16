import request from '@/utils/request'

export function listOutfit(query) {
  return request({
    url: '/outfit/list',
    method: 'get',
    params: query
  })
}

export function createOutfit(data) {
  return request({
    url: '/outfit/create',
    method: 'post',
    data
  })
}

export function readOutfit(id) {
  return request({
    url: '/outfit/read',
    method: 'get',
    params: { id }
  })
}

export function updateOutfit(data) {
  return request({
    url: '/outfit/update',
    method: 'post',
    data
  })
}

export function deleteOutfit(data) {
  return request({
    url: '/outfit/delete',
    method: 'post',
    data
  })
}

export function statusOutfit(data) {
  return request({
    url: '/outfit/status',
    method: 'post',
    data
  })
}
