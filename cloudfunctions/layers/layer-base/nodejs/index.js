/**
 * layer-base 导出入口
 *
 * 云函数中通过以下方式引用：
 *   const { db, response, paginate, date, systemConfig, validator, crud } = require('layer-base')
 */

const db = require('./lib/db')
const response = require('./lib/response')
const paginate = require('./lib/paginate')
const date = require('./lib/date')
const systemConfig = require('./lib/system-config')
const validator = require('./lib/validator')
const crud = require('./lib/crud')

module.exports = {
  db,
  response,
  paginate,
  date,
  systemConfig,
  validator,
  crud,
}
