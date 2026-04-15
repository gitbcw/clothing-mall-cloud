/**
 * 系统配置管理服务
 *
 * 按 group 读写 litemall_system 中的配置键值对。
 * 使用白名单机制：每个 group 只允许操作预定义的 key 列表。
 */

const { db, response } = require('layer-base')
const { loadConfigs } = require('layer-base').systemConfig

// ==================== 配置分组白名单 ====================

const CONFIG_GROUPS = {
  home: [
    'litemall_home_activity_bg_image',
  ],
}

// ==================== 读取配置 ====================

async function systemConfigList(data) {
  const group = data.group || 'home'
  const allowedKeys = CONFIG_GROUPS[group]
  if (!allowedKeys) {
    return response.fail(400, `未知的配置分组: ${group}`)
  }

  const rows = await db.query(
    'SELECT key_name, key_value FROM litemall_system WHERE key_name IN (?) AND deleted = 0',
    [allowedKeys]
  )

  const configs = {}
  for (const row of rows) {
    configs[row.key_name] = row.key_value
  }

  return response.ok({ group, configs })
}

// ==================== 更新配置 ====================

async function systemConfigUpdate(data) {
  const group = data.group || 'home'
  const configs = data.configs
  const allowedKeys = CONFIG_GROUPS[group]

  if (!allowedKeys) {
    return response.fail(400, `未知的配置分组: ${group}`)
  }
  if (!configs || typeof configs !== 'object') {
    return response.fail(400, '缺少 configs 参数')
  }

  for (const key of Object.keys(configs)) {
    if (!allowedKeys.includes(key)) {
      return response.fail(403, `不允许修改的配置项: ${key}`)
    }
  }

  // 批量 upsert
  for (const [key, value] of Object.entries(configs)) {
    const existing = await db.query(
      'SELECT id FROM litemall_system WHERE key_name = ? AND deleted = 0 LIMIT 1',
      [key]
    )
    if (existing.length > 0) {
      await db.query(
        'UPDATE litemall_system SET key_value = ?, update_time = NOW() WHERE key_name = ?',
        [String(value), key]
      )
    } else {
      await db.query(
        'INSERT INTO litemall_system (key_name, key_value, add_time, update_time, deleted) VALUES (?, ?, NOW(), NOW(), 0)',
        [key, String(value)]
      )
    }
  }

  // 刷新内存缓存
  await loadConfigs()

  return response.ok()
}

module.exports = { systemConfigList, systemConfigUpdate }
