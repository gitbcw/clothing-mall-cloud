/**
 * 小程序自动化测试帮助类
 */
const automator = require('miniprogram-automator');

class MiniProgramHelper {
  constructor() {
    this.miniProgram = null;
    this.projectPath = process.env.WX_PROJECT_PATH || '/Users/combo/MyFile/projects/clothing-mall/clothing-mall-wx';
  }

  /**
   * 启动小程序
   */
  async launch() {
    if (this.miniProgram) {
      return this.miniProgram;
    }

    this.miniProgram = await automator.launch({
      cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
      projectPath: this.projectPath,
    });

    return this.miniProgram;
  }

  /**
   * 关闭小程序
   */
  async close() {
    if (this.miniProgram) {
      await this.miniProgram.close();
      this.miniProgram = null;
    }
  }

  /**
   * 重新加载小程序
   */
  async reload() {
    if (this.miniProgram) {
      await this.miniProgram.reload();
    }
  }

  /**
   * 等待指定时间
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例
let helperInstance = null;

function getHelper() {
  if (!helperInstance) {
    helperInstance = new MiniProgramHelper();
  }
  return helperInstance;
}

module.exports = {
  MiniProgramHelper,
  getHelper,
};
