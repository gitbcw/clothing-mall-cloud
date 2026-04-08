import request from '@/utils/request'

export function listScene(query) {
  return request({
    url: '/clothing/scene/list',
    method: 'get',
    params: query
  })
}

export function createScene(data) {
  return request({
    url: '/clothing/scene/create',
    method: 'post',
    data
  })
}

export function updateScene(data) {
  return request({
    url: '/clothing/scene/update',
    method: 'post',
    data
  })
}

export function deleteScene(data) {
  return request({
    url: '/clothing/scene/delete',
    method: 'post',
    data
  })
}

export function enableScene(data) {
  return request({
    url: '/clothing/scene/enable',
    method: 'post',
    data
  })
}

export function listSceneGoods(sceneId) {
  return request({
    url: '/clothing/scene/goods',
    method: 'get',
    params: { sceneId }
  })
}

export function updateSceneGoods(data) {
  return request({
    url: '/clothing/scene/goods/update',
    method: 'post',
    data
  })
}
