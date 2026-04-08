// 全局配置
const automator = require('miniprogram-automator');

let miniProgram;

// 导出全局实例
module.exports = async () => {
  // 设置全局超时
  jest.setTimeout(60000);
};
