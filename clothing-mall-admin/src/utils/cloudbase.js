/**
 * CloudBase JS SDK 初始化单例
 *
 * v2 SDK (supabase-like API):
 *   - init 需要 accessKey（publishable key）
 *   - auth 是属性而非方法
 *   - 匿名登录用 signInAnonymously()
 */
import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: process.env.VUE_APP_CLOUDBASE_ENV,
  region: process.env.VUE_APP_CLOUDBASE_REGION || 'ap-shanghai',
  accessKey: process.env.VUE_APP_CLOUDBASE_ACCESS_KEY,
  auth: { detectSessionInUrl: true },
  timeout: 30000,
})

const auth = app.auth

// 匿名登录 — 让客户端获得调用云函数的权限
async function ensureAuth() {
  const { data, error } = await auth.getSession()
  if (error || !data?.session) {
    const result = await auth.signInAnonymously()
    if (result.error) {
      console.error('[cloudbase] 匿名登录失败:', result.error)
    }
  }
}

ensureAuth().catch(err => console.error('[cloudbase] 匿名登录失败:', err))

export default app
