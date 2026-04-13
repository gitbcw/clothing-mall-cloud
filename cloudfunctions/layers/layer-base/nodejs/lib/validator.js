/**
 * 参数校验工具
 *
 * 云函数没有 Spring 的 @Valid 注解，需要手动校验。
 * 提供声明式校验 + 通用校验方法。
 */

/**
 * 校验必填字段，缺失时返回 ResponseUtil.badArgument() 格式
 */
function requireFields(data, fields) {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return { valid: false, field, message: `参数 ${field} 不能为空` }
    }
  }
  return { valid: true }
}

/**
 * 校验字段为正整数
 */
function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

/**
 * 安全解析分页参数
 */
function parsePositiveInt(value, defaultValue = 1) {
  const n = parseInt(value, 10)
  return isNaN(n) || n < 1 ? defaultValue : n
}

module.exports = { requireFields, isPositiveInteger, parsePositiveInt }
