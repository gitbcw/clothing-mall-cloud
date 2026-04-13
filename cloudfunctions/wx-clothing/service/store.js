/**
 * 门店接口
 *
 * 迁移自 WxClothingStoreController
 * 接口：list, detail, nearest
 */

const { db, response } = require('layer-base')

function toStoreCamel(r) {
  return {
    id: r.id, name: r.name, address: r.address, phone: r.phone,
    businessHours: r.business_hours, longitude: r.longitude, latitude: r.latitude,
    imageUrl: r.image_url, status: r.status, addTime: r.add_time, updateTime: r.update_time,
  }
}

// ==================== 门店列表 ====================

async function storeList() {
  const rows = await db.query(
    `SELECT id, name, address, phone, business_hours, longitude, latitude, image_url, status
     FROM clothing_store WHERE deleted = 0 ORDER BY id ASC`
  )

  return response.ok(rows.map(toStoreCamel))
}

// ==================== 门店详情 ====================

async function storeDetail(data) {
  const { id } = data
  if (!id) return response.badArgument()

  const rows = await db.query(
    `SELECT * FROM clothing_store WHERE id = ? AND deleted = 0 LIMIT 1`,
    [id]
  )
  if (rows.length === 0) return response.badArgumentValue()

  return response.ok(toStoreCamel(rows[0]))
}

// ==================== 最近门店 ====================

async function storeNearest(data) {
  const { longitude, latitude, limit } = data
  if (longitude == null || latitude == null) return response.badArgument()

  const maxLimit = Math.min(limit || 5, 20)

  // 查所有启用的门店
  const rows = await db.query(
    `SELECT id, name, address, phone, business_hours, longitude, latitude, image_url, status
     FROM clothing_store WHERE deleted = 0 AND status = 1`
  )

  // Haversine 公式计算距离
  const R = 6371 // 地球半径（公里）
  const toRad = (deg) => deg * Math.PI / 180
  const lng1 = toRad(parseFloat(longitude))
  const lat1 = toRad(parseFloat(latitude))

  const withDistance = rows.map(store => {
    const lng2 = toRad(parseFloat(store.longitude))
    const lat2 = toRad(parseFloat(store.latitude))
    const dLat = lat2 - lat1
    const dLng = lng2 - lng1
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return { ...toStoreCamel(store), distance: Math.round(R * c * 1000) } // 距离单位：米
  })

  // 按距离排序
  withDistance.sort((a, b) => a.distance - b.distance)

  return response.ok(withDistance.slice(0, maxLimit))
}

module.exports = { storeList, storeDetail, storeNearest }
