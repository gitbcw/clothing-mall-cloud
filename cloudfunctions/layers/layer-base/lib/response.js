/**
 * 响应格式化工具 — 移植自 Java ResponseUtil
 *
 * 统一响应格式：{ errno, errmsg, data }
 *
 * 错误码约定（与 Java 端保持一致）：
 *   0    成功
 *   401  参数不对
 *   402  参数值不对
 *   501  请登录
 *   502  系统内部错误
 *   503  业务不支持
 *   504  更新数据已失效（乐观锁）
 *   505  更新数据失败
 *   506  无操作权限
 */

function ok(data) {
  if (data === undefined) {
    return { errno: 0, errmsg: '成功' }
  }
  return { errno: 0, errmsg: '成功', data }
}

function okList(list, total, page, limit) {
  const pages = limit > 0 ? Math.ceil(total / limit) : 0
  const data = { list, total, page, limit, pages }
  return { errno: 0, errmsg: '成功', data }
}

function fail(errno, errmsg, data) {
  const result = { errno, errmsg }
  if (data !== undefined) result.data = data
  return result
}

function badArgument() {
  return fail(401, '参数不对')
}

function badArgumentValue() {
  return fail(402, '参数值不对')
}

function unlogin() {
  return fail(501, '请登录')
}

function serious() {
  return fail(502, '系统内部错误')
}

function unsupport() {
  return fail(503, '业务不支持')
}

function updatedDateExpired() {
  return fail(504, '更新数据已经失效')
}

function updatedDataFailed() {
  return fail(505, '更新数据失败')
}

function unauthz() {
  return fail(506, '无操作权限')
}

module.exports = {
  ok, okList, fail,
  badArgument, badArgumentValue,
  unlogin, serious, unsupport,
  updatedDateExpired, updatedDataFailed, unauthz,
}
