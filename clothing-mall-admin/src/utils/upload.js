/**
 * 文件上传工具 — CloudBase 云存储
 *
 * 提供 cloudUpload（el-upload :http-request）和 cloudUploadFile（编程式）两种方式
 */
import app from './cloudbase'

function genCloudPath(file) {
  const ext = (file.name || 'file').split('.').pop() || 'jpg'
  const name = Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.' + ext
  return 'uploads/' + name
}

/**
 * el-upload :http-request 处理器
 * 用法：<el-upload :http-request="cloudUpload" ...>
 */
export async function cloudUpload(options) {
  const file = options.file
  const cloudPath = genCloudPath(file)

  try {
    const res = await app.uploadFile({ cloudPath, filePath: file })
    const url = res.fileID
    // 回调 el-upload 的 onSuccess，保持与原 uploadPath 返回格式一致
    options.onSuccess({ errno: 0, errmsg: '成功', data: { url } })
  } catch (err) {
    console.error('[upload] cloudUpload error:', err)
    options.onError(err)
  }
}

/**
 * 编程式上传，返回 fileID
 */
export async function cloudUploadFile(file) {
  const cloudPath = genCloudPath(file)
  const res = await app.uploadFile({ cloudPath, filePath: file })
  return res.fileID
}
