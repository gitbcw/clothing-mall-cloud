import request from '@/utils/request'

/**
 * 获取企业微信标签列表
 */
export function getTags() {
  return request({
    url: '/wework/tags',
    method: 'get'
  })
}

/**
 * 获取可用的小程序跳转页面列表
 */
export function getPages() {
  return request({
    url: '/wework/pages',
    method: 'get'
  })
}

/**
 * 上传图片到企业微信素材库
 * @param {File} file 图片文件
 */
export function uploadMedia(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: '/wework/uploadMedia',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 发送小程序卡片
 * @param {Object} data { tagId, title, mediaId, page }
 */
export function sendCard(data) {
  return request({
    url: '/wework/sendCard',
    method: 'post',
    data
  })
}

/**
 * 统一消息发送
 * @param {Object} data { targetType, targetGroupIds, targetTagId, contentType, title, content, mediaId, page, scheduledAt }
 */
export function sendMessage(data) {
  return request({
    url: '/wework/sendMessage',
    method: 'post',
    data
  })
}

/**
 * 获取推送组列表
 */
export function getPushGroups() {
  return request({
    url: '/wework/pushGroups',
    method: 'get'
  })
}
