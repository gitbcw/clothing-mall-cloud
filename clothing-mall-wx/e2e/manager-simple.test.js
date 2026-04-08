/**
 * 管理端 TabBar 简化 E2E 测试
 *
 * 测试内容：tabShelf 页面功能
 */

const automator = require('miniprogram-automator');

const config = {
  cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
  projectPath: '/Users/combo/MyFile/projects/clothing-mall/clothing-mall-wx',
  serverPort: 34479,
};

const results = { passed: [], failed: [], skipped: [] };

function log(name, status, detail = '') {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  console.log(`${icon} ${name}${detail ? `: ${detail}` : ''}`);
  results[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : 'skipped'].push(name);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  let miniProgram;

  try {
    console.log('\n========================================');
    console.log('管理端 TabBar E2E 测试（简化版）');
    console.log('========================================\n');

    console.log('📡 连接微信开发者工具 (端口: 34479)...');
    miniProgram = await automator.launch({
      cliPath: config.cliPath,
      projectPath: config.projectPath,
      serverPort: config.serverPort,
    });
    console.log('✅ 连接成功\n');

    // 获取当前页面
    let page = await miniProgram.currentPage();
    console.log(`📍 当前页面: ${page.path}\n`);

    // 如果不在管理端页面，先切换
    if (!page.path.includes('manager/')) {
      console.log('📍 切换到管理端...');
      try {
        await miniProgram.switchTab('/pages/manager/tabOrder/tabOrder');
        await sleep(2000);
        page = await miniProgram.currentPage();
        console.log(`   切换后: ${page.path}`);
      } catch (e) {
        console.log(`   切换失败: ${e.message}`);
        // 尝试重新导航
        await miniProgram.reLaunch('/pages/manager/tabOrder/tabOrder');
        await sleep(2000);
        page = await miniProgram.currentPage();
      }
    }

    // ========== 测试 1: 页面基础结构 ==========
    console.log('--- 页面基础测试 ---\n');

    try {
      const path = page.path || '';
      if (path.includes('tabOrder') || path.includes('tabShelf')) {
        log('1.1 管理端页面加载', 'pass', path);
      } else {
        log('1.1 管理端页面加载', 'fail', `当前: ${path}`);
      }
    } catch (e) {
      log('1.1 管理端页面加载', 'fail', e.message);
    }

    // 测试子 Tab
    try {
      const subTabs = await page.$$('.sub-tabs .sub-tab-item');
      if (subTabs && subTabs.length >= 2) {
        log('1.2 子 Tab 存在', 'pass', `${subTabs.length} 个`);
      } else {
        log('1.2 子 Tab 存在', 'fail', '未找到');
      }
    } catch (e) {
      log('1.2 子 Tab 存在', 'fail', e.message);
    }

    // ========== 测试 2: 切换到上架 Tab ==========
    console.log('\n--- 切换到上架 Tab ---\n');

    try {
      await miniProgram.switchTab('/pages/manager/tabShelf/tabShelf');
      await sleep(2000);
      page = await miniProgram.currentPage();
      console.log(`   当前页面: ${page.path}`);
      log('2.1 切换到上架 Tab', 'pass');
    } catch (e) {
      log('2.1 切换到上架 Tab', 'fail', e.message);
    }

    // ========== 测试 3: 场景标签 ==========
    console.log('\n--- 场景标签测试 ---\n');

    try {
      const sceneChips = await page.$$('.scene-chips .scene-chip');
      if (sceneChips && sceneChips.length >= 6) {
        log('3.1 预设场景标签', 'pass', `${sceneChips.length} 个`);
      } else {
        log('3.1 预设场景标签', 'fail', `${sceneChips ? sceneChips.length : 0} 个`);
      }
    } catch (e) {
      log('3.1 预设场景标签', 'fail', e.message);
    }

    try {
      const addBtn = await page.$('.scene-chip.add-btn');
      log('3.2 自定义场景入口', addBtn ? 'pass' : 'fail');
    } catch (e) {
      log('3.2 自定义场景入口', 'fail', e.message);
    }

    // ========== 测试 4: 商品参数 ==========
    console.log('\n--- 商品参数测试 ---\n');

    try {
      const addBtn = await page.$('.add-param-btn');
      log('4.1 添加参数按钮', addBtn ? 'pass' : 'fail');

      if (addBtn) {
        await addBtn.tap();
        await sleep(500);
        const paramRow = await page.$('.param-row');
        log('4.2 点击后出现参数行', paramRow ? 'pass' : 'fail');
      }
    } catch (e) {
      log('4.1 添加参数按钮', 'fail', e.message);
    }

    // ========== 测试 5: 详细介绍 ==========
    console.log('\n--- 详细介绍测试 ---\n');

    try {
      const textareas = await page.$$('.form-textarea');
      log('5.1 文本域数量', textareas && textareas.length >= 2 ? 'pass' : 'fail', `${textareas ? textareas.length : 0} 个`);
    } catch (e) {
      log('5.1 文本域数量', 'fail', e.message);
    }

    try {
      const charCount = await page.$('.char-count');
      log('5.2 字数统计', charCount ? 'pass' : 'fail');
    } catch (e) {
      log('5.2 字数统计', 'fail', e.message);
    }

    // ========== 测试 6: AI 识别 ==========
    console.log('\n--- AI 识别测试 ---\n');

    try {
      const mainImage = await page.$('.main-image');
      log('6.1 主图上传区域', mainImage ? 'pass' : 'fail');
    } catch (e) {
      log('6.1 主图上传区域', 'fail', e.message);
    }

    // ========== 测试 7: 预览按钮 ==========
    console.log('\n--- 预览按钮测试 ---\n');

    try {
      const previewBtn = await page.$('.action-btn.btn-preview');
      log('7.1 预览按钮', previewBtn ? 'pass' : 'fail');
    } catch (e) {
      log('7.1 预览按钮', 'fail', e.message);
    }

    // ========== 测试 8: 底部操作栏 ==========
    console.log('\n--- 底部操作栏测试 ---\n');

    try {
      const actionBtns = await page.$$('.action-bar .action-btn');
      log('8.1 操作按钮数量', actionBtns && actionBtns.length >= 3 ? 'pass' : 'fail', `${actionBtns ? actionBtns.length : 0} 个`);
    } catch (e) {
      log('8.1 操作按钮数量', 'fail', e.message);
    }

    // ========== 测试 9: 商品列表子 Tab ==========
    console.log('\n--- 商品列表测试 ---\n');

    try {
      const listTab = await page.$('.sub-tab-item:nth-child(2)');
      if (listTab) {
        await listTab.tap();
        await sleep(1000);
        log('9.1 切换到列表 Tab', 'pass');
      } else {
        log('9.1 切换到列表 Tab', 'skip');
      }
    } catch (e) {
      log('9.1 切换到列表 Tab', 'fail', e.message);
    }

    try {
      const listTabs = await page.$$('.list-tabs .list-tab-item');
      log('9.2 筛选 Tab', listTabs && listTabs.length >= 2 ? 'pass' : 'fail');
    } catch (e) {
      log('9.2 筛选 Tab', 'fail', e.message);
    }

    try {
      const searchInput = await page.$('.search-input');
      log('9.3 搜索框', searchInput ? 'pass' : 'fail');
    } catch (e) {
      log('9.3 搜索框', 'fail', e.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (miniProgram) {
      await miniProgram.close();
    }

    console.log('\n========================================');
    console.log('测试结果汇总');
    console.log('========================================');
    console.log(`✅ 通过: ${results.passed.length}`);
    console.log(`❌ 失败: ${results.failed.length}`);
    console.log(`⏭️ 跳过: ${results.skipped.length}`);
    console.log('========================================\n');

    if (results.failed.length > 0) {
      console.log('失败项:', results.failed.join(', '));
      process.exit(1);
    } else {
      console.log('所有测试通过!');
      process.exit(0);
    }
  }
}

runTests().catch(console.error);
