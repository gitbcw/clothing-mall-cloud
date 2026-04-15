/**
 * 运费计算（wx-cart 本地副本）
 *
 * 修复：配置 key 使用 litemall_express_freight_value（与数据库一致）
 */

const { getConfig } = require('layer-base').systemConfig

/**
 * 计算运费
 * @param {number} goodsPrice - 商品总价
 * @param {number} totalPieceCount - 商品总件数
 * @returns {number} 运费
 */
function calculateFreight(goodsPrice, totalPieceCount) {
  const freightLimit = parseFloat(getConfig('litemall_express_freight_min')) || 0
  if (freightLimit > 0 && goodsPrice >= freightLimit) {
    return 0
  }

  const freightType = parseInt(getConfig('litemall_express_freight_type')) || 0

  if (freightType === 1) {
    return calculateByPiece(totalPieceCount)
  }

  // 固定运费
  return parseFloat(getConfig('litemall_express_freight_value')) || 0
}

function calculateByPiece(totalCount) {
  const firstFreight = parseFloat(getConfig('litemall_express_freight_value')) || 0
  const additionalFreight = parseFloat(getConfig('litemall_express_freight_additional')) || 0
  const firstUnit = parseInt(getConfig('litemall_express_freight_first_unit')) || 1
  const additionalUnit = parseInt(getConfig('litemall_express_freight_additional_unit')) || 1

  if (totalCount <= firstUnit) return firstFreight

  const additionalCount = totalCount - firstUnit
  const additionalUnits = Math.ceil(additionalCount / additionalUnit)
  return firstFreight + additionalFreight * additionalUnits
}

module.exports = { calculateFreight }
