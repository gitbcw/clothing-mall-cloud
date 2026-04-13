/**
 * MySQL 连接池管理
 *
 * 云函数多实例共享同一进程空间，使用单例连接池。
 * 通过环境变量配置连接信息：
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 */

const mysql = require('mysql2/promise')

let pool = null

function getPool() {
  if (!pool) {
    const host = process.env.MYSQL_HOST
    const port = parseInt(process.env.MYSQL_PORT || '3306', 10)
    const user = process.env.MYSQL_USER
    const password = process.env.MYSQL_PASSWORD
    const database = process.env.MYSQL_DATABASE

    if (!host || !user || !database) {
      throw new Error(
        `MySQL config incomplete: host=${host}, user=${!!user}, database=${database}. ` +
        'Please set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE env vars.'
      )
    }

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      timezone: '+08:00',
      // 修复 TINYINT(1) / BIT 返回 Buffer 的问题
      typeCast: (field, next) => {
        if (field.type === 'BIT') {
          const buf = field.buffer()
          return buf === null ? null : buf[0]
        }
        return next()
      },
    })
  }
  return pool
}

/**
 * 执行查询（SELECT）
 */
async function query(sql, params = []) {
  const conn = await getPool()
  const [rows] = await conn.execute(sql, params)
  return rows
}

/**
 * 执行写入（INSERT/UPDATE/DELETE），返回 { affectedRows, insertId }
 */
async function execute(sql, params = []) {
  const conn = await getPool()
  const [result] = await conn.execute(sql, params)
  return { affectedRows: result.affectedRows, insertId: result.insertId }
}

/**
 * 获取单个连接（用于事务）
 */
async function getConnection() {
  return getPool().getConnection()
}

/**
 * 关闭连接池（测试用）
 */
async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

module.exports = { getPool, query, execute, getConnection, closePool }
