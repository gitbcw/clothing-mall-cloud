import request from '@/utils/request'

export function listGoods(query) {
  return request({
    url: '/goods/list',
    method: 'get',
    params: query
  })
}

export function deleteGoods(data) {
  return request({
    url: '/goods/delete',
    method: 'post',
    data
  })
}

export function publishGoods(data) {
  return request({
    url: '/goods/create',
    method: 'post',
    data
  })
}

export function detailGoods(id) {
  return request({
    url: '/goods/detail',
    method: 'get',
    params: { id }
  })
}

export function editGoods(data) {
  return request({
    url: '/goods/update',
    method: 'post',
    data
  })
}

export function listCatAndBrand() {
  return request({
    url: '/goods/catAndBrand',
    method: 'get'
  })
}

export function generateShareImage(id) {
  return request({
    url: '/goods/generate-share-image',
    method: 'post',
    params: { id }
  })
}

export function findByGoodsSn(goodsSn) {
  return request({
    url: '/goods/findBySn',
    method: 'get',
    params: { goodsSn }
  })
}

export function publishGoodsBatch(data) {
  return request({
    url: '/goods/publish',
    method: 'post',
    data
  })
}

export function unpublishGoodsBatch(data) {
  return request({
    url: '/goods/unpublish',
    method: 'post',
    data
  })
}

export function unpublishAllGoods() {
  return request({
    url: '/goods/unpublishAll',
    method: 'post'
  })
}

export function recognizeImage(data) {
  return request({
    url: '/goods/recognizeImage',
    method: 'post',
    data
  })
}

export function recognizeTag(data) {
  return request({
    url: '/goods/recognizeTag',
    method: 'post',
    data
  })
}
