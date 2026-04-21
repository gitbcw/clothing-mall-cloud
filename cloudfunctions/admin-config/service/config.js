/**
 * admin-config/service/config.js
 *
 * 系统配置管理 — 7 个配置模块，每个模块 list + update
 *
 * 所有配置存储在 litemall_system 表（KV 结构）
 * update 采用 upsert 语义：存在则更新，不存在则插入
 */

const { db, response, systemConfig } = require('layer-base')
const { query, execute } = db

// 配置模块定义：key 前缀 → 权限
const CONFIG_MODULES = {
  mall:         { prefix: 'litemall_mall_%',            prefixes: null,                                                                listPerm: 'admin:config:mall:list',       updatePerm: 'admin:config:mall:updateConfigs' },
  express:      { prefix: 'litemall_express_%',         prefixes: null,                                                                listPerm: 'admin:config:express:list',    updatePerm: 'admin:config:express:updateConfigs' },
  order:        { prefix: null,                          prefixes: ['litemall_order_%', 'litemall_presale_%'],                          listPerm: 'admin:config:order:list',      updatePerm: 'admin:config:order:updateConfigs' },
  wx:           { prefix: 'litemall_wx_%',              prefixes: null,                                                                listPerm: 'admin:config:wx:list',         updatePerm: 'admin:config:wx:updateConfigs' },
  promotion:    { prefix: null,                          prefixes: ['litemall_newuser_%', 'litemall_birthday_%', 'litemall_wework_%'],  listPerm: 'admin:config:promotion:list',   updatePerm: 'admin:config:promotion:updateConfigs' },
  homeActivity: { prefix: 'litemall_home_activity_%',   prefixes: null,                                                                listPerm: 'admin:config:promotion:list',   updatePerm: 'admin:config:promotion:updateConfigs' },
}

/**
 * 查询配置（按模块）
 * @param {string} module - 配置模块名（mall/express/order/wx/promotion/homeActivity）
 */
async function listConfig(module) {
  const mod = CONFIG_MODULES[module]
  if (!mod) return response.badArgument()

  let rows
  const prefixes = mod.prefixes || (mod.prefix ? [mod.prefix] : null)

  if (prefixes && prefixes.length > 0) {
    const conditions = prefixes.map(() => 'key_name LIKE ?').join(' OR ')
    rows = await query(
      `SELECT key_name, key_value FROM litemall_system WHERE deleted = 0 AND (${conditions})`,
      prefixes
    )
  } else {
    rows = await query(
      'SELECT key_name, key_value FROM litemall_system WHERE deleted = 0'
    )
  }

  const data = {}
  for (const row of rows) {
    data[row.key_name] = row.key_value
  }

  return response.ok(data)
}

/**
 * 更新配置（按模块）
 * @param {string} module - 配置模块名
 * @param {object} data - key-value 配置数据
 */
async function updateConfig(module, data) {
  const mod = CONFIG_MODULES[module]
  if (!mod) return response.badArgument()

  if (!data || typeof data !== 'object') return response.badArgument()

  // 只允许更新对应前缀的 key
  const allowedPrefixes = mod.prefixes
    ? mod.prefixes.map(p => p.replace(/%$/, ''))
    : (mod.prefix ? [mod.prefix.replace(/%$/, '')] : [])

  for (const [key, value] of Object.entries(data)) {
    const isAllowed = allowedPrefixes.some(p => key.startsWith(p))
    if (!isAllowed) continue

    // Upsert
    const existing = await query(
      'SELECT id FROM litemall_system WHERE key_name = ? AND deleted = 0',
      [key]
    )

    if (existing.length > 0) {
      await execute(
        'UPDATE litemall_system SET key_value = ?, update_time = NOW() WHERE key_name = ? AND deleted = 0',
        [String(value), key]
      )
    } else {
      await execute(
        'INSERT INTO litemall_system (key_name, key_value, add_time, update_time, deleted) VALUES (?, ?, NOW(), NOW(), 0)',
        [key, String(value)]
      )
    }
  }

  // 刷新内存缓存
  if (systemConfig && systemConfig.loadConfigs) {
    try { await systemConfig.loadConfigs() } catch (e) { /* ignore */ }
  }

  return response.ok()
}

// 导出各模块的 list/update 函数
const mod = {}
for (const [name] of Object.entries(CONFIG_MODULES)) {
  mod[`${name}List`] = (data) => listConfig(name)
  mod[`${name}Update`] = (data) => updateConfig(name, data)
}

module.exports = mod
