/**
 * admin-stat/service/dashboard.js — 仪表盘
 */
const { db, response } = require('layer-base')
const { query } = db

async function info() {
  const [userRows, goodsRows, orderRows] = await Promise.all([
    query('SELECT COUNT(*) AS c FROM litemall_user WHERE deleted = 0'),
    query('SELECT COUNT(*) AS c FROM litemall_goods WHERE deleted = 0'),
    query('SELECT COUNT(*) AS c FROM litemall_order WHERE deleted = 0'),
  ])
  return response.ok({
    userTotal: userRows[0].c,
    goodsTotal: goodsRows[0].c,
    orderTotal: orderRows[0].c,
  })
}

module.exports = { info }
