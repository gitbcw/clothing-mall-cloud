import request from '@/utils/request'

export function listHoliday(query) {
  return request({
    url: '/clothing/holiday/list',
    method: 'get',
    params: query
  })
}

export function createHoliday(data) {
  return request({
    url: '/clothing/holiday/create',
    method: 'post',
    data
  })
}

export function updateHoliday(data) {
  return request({
    url: '/clothing/holiday/update',
    method: 'post',
    data
  })
}

export function deleteHoliday(data) {
  return request({
    url: '/clothing/holiday/delete',
    method: 'post',
    data
  })
}

export function enableHoliday(data) {
  return request({
    url: '/clothing/holiday/enable',
    method: 'post',
    data
  })
}

export function listHolidayGoods(holidayId) {
  return request({
    url: '/clothing/holiday/goods',
    method: 'get',
    params: { holidayId }
  })
}

export function updateHolidayGoods(data) {
  return request({
    url: '/clothing/holiday/goods/update',
    method: 'post',
    data
  })
}
