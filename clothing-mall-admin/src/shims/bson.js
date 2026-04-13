/**
 * bson stub — 浏览器端不需要 MongoDB BSON 编解码
 * 仅用于绕过 webpack 打包 bson native 模块
 */
module.exports = {
  serialize: () => Buffer.from(''),
  deserialize: () => ({}),
  BSON: {},
}
