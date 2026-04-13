/**
 * E2E 冒烟测试 — Vue Admin 管理后台
 *
 * 覆盖：
 *   1. 页面加载（SPA 渲染）
 *   2. 登录流程
 *   3. Dashboard 数据展示
 *   4. 导航菜单
 *   5. 核心页面数据渲染
 */
const { chromium } = require('playwright-core')

const BASE_URL = 'https://clo-test-4g8ukdond34672de-1258700476.tcloudbaseapp.com'
const CHROMIUM_PATH = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const USERNAME = 'admin123'
const PASSWORD = 'admin123'

// 测试结果收集
const results = []
let browser, context, page

function pass(name, detail = '') {
  results.push({ name, status: 'PASS', detail })
  console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`)
}
function fail(name, detail = '') {
  results.push({ name, status: 'FAIL', detail })
  console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`)
}

// ==================== 工具函数 ====================

/**
 * 获取 admin token
 * 优先从环境变量 ADMIN_TOKEN 读取，否则提示用户通过 MCP 获取
 */
function getAdminToken() {
  const token = process.env.ADMIN_TOKEN
  if (!token) {
    throw new Error('未设置 ADMIN_TOKEN 环境变量。请先通过 MCP invokeFunction 获取 token 后传入。')
  }
  return token
}

async function screenshot(name) {
  try {
    await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true })
  } catch (e) { /* ignore */ }
}

async function waitAndCheck(selector, timeout = 8000) {
  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    return false
  }
}

/**
 * 通过 CloudBase 测试域名的风险提醒页面
 * 点击"确定访问"按钮
 */
async function bypassRiskWarning() {
  try {
    const confirmBtn = await page.$('button:has-text("确定访问"), a:has-text("确定访问")')
    if (confirmBtn) {
      await confirmBtn.click()
      await page.waitForTimeout(3000)
      return true
    }
  } catch (e) { /* ignore */ }
  return false
}

// ==================== 测试用例 ====================

async function testPageLoad() {
  console.log('\n📄 测试1：页面加载')
  try {
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 })

    // 处理 CloudBase 风险提醒页
    await bypassRiskWarning()

    if (!response) {
      return fail('页面响应', '无响应')
    }
    pass('页面HTTP状态', `${response.status()}`)

    // 检查是否渲染了 #app
    const appDiv = await waitAndCheck('#app', 5000)
    if (appDiv) {
      pass('Vue #app 挂载')
    } else {
      fail('Vue #app 挂载', '未找到 #app 元素')
    }

    // 检查 title
    const title = await page.title()
    if (title && title.includes('川着')) {
      pass('页面标题', title)
    } else {
      fail('页面标题', `实际: "${title}"`)
    }

    await screenshot('01-page-load')
  } catch (err) {
    fail('页面加载异常', err.message.substring(0, 200))
  }
}

async function testLoginForm() {
  console.log('\n🔐 测试2：登录表单')
  try {
    // 等待登录表单
    const loginForm = await waitAndCheck('.login-container, .login-form, [class*="login"]', 10000)
    if (loginForm) {
      pass('登录表单渲染')
    } else {
      // 检查是否已经在登录页面（hash路由）
      const hash = page.url()
      if (hash.includes('login')) {
        pass('登录页面路由', hash)
      } else {
        fail('登录表单渲染', `当前URL: ${page.url()}`)
      }
    }

    // 检查用户名输入框
    const usernameInput = await waitAndCheck('input[name="username"]', 5000)
    if (usernameInput) {
      pass('用户名输入框')
    } else {
      fail('用户名输入框', '未找到')
    }

    // 检查密码输入框
    const passwordInput = await waitAndCheck('input[name="password"]', 5000)
    if (passwordInput) {
      pass('密码输入框')
    } else {
      fail('密码输入框', '未找到')
    }

    // 检查登录按钮
    const loginBtn = await waitAndCheck('button[type="submit"], button:has-text("登录"), .login-button', 5000)
    if (loginBtn) {
      pass('登录按钮')
    } else {
      fail('登录按钮', '未找到')
    }

    await screenshot('02-login-form')
  } catch (err) {
    fail('登录表单异常', err.message.substring(0, 200))
  }
}

async function testLogin() {
  console.log('\n🚀 测试3：登录 & 状态注入')
  try {
    // 获取 token
    let token
    try {
      token = await getAdminToken()
      pass('获取 Token', token.substring(0, 30) + '...')
    } catch (err) {
      fail('获取 Token', err.message.substring(0, 100))
      return
    }

    // 先导航到登录页（让 Vue app 初始化完成）
    await page.goto(BASE_URL + '/#/login', { waitUntil: 'networkidle', timeout: 15000 })
    await bypassRiskWarning()
    await page.waitForTimeout(2000)

    // 注入 Cookie
    await context.addCookies([{
      name: 'X-Litemall-Admin-Token',
      value: token,
      domain: new URL(BASE_URL).hostname,
      path: '/'
    }])

    // 直接注入 Vuex store 状态（绕过 callFunction 限制）
    await page.evaluate((tk) => {
      // 设置 token 到 cookie
      document.cookie = `X-Litemall-Admin-Token=${tk}; path=/`

      // 通过 Vue 实例访问 Vuex store
      const app = document.querySelector('#app')
      if (app && app.__vue__) {
        const store = app.__vue__.$store
        const router = app.__vue__.$router
        store.commit('SET_TOKEN', tk)
        store.commit('SET_NAME', 'admin123')
        store.commit('SET_AVATAR', 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif')
        store.commit('SET_ROLES', ['admin'])
        store.commit('SET_PERMS', ['*'])

        // 触发路由生成（添加动态路由）
        store.dispatch('GenerateRoutes', { perms: ['*'] }).then(() => {
          router.addRoutes(store.getters.addRoutes)
        })
      } else {
        throw new Error('Vue 实例未找到')
      }
    }, token)
    pass('Vuex 状态注入')

    // 导航到 dashboard
    await page.goto(BASE_URL + '/#/dashboard', { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(3000)
    await screenshot('03-after-login')

    // 检查是否在 dashboard
    const currentUrl = page.url()
    if (!currentUrl.includes('login')) {
      pass('登录状态保持', currentUrl)
    } else {
      fail('登录状态', '被重定向回登录页')
    }
  } catch (err) {
    fail('登录流程异常', err.message.substring(0, 200))
  }
}

async function testDashboard() {
  console.log('\n📊 测试4：Dashboard')
  try {
    // 等待 dashboard 元素
    await page.waitForTimeout(3000)

    // 检查侧边栏菜单
    const sidebar = await waitAndCheck('.sidebar-container, .el-aside, [class*="sidebar"]', 5000)
    if (sidebar) {
      pass('侧边栏菜单')
    } else {
      fail('侧边栏菜单', '未找到')
    }

    // 检查顶部导航栏
    const navbar = await waitAndCheck('.navbar, .el-header, .hamburger-container, [class*="navbar"]', 5000)
    if (navbar) {
      pass('顶部导航栏')
    } else {
      fail('顶部导航栏', '未找到')
    }

    // 检查主内容区
    const mainContent = await waitAndCheck('.app-main, .main-container, [class*="main"]', 5000)
    if (mainContent) {
      pass('主内容区域')
    } else {
      fail('主内容区域', '未找到')
    }

    await screenshot('04-dashboard')
  } catch (err) {
    fail('Dashboard 异常', err.message.substring(0, 200))
  }
}

async function testNavigation() {
  console.log('\n🧭 测试5：导航菜单')
  try {
    const menuItems = [
      { text: '商品', selector: '.el-menu span:has-text("商品管理")' },
      { text: '订单', selector: '.el-menu span:has-text("订单管理")' },
      { text: '平台设置', selector: '.el-menu span:has-text("平台设置")' },
      { text: '系统设置', selector: '.el-menu span:has-text("系统设置")' },
      { text: '营收分析', selector: '.el-menu span:has-text("营收分析")' },
    ]

    for (const item of menuItems) {
      try {
        const found = await waitAndCheck(item.selector, 3000)
        if (found) {
          pass(`菜单项: ${item.text}`)
        } else {
          fail(`菜单项: ${item.text}`, '未找到')
        }
      } catch (e) {
        fail(`菜单项: ${item.text}`, e.message.substring(0, 100))
      }
    }

    await screenshot('05-navigation')
  } catch (err) {
    fail('导航测试异常', err.message.substring(0, 200))
  }
}

async function testGoodsList() {
  console.log('\n👕 测试6：商品列表页')
  try {
    // 点击商品管理菜单
    const goodsMenu = await page.$('span:has-text("商品管理"), span:has-text("商品")')
    if (goodsMenu) {
      await goodsMenu.click()
      await page.waitForTimeout(1000)

      // 点击商品列表子菜单
      const goodsListMenu = await page.$('span:has-text("商品列表")')
      if (goodsListMenu) {
        await goodsListMenu.click()
        await page.waitForTimeout(3000)
        pass('进入商品列表')
      }
    }

    // 检查表格
    const table = await waitAndCheck('.el-table, table', 5000)
    if (table) {
      pass('商品表格渲染')
    } else {
      fail('商品表格渲染', '未找到表格')
    }

    // 检查分页
    const pagination = await waitAndCheck('.el-pagination', 3000)
    if (pagination) {
      pass('分页组件')
    }

    await screenshot('06-goods-list')
  } catch (err) {
    fail('商品列表异常', err.message.substring(0, 200))
  }
}

async function testOrderList() {
  console.log('\n📦 测试7：订单列表页')
  try {
    // 点击订单管理
    const orderMenu = await page.$('span:has-text("订单管理"), span:has-text("订单")')
    if (orderMenu) {
      await orderMenu.click()
      await page.waitForTimeout(1000)

      // 点击订单列表
      const orderListMenu = await page.$('span:has-text("订单列表")')
      if (orderListMenu) {
        await orderListMenu.click()
        await page.waitForTimeout(3000)
        pass('进入订单列表')
      }
    }

    // 检查表格
    const table = await waitAndCheck('.el-table, table', 5000)
    if (table) {
      pass('订单表格渲染')
    } else {
      fail('订单表格渲染', '未找到表格')
    }

    await screenshot('07-order-list')
  } catch (err) {
    fail('订单列表异常', err.message.substring(0, 200))
  }
}

async function testConsoleErrors() {
  console.log('\n🔍 测试8：控制台错误检查')
  try {
    // 收集页面中的所有 console 错误
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // 重新加载页面
    await page.goto(BASE_URL + '/#/login', { waitUntil: 'networkidle', timeout: 15000 })
    await bypassRiskWarning()
    await page.waitForTimeout(3000)

    // 过滤掉已知的非关键错误
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('DevTools') &&
      !e.includes('chrome-extension') &&
      !e.includes('net::ERR_CONNECTION') &&
      !e.includes('Content-Disposition')
    )

    if (criticalErrors.length === 0) {
      pass('无关键控制台错误')
    } else {
      fail('控制台错误', `${criticalErrors.length} 个`)
      criticalErrors.slice(0, 5).forEach(e => console.log(`    ⚠️  ${e.substring(0, 150)}`))
    }
  } catch (err) {
    fail('控制台检查异常', err.message.substring(0, 200))
  }
}

// ==================== 主函数 ====================

async function main() {
  console.log('========================================')
  console.log('  E2E 冒烟测试 — 服装商城管理后台')
  console.log(`  目标: ${BASE_URL}`)
  console.log(`  时间: ${new Date().toLocaleString('zh-CN')}`)
  console.log('========================================')

  // 创建截图目录
  const fs = require('fs')
  if (!fs.existsSync('e2e/screenshots')) {
    fs.mkdirSync('e2e/screenshots', { recursive: true })
  }

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
      bypassCSP: true,
    })

    page = await context.newPage()

    // 收集所有网络请求
    const failedRequests = []
    page.on('requestfailed', request => {
      failedRequests.push({ url: request.url(), error: request.failure()?.errorText })
    })

    // 运行测试
    await testPageLoad()
    await testLoginForm()
    await testLogin()
    await testDashboard()
    await testNavigation()
    await testGoodsList()
    await testOrderList()
    await testConsoleErrors()

    // 打印失败的网络请求
    if (failedRequests.length > 0) {
      console.log('\n⚠️  失败的网络请求:')
      failedRequests.slice(0, 10).forEach(r => {
        console.log(`    ${r.url.substring(0, 80)} — ${r.error}`)
      })
    }

  } catch (err) {
    console.error('测试运行异常:', err.message)
  } finally {
    if (browser) {
      await browser.close()
    }
  }

  // 汇总结果
  console.log('\n========================================')
  console.log('  测试结果汇总')
  console.log('========================================')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const total = results.length

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌'
    console.log(`  ${icon} ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
  })

  console.log('----------------------------------------')
  console.log(`  总计: ${total}  通过: ${passed}  失败: ${failed}`)
  console.log(`  通过率: ${total > 0 ? Math.round(passed / total * 100) : 0}%`)
  console.log('========================================')

  process.exit(failed > 0 ? 1 : 0)
}

main()
