/**
 * 企微定时推送
 *
 * 扫描 litemall_push_log 中 status='pending' 且 scheduled_at <= NOW() 的记录，
 * 逐条乐观锁更新为 sending，调用企微 API 推送，记录结果。
 * 移植自 Java ScheduledPushTask。
 */
const { query, execute } = require('layer-base').db
const { systemConfig } = require('layer-base')
const wework = require('layer-wechat').wework

const BATCH_SIZE = 20

async function scheduledPush() {
  await systemConfig.loadConfigs()

  // 1. 查询待推送记录
  const logs = await query(
    `SELECT * FROM litemall_push_log
     WHERE status = 'pending' AND scheduled_at <= NOW() AND deleted = 0
     LIMIT ${BATCH_SIZE}`,
    []
  )

  if (!logs.length) {
    return { processed: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  for (const log of logs) {
    try {
      // 2. 乐观锁：pending → sending
      const lockResult = await execute(
        `UPDATE litemall_push_log SET status = 'sending', update_time = NOW()
         WHERE id = ? AND status = 'pending'`,
        [log.id]
      )
      if (lockResult.affectedRows === 0) {
        console.warn(`[scheduled-push] 记录 ${log.id} 已被其他实例处理，跳过`)
        continue
      }

      // 3. 执行推送
      let success = false
      let errorMsg = null

      if (log.content_type === 'card') {
        success = await wework.sendMiniProgramCardByTag(
          log.tag_id, log.title, log.media_id, log.page_path
        )
      } else {
        success = await wework.sendPromotionByTag(log.tag_id, log.content)
      }

      // 4. 更新结果
      if (success) {
        await execute(
          `UPDATE litemall_push_log
           SET status = 'sent', success_count = 1, fail_count = 0,
               sent_at = NOW(), update_time = NOW()
           WHERE id = ?`,
          [log.id]
        )
        sent++
      } else {
        await execute(
          `UPDATE litemall_push_log
           SET status = 'failed', error_msg = '推送 API 返回失败', update_time = NOW()
           WHERE id = ?`,
          [log.id]
        )
        failed++
      }
    } catch (err) {
      console.error(`[scheduled-push] 记录 ${log.id} 推送异常:`, err.message)
      try {
        await execute(
          `UPDATE litemall_push_log
           SET status = 'failed', error_msg = ?, update_time = NOW()
           WHERE id = ?`,
          [err.message.substring(0, 500), log.id]
        )
      } catch (updateErr) {
        console.error(`[scheduled-push] 更新记录 ${log.id} 失败:`, updateErr.message)
      }
      failed++
    }
  }

  console.info(`[scheduled-push] 完成：处理 ${logs.length} 条，成功 ${sent}，失败 ${failed}`)
  return { processed: logs.length, sent, failed }
}

module.exports = scheduledPush
