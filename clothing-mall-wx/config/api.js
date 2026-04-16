var apiRootMap = {
  develop: 'http://127.0.0.1:8088/wx/',
  trial: 'http://47.107.151.70:8088/wx/',
  release: 'http://47.107.151.70:8088/wx/'
};
var envVersion = 'trial';
// 本地调试用 trial (HTTP)，上传体验版前改为 release (HTTPS)
var WxApiRoot = apiRootMap[envVersion];
// 是否为开发环境
var isDev = envVersion !== 'release';

module.exports = {
  isDev: isDev,
  IndexUrl: WxApiRoot + 'home/index', //首页数据接口
  AboutUrl: WxApiRoot + 'home/about', //介绍信息

  CatalogList: WxApiRoot + 'catalog/index', //分类目录全部分类数据接口
  CatalogCurrent: WxApiRoot + 'catalog/current', //分类目录当前分类数据接口

  AuthLoginByWeixin: WxApiRoot + 'auth/login_by_weixin', //微信登录
  AuthLoginByPhone: WxApiRoot + 'auth/login_by_phone', //手机号一键登录
  AuthLoginByAccount: WxApiRoot + 'auth/login', //账号登录
  AuthLogout: WxApiRoot + 'auth/logout', //账号登出
  AuthRegister: WxApiRoot + 'auth/register', //账号注册
  AuthReset: WxApiRoot + 'auth/reset', //账号密码重置
  AuthRegisterCaptcha: WxApiRoot + 'auth/regCaptcha', //验证码
  AuthBindPhone: WxApiRoot + 'auth/bindPhone', //绑定微信手机号
  AuthBindPhoneManual: WxApiRoot + 'auth/bindPhoneManual', //手动输入手机号绑定

  GoodsCount: WxApiRoot + 'goods/count', //统计商品总数
  GoodsList: WxApiRoot + 'goods/list', //获得商品列表
  GoodsCategory: WxApiRoot + 'goods/category', //获得分类数据
  GoodsCategoryWithGoods: WxApiRoot + 'goods/categoryWithGoods', //分类+商品列表（合并接口）
  GoodsListAllBrief: WxApiRoot + 'goods/listAllBrief', //全量轻量商品列表（分类页专用）
  GoodsDetail: WxApiRoot + 'goods/detail', //获得商品的详情
  GoodsRelated: WxApiRoot + 'goods/related', //商品详情页的关联商品（大家都在看）

  BrandList: WxApiRoot + 'brand/list', //品牌列表
  BrandDetail: WxApiRoot + 'brand/detail', //品牌详情

  CartList: WxApiRoot + 'cart/index', //获取购物车的数据
  CartAdd: WxApiRoot + 'cart/add', // 添加商品到购物车
  CartFastAdd: WxApiRoot + 'cart/fastadd', // 立即购买商品
  CartUpdate: WxApiRoot + 'cart/update', // 更新购物车的商品
  CartDelete: WxApiRoot + 'cart/delete', // 删除购物车的商品
  CartChecked: WxApiRoot + 'cart/checked', // 选择或取消选择商品
  CartGoodsCount: WxApiRoot + 'cart/goodscount', // 获取购物车商品件数
  CartCheckout: WxApiRoot + 'cart/checkout', // 下单前信息确认

  CollectList: WxApiRoot + 'collect/list', //收藏列表
  CollectAddOrDelete: WxApiRoot + 'collect/addordelete', //添加或取消收藏

  SearchIndex: WxApiRoot + 'search/index', //搜索关键字
  SearchHelper: WxApiRoot + 'search/helper', //搜索帮助
  SearchClearHistory: WxApiRoot + 'search/clearhistory', //搜索历史清楚

  AddressList: WxApiRoot + 'address/list', //收货地址列表
  AddressDetail: WxApiRoot + 'address/detail', //收货地址详情
  AddressSave: WxApiRoot + 'address/save', //保存收货地址
  AddressDelete: WxApiRoot + 'address/delete', //保存收货地址

  ExpressQuery: WxApiRoot + 'express/query', //物流查询

  RegionList: WxApiRoot + 'region/list', //获取区域列表

  OrderSubmit: WxApiRoot + 'order/submit', // 提交订单
  OrderPrepay: WxApiRoot + 'order/prepay', // 订单的预支付会话
  OrderList: WxApiRoot + 'order/list', //订单列表
  OrderDetail: WxApiRoot + 'order/detail', //订单详情
  OrderCancel: WxApiRoot + 'order/cancel', //取消订单
  OrderRefund: WxApiRoot + 'order/refund', //退款取消订单
  OrderDelete: WxApiRoot + 'order/delete', //删除订单
  OrderConfirm: WxApiRoot + 'order/confirm', //确认收货
  OrderGoods: WxApiRoot + 'order/goods', // 代评价商品信息

  AftersaleSubmit: WxApiRoot + 'aftersale/submit', // 提交售后申请
  AftersaleList: WxApiRoot + 'aftersale/list', // 售后列表
  AftersaleDetail: WxApiRoot + 'aftersale/detail', // 售后详情
  AftersaleCancel: WxApiRoot + 'aftersale/cancel', // 取消售后

  FeedbackAdd: WxApiRoot + 'feedback/submit', //添加反馈
  FootprintList: WxApiRoot + 'footprint/list', //足迹列表
  FootprintDelete: WxApiRoot + 'footprint/delete', //删除足迹

  CouponList: WxApiRoot + 'coupon/list', //优惠券列表
  CouponMyList: WxApiRoot + 'coupon/mylist', //我的优惠券列表
  CouponSelectList: WxApiRoot + 'coupon/selectlist', //当前订单可用优惠券列表
  CouponReceive: WxApiRoot + 'coupon/receive', //优惠券领取
  CouponExchange: WxApiRoot + 'coupon/exchange', //优惠券兑换

  StorageUpload: WxApiRoot + 'storage/upload', //图片上传,
  SceneList: WxApiRoot + 'scene/list',
  SceneBanners: WxApiRoot + 'scene/banners',
  SceneGoods: WxApiRoot + 'scene/goods',
  UserIndex: WxApiRoot + 'user/index', //个人页面用户相关信息
  UserRole: WxApiRoot + 'user/role', // 获取用户角色
  UserInfo: WxApiRoot + 'user/info', //获取当前用户信息
  UserProfile: WxApiRoot + 'user/profile', //更新当前用户信息
  UserIsManager: WxApiRoot + 'user/isManager', // 检查用户是否有管理权限
  IssueList: WxApiRoot + 'issue/list', //帮助信息

  // 服装店 SKU 相关接口
  ClothingSkuList: WxApiRoot + 'clothing/sku/list', // 商品 SKU 列表
  ClothingSkuDetail: WxApiRoot + 'clothing/sku/detail', // SKU 详情
  ClothingSkuCheckStock: WxApiRoot + 'clothing/sku/checkStock', // 检查库存
  ClothingSkuSizes: WxApiRoot + 'clothing/sku/sizes', // 指定颜色下的尺码列表
  ClothingSkuQuery: WxApiRoot + 'clothing/sku/query', // 按商品+颜色+尺码查 SKU
  ClothingStoreList: WxApiRoot + 'clothing/store/list', // 门店列表
  ClothingStoreDetail: WxApiRoot + 'clothing/store/detail', // 门店详情
  ClothingStoreNearest: WxApiRoot + 'clothing/store/nearest', // 最近门店
  ClothingUserLevels: WxApiRoot + 'clothing/user/levels', // 会员等级列表
  ClothingUserInfo: WxApiRoot + 'clothing/user/info', // 会员信息
  ClothingUserBindGuide: WxApiRoot + 'clothing/user/bindGuide', // 绑定导购

  // 埋点上报接口
  TrackerReport: WxApiRoot + 'tracker/report',

  // 文件上传
  StorageUpload: WxApiRoot + 'storage/upload',

  // AI 识别相关接口
  AiRecognizeTag: WxApiRoot + 'ai/recognizeTag', // 吊牌识别
  AiRecognizeImage: WxApiRoot + 'ai/recognizeImage', // 主图识别
  AiStatus: WxApiRoot + 'ai/status', // AI 服务状态

  // 管理端订单接口
  ManagerOrderList: WxApiRoot + 'manager/order/list', // 订单列表（分页+tab统计）
  ManagerOrderDetail: WxApiRoot + 'manager/order/detail', // 管理端订单详情
  ManagerOrderShip: WxApiRoot + 'manager/order/ship', // 发货
  ManagerOrderCancel: WxApiRoot + 'manager/order/cancel', // 取消订单
  ManagerOrderRefundAgree: WxApiRoot + 'manager/order/refundAgree', // 同意退款
  ManagerOrderRefundReject: WxApiRoot + 'manager/order/refundReject', // 拒绝退款
  ManagerOrderVerify: WxApiRoot + 'manager/order/verify', // 核销自提订单
  ManagerStats: WxApiRoot + 'manager/order/stats', // 管理后台统计数据
  ManagerAftersaleList: WxApiRoot + 'manager/order/aftersale/list', // 售后列表
  ManagerAftersaleRecept: WxApiRoot + 'manager/order/aftersale/recept', // 审核通过
  ManagerAftersaleReject: WxApiRoot + 'manager/order/aftersale/reject', // 审核拒绝
  ManagerAftersaleShip: WxApiRoot + 'manager/order/aftersale/ship', // 换货发货
  ManagerShippers: WxApiRoot + 'manager/order/shippers', // 已启用快递公司列表

  // 管理端商品接口
  ManagerGoodsList: WxApiRoot + 'manager/goods/list', // 商品列表（分页+tab统计）
  ManagerGoodsDetail: WxApiRoot + 'manager/goods/detail', // 商品详情
  ManagerGoodsEdit: WxApiRoot + 'manager/goods/edit', // 编辑商品
  ManagerGoodsPublish: WxApiRoot + 'manager/goods/publish', // 上架商品
  ManagerGoodsUnpublish: WxApiRoot + 'manager/goods/unpublish', // 下架商品
  ManagerGoodsBatchDelete: WxApiRoot + 'manager/goods/batchDelete', // 批量删除
  ManagerGoodsUnpublishAll: WxApiRoot + 'manager/goods/unpublishAll', // 一键下架全部商品
  ManagerGoodsCreate: WxApiRoot + 'manager/goods/create', // 快速创建商品草稿
  ManagerGoodsCategory: WxApiRoot + 'manager/goods/category', // 商品分类列表

  // 管理端场景管理接口
  ManagerSceneList: WxApiRoot + 'manager/scene/list', // 场景列表
  ManagerSceneRead: WxApiRoot + 'manager/scene/read', // 场景详情
  ManagerSceneCreate: WxApiRoot + 'manager/scene/create', // 创建场景
  ManagerSceneUpdate: WxApiRoot + 'manager/scene/update', // 更新场景
  ManagerSceneDelete: WxApiRoot + 'manager/scene/delete', // 删除场景
  ManagerSceneEnable: WxApiRoot + 'manager/scene/enable', // 启用/禁用场景
  ManagerSceneGoods: WxApiRoot + 'manager/scene/goods', // 场景关联商品ID列表
  ManagerSceneGoodsUpdate: WxApiRoot + 'manager/scene/goods/update', // 更新场景关联商品

  // 管理端穿搭推荐接口
  ManagerOutfitList: WxApiRoot + 'manager/outfit/list', // 穿搭列表
  ManagerOutfitRead: WxApiRoot + 'manager/outfit/read', // 穿搭详情
  ManagerOutfitCreate: WxApiRoot + 'manager/outfit/create', // 创建穿搭
  ManagerOutfitUpdate: WxApiRoot + 'manager/outfit/update', // 更新穿搭
  ManagerOutfitDelete: WxApiRoot + 'manager/outfit/delete', // 删除穿搭
  ManagerOutfitStatus: WxApiRoot + 'manager/outfit/status', // 启用/禁用穿搭

  // 管理端常见问题接口
  ManagerIssueList: WxApiRoot + 'manager/issue/list', // 问题列表
  ManagerIssueCreate: WxApiRoot + 'manager/issue/create', // 创建问题
  ManagerIssueUpdate: WxApiRoot + 'manager/issue/update', // 更新问题
  ManagerIssueDelete: WxApiRoot + 'manager/issue/delete', // 删除问题

  // 管理端企微推送接口
  ManagerWeWorkTags: WxApiRoot + 'manager/wework/tags', // 企微标签列表
  ManagerWeWorkPages: WxApiRoot + 'manager/wework/pages', // 可跳转页面列表
  ManagerWeWorkUploadMedia: WxApiRoot + 'manager/wework/uploadMedia', // 上传素材到企微
  ManagerWeWorkSendCard: WxApiRoot + 'manager/wework/sendCard', // 发送小程序卡片
  ManagerWeWorkSendMessage: WxApiRoot + 'manager/wework/sendMessage', // 发送消息
  ManagerWeWorkPushGroups: WxApiRoot + 'manager/wework/pushGroups', // 推送分组列表

  // 管理端系统配置接口
  ManagerSystemConfigList: WxApiRoot + 'manager/system/configList',
  ManagerSystemConfigUpdate: WxApiRoot + 'manager/system/configUpdate',
};
