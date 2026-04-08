/**
 * 微信开发者工具连接诊断
 */

const automator = require('miniprogram-automator');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function diagnose() {
  let miniProgram;

  try {
    console.log('1. 连接微信开发者工具 (端口 34479)...');
    miniProgram = await automator.launch({
      cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
      projectPath: '/Users/combo/MyFile/projects/clothing-mall/clothing-mall-wx',
      serverPort: 34479,
    });
    console.log('   ✅ 连接成功\n');

    console.log('2. 等待页面加载...');
    await sleep(3000);

    console.log('3. 获取当前页面...');
    const page = await miniProgram.currentPage();
    if (page) {
      console.log('   页面路径: ' + page.path);
    } else {
      console.log('   无法获取页面');
    }

    console.log('4. 查找子 Tab...');
    try {
      const subTabs = await page.$$('.sub-tabs .sub-tab-item');
      console.log('   子 Tab 数量: ' + (subTabs ? subTabs.length : 0));
    } catch (e) {
      console.log('   查询失败: ' + e.message);
    }

    console.log('\n========================================');
    console.log('诊断完成');
    console.log('========================================');

  } catch (error) {
    console.error('诊断失败:', error.message);
    console.error(error.stack);
  } finally {
    if (miniProgram) {
      console.log('5. 关闭连接...');
      await miniProgram.close();
    }
  }
}

diagnose().catch(console.error);
