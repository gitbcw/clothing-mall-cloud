import request from '@/utils/request'

export function fetchList(query) {
  return request({
    url: '/push/group/list',
    method: 'get',
    params: query
  })
}

export function fetchDetail(id) {
  return request({
    url: '/push/group/detail',
    method: 'get',
    params: { id }
  })
}

export function createPushGroup(data) {
  return request({
    url: '/push/group/create',
    method: 'post',
    data
  })
}

export function updatePushGroup(data) {
  return request({
    url: '/push/group/update',
    method: 'post',
    data
  })
}

export function deletePushGroup(id) {
  return request({
    url: '/push/group/delete',
    method: 'post',
    params: { id }
  })
}
