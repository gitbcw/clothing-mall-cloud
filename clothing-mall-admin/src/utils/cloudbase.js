/**
 * CloudBase JS SDK 初始化单例
 *
 * 必须先完成匿名登录，否则 callFunction 会静默失败。
 */
import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: process.env.VUE_APP_CLOUDBASE_ENV
})

// 匿名登录 — 让客户端获得调用云函数的权限
const auth = app.auth({ persistence: 'local' })

async function ensureAuth() {
  const state = await auth.getLoginState()
  if (!state) {
    await auth.anonymousAuthProvider().signIn()
  }
}

// 同步触发，不阻塞渲染
ensureAuth().catch(err => console.error('[cloudbase] 匿名登录失败:', err))

export default app
