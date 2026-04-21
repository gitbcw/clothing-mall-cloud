// https://element.eleme.cn/#/en-US/component/i18n
import el from 'element-ui/lib/locale/lang/zh-CN'

export default {
  ...el,
  lang: '中文',
  app: {
    menu: {
      dashboard: '首页',
      order_manage: '订单管理',
      order_order: '订单列表',
      aftersale_aftersale: '售后列表',
      // 会员管理
      user: '会员管理',
      user_user: '会员管理',
      user_address: '收货地址',
      user_collect: '会员收藏',
      user_footprint: '会员足迹',
      user_history: '搜索历史',
      user_feedback: '意见反馈',
      // 商品管理
      goods: '商品管理',
      goods_list: '商品列表',
      goods_create: '商品上架',
      goods_edit: '商品编辑',
      goods_scene: '场景管理',
      goods_store: '门店管理',
      goods_guide: '导购管理',
      // 活动管理
      promotion: '营销管理',
      promotion_index: '促销管理',
      promotion_coupon: '优惠券管理',
      promotion_coupon_detail: '优惠券详情',
      // 营收分析（原数据统计）
      stat: '营收分析',
      stat_growth: '增长分析',
      stat_sales: '销售分析',
      stat_tracker: '行为分析',
      stat_tracker_config: '埋点管理',
      stat_overview: '总报表',
      stat_category: '分类报表',
      stat_season: '季节分析',
      // 商城配置
      mall: '商城配置',
      mall_region: '行政区域',
      mall_brand: '品牌制造商',
      mall_category: '商品分类',
      mall_issue: '通用问题',
      mall_keyword: '搜索关键词',
      // 平台设置（合并系统管理、会员管理、运营管理等）
      platform: '平台设置',
      platform_user: '会员管理',
      platform_shop: '店铺设置',
      platform_wework: '消息推送',
      platform_push_group: '推送组管理',
      platform_shipper: '快递公司',
      // 系统设置
      system: '系统设置',
      platform_rule: '平台规则',
      platform_permission: '权限管理',
      platform_config: '商城配置',
      platform_admin: '管理员',
      platform_notice: '通知管理',
      platform_log: '操作日志',
      platform_role: '角色管理',
      platform_wx: '小程序设置',
      // 系统管理（保留旧 key 兼容）
      sys: '系统管理',
      sys_admin: '管理员',
      sys_notice: '通知管理',
      sys_log: '操作日志',
      sys_role: '角色管理',
      operation_config: '运营配置',
      operation_manage: '运营管理',
      operation_message_push: '消息推送',
      promotion_outfit: '穿搭推荐',
      promotion_activity: '活动位管理',
      goods_outfit: '穿搭推荐',
      platform_config_tab: '平台配置',
      goods_holiday: '节日商品',
      mini_program_config: '小程序设置',
      config: '配置管理',
      config_mall: '商场配置',
      config_express: '运费配置',
      config_order: '订单配置',
      config_wx: '小程序设置',
      config_promotion: '促销配置',
      external_link: '外链',
      external_link_tencent_sms: '腾讯云短信',
      external_link_weixin_pay: '微信支付',
      external_link_weixin_mpkf: '小程序客服',
      external_link_kdniao_api: '快递鸟',
      profile_password: '修改密码',
      profile_notice: '通知中心'
    },
    button: {
      add: '+ 增加',
      back_to_top: '回到顶部',
      batch_delete: '批量删除',
      cancel: '取消',
      confirm: '确定',
      create: '添加',
      delete: '删除',
      detail: '详情',
      download: '导出',
      edit: '编辑',
      permission: '授权',
      reply: '回复',
      search: '查找',
      settings: '设置',
      view: '查看'
    },
    tooltip: {
      back_to_top: '返回顶部'
    },
    message: {
      list_loading: '正在查询中。。。'
    }
  },
  login: {
    page: {
      title: '管理员登录'
    },
    placeholder: {
      username: '管理员账户',
      password: '管理员密码'
    },
    button: {
      login: '登录'
    }
  },
  navbar: {
    tooltip: {
      locale: '语言',
      full_screen: '全屏',
      size_select: '布局大小',
      notice: '通知中心'
    },
    menu: {
      home: '首页',
      github: 'Github',
      gitee: '码云',
      password: '密码修改',
      logout: '退出'
    }
  },
  dashboard: {
    section: {
      user_total: '用户数量',
      goods_total: '商品数量',
      product_total: '货品数量',
      order_total: '订单数量'
    }
  },
  user_user: {
    table: {
      id: '会员ID',
      nickname: '会员昵称',
      avatar: '会员头像',
      mobile: '手机号码',
      gender: '性别',
      birthday: '生日',
      user_level: '会员等级',
      status: '状态',
      actions: '操作'
    },
    dialog: {
      edit: '会员编辑'
    },
    form: {
      username: '会员名',
      nickname: '会员昵称',
      mobile: '手机号码',
      gender: '性别',
      user_level: '会员等级',
      status: '状态'
    },
    placeholder: {
      filter_username: '请输入会员名',
      filter_user_id: '请输入会员Id',
      filter_mobile: '请输入手机号',
      gender: '请选择',
      user_level: '请选择',
      status: '请选择'
    }
  },
  user_address: {
    table: {
      id: '地址ID',
      user_id: '会员ID',
      name: '收货人名称',
      tel: '手机号码',
      address_region: '区域地址',
      address_detail: '详细地址',
      is_default: '默认'
    },
    placeholder: {
      filter_user_id: '请输入会员ID',
      filter_name: '请输入收货人名称'
    }
  },
  user_collect: {
    table: {
      id: '收藏ID',
      user_id: '用户ID',
      value_id: '商品ID',
      add_time: '添加时间'
    },
    placeholder: {
      filter_user_id: '请输入用户ID',
      filter_value_id: '请输入商品ID'
    }
  },
  user_footprint: {
    table: {
      id: '足迹ID',
      user_id: '会员ID',
      goods_id: '商品ID',
      user_name: '会员名称',
      goods_name: '商品名称',
      add_time: '添加时间'
    },
    placeholder: {
      filter_user_id: '请输入会员ID',
      filter_goods_id: '请输入商品ID'
    }
  },
  user_history: {
    table: {
      id: '搜索ID',
      user_id: '用户ID',
      keyword: '关键字',
      add_time: '添加时间'
    },
    placeholder: {
      filter_user_id: '请输入用户ID',
      filter_keyword: '请输入搜索历史关键字'
    }
  },
  user_feedback: {
    table: {
      id: '反馈ID',
      username: '用户名',
      mobile: '手机号码',
      feed_type: '反馈类型',
      content: '反馈内容',
      pic_urls: '反馈图片',
      add_time: '时间'
    },
    placeholder: {
      filter_username: '请输入用户名',
      filter_id: '请输入反馈ID'
    }
  },
  mall_region: {
    table: {
      name: '区域名称',
      type: '区域类型',
      code: '区域编码'
    }
  },
  mall_brand: {
    table: {
      id: '品牌商ID',
      name: '品牌商名称',
      pic_url: '品牌商图片',
      desc: '介绍',
      floor_price: '底价',
      actions: '操作'
    },
    form: {
      name: '品牌商名称',
      simple_desc: '介绍',
      pic_url: '品牌商图片',
      floor_price: '底价'
    },
    placeholder: {
      filter_id: '请输入品牌商ID',
      filter_name: '请输入品牌商名称'
    }
  },
  mall_category: {
    table: {
      id: '分类ID',
      name: '分类名',
      icon_url: '分类图标',
      pic_url: '分类图片',
      keywords: '关键字',
      desc: '简介',
      season_switch: '适用季节',
      level: '级别',
      actions: '操作'
    },
    form: {
      name: '分类名称',
      keywords: '关键字',
      icon_url: '分类图标',
      pic_url: '分类图片',
      desc: '分类简介',
      level: '级别',
      pid: '父级分类',
      season_switch: '适用季节'
    },
    value: {
      level_L1: '一级分类',
      level_L2: '二级分类'
    }
  },
  mall_order: {
    business_view: {
      all: '全部订单',
      pending: '待处理',
      completed: '已完结'
    },
    pending_tab: {
      all: '全部待处理',
      unpaid: '待付款',
      to_confirm: '待确认',
      to_ship: '待发货',
      to_pickup: '到店自提'
    },
    completed_tab: {
      all: '全部已完结',
      user_cancel: '用户取消',
      system_cancel: '系统取消',
      refunded: '已退款',
      user_received: '用户收货',
      system_received: '系统收货',
      verified: '已核销'
    },
    text: {
      date_range_separator: '至',
      expand_goods_name: '商品名称：{goods_name}',
      expand_specifications: '规格：{specifications}',
      expand_unit_price: '单价：{price} 元',
      expand_number: '数量：{number} 件',
      expand_subtotal_price: '小计：{price} 元',
      detail_consigne: '（收货人）{consignee}',
      detail_mobile: '（手机号）{mobile}',
      detail_address: '（地址）{address}',
      detail_price_info: '(实际费用){actual_price}元 = (商品总价){goods_price}元 + (快递费用){freight_price}元 - (优惠减免){coupon_price}元 - (积分减免){integral_price}元',
      detail_pay_channel: '（支付渠道）{pay_channel}',
      detail_pay_time: '（支付时间）{pay_time}',
      detail_ship_channel: '（快递公司）{ship_channel}',
      detail_ship_sn: '（快递单号）{ship_sn}',
      detail_ship_time: '（发货时间）{ship_time}',
      detail_refund_amount: '（退款金额）{refund_amount}元',
      detail_refund_type: '（退款类型）{refund_type}',
      detail_refund_content: '（退款备注）{refund_content}',
      detail_refund_time: '（退款时间）{refund_time}',
      detail_confirm_time: '（确认收货时间）{confirm_time}'
    },
    table: {
      order_sn: '订单编号',
      avatar: '用户头像',
      user_name: '下单用户',
      add_time: '下单时间',
      order_status: '订单状态',
      order_price: '订单金额',
      actual_price: '实付金额',
      pay_time: '支付时间',
      consignee: '收货人',
      mobile: '收货电话',
      ship_sn: '物流单号',
      ship_channel: '物流渠道',
      actions: '操作',
      detail_goods_name: '商品名称',
      detail_goods_sn: '商品款号',
      detail_goods_specifications: '货品规格',
      detail_goods_price: '货品价格',
      detail_goods_number: '货品数量',
      detail_goods_pic_url: '货品图片',
      pay_goods_name: '商品',
      pay_goods_specifications: '规格',
      pay_goods_number: '下单数量'
    },
    dialog: {
      detail: '订单详情',
      pay: '订单收款',
      ship: '发货',
      refund: '退款'
    },
    form: {
      detail_order_sn: '订单编号',
      detail_order_status: '订单状态',
      detail_user_nickname: '订单用户',
      detail_message: '用户留言',
      detail_receiving_info: '收货信息',
      detail_goods: '商品信息',
      detail_price_info: '费用信息',
      detail_pay_info: '支付信息',
      detail_ship_info: '快递信息',
      detail_refund_info: '退款信息',
      detail_receipt_info: '收货信息',
      pay_old_money: '订单金额',
      pay_new_money: '付款金额',
      ship_channel: '快递公司',
      ship_sn: '快递编号',
      refund_money: '退款金额'
    },
    placeholder: {
      filter_nickname: '请输入用户昵称',
      filter_consignee: '请输入收货人名称',
      filter_order_sn: '请输入订单编号',
      filter_time_start: '开始日期',
      filter_time_end: '结束日期',
      filter_order_status: '请选择订单状态',
      ship_channel: '请选择'
    },
    message: {
      pay_confirm: '确认当前订单（订单编号 {order_sn} ) 已经完成线下收款  ？'
    },
    button: {
      pay: '收款',
      ship: '发货',
      refund: '退款',
      confirm: '确认订单',
      detail_cancel: '取 消',
      detail_print: '打 印'
    }
  },
  mall_aftersale: {
    section: {
      all: '全部',
      uncheck: '待审核',
      unrefund: '待退款'
    },
    table: {
      aftersale_sn: '售后编号',
      order_id: '订单ID',
      user_id: '用户ID',
      type: '售后类型',
      reason: '退款原因',
      amount: '退款价格',
      add_time: '申请时间',
      actions: '操作',
      detail_pictures: '售后图片'
    },
    dialog: {
      detail: '售后详情'
    },
    form: {
      id: '售后id',
      aftersale_sn: '售后编号',
      order_id: '订单号',
      amount: '订单金额',
      status: '订单状态',
      user_id: '订单用户id',
      type: '售后类型',
      reason: '退款原因',
      add_time: '申请时间',
      update_time: '更新时间',
      handle_time: '处理时间',
      pictures: '售后图片'
    },
    value: {
      status_1: '已申请,待审核',
      status_2: '审核通过,待退款',
      status_3: '退款成功',
      status_4: '审核不通过,已拒绝',
      type_0: '未收货退款',
      type_1: '不退货退款',
      type_2: '退货退款'
    },
    placeholder: {
      filter_aftersale_sn: '请输入售后编号',
      filter_order_id: '请输入订单ID'
    },
    button: {
      batch_recept: '批量通过',
      batch_reject: '批量拒绝',
      recept: '通过',
      reject: '拒绝',
      refund: '退款',
      cancel: '取 消'
    }
  },
  mall_issue: {
    table: {
      id: '问题ID',
      question: '问题内容',
      answer: '问题回复',
      actions: '操作'
    },
    form: {
      question: '问题',
      answer: '回复'
    },
    placeholder: {
      filter_question: '请输入问题',
      answer: '请输入内容'
    }
  },
  mall_keyword: {
    text: {
      yes: '是',
      no: '否'
    },
    table: {
      id: '关键词ID',
      keyword: '关键词',
      url: '跳转链接',
      is_hot: '是否推荐',
      is_default: '是否默认',
      actions: '操作'
    },
    form: {
      keyword: '关键词',
      url: '跳转链接',
      is_hot: '是否推荐',
      is_default: '是否默认'
    },
    placeholder: {
      filter_keyword: '请输入关键字',
      filter_url: '请输入跳转链接',
      is_hot: '请选择',
      is_default: '请选择'
    },
    value: {
      is_hot_true: '推荐',
      is_hot_false: '普通',
      is_default_true: '默认',
      is_default_false: '非默认'
    }
  },
  goods_list: {
    table: {
      id: '商品ID',
      name: '名称',
      pic_url: '图片',
      share_url: '分享图',
      detail: '详情',
      retail_price: '一口价',
      is_new: '是否新品',
      is_hot: '是否热品',
      is_on_sale: '是否上架',
      actions: '操作',
      goods_sn: '商品款号',
      gallery: '宣传画廊',
      brief: '商品介绍',
      unit: '商品单位',
      keywords: '关键字',
      category_id: '类目ID',
      brand_id: '品牌商ID'
    },
    dialog: {
      detail: '商品详情'
    },
    value: {
      is_new_true: '新品',
      is_new_false: '非新品',
      is_hot_true: '热卖',
      is_hot_false: '普通',
      is_on_sale_true: '在售',
      is_on_sale_false: '未售'
    },
    placeholder: {
      filter_goods_id: '请输入商品ID',
      filter_goods_sn: '请输入商品款号',
      filter_name: '请输入商品名称'
    }
  },
  goods_edit: {
    section: {
      goods: '商品介绍',
      specifications: '商品规格',
      products: '商品库存',
      attributes: '商品参数'
    },
    table: {
      specification_name: '规格名',
      specification_value: '规格值',
      specification_pic_url: '规格图片',
      specification_actions: '操作',
      product_specifications: '货品规格',
      product_price: '货品售价',
      product_number: '货品数量',
      product_url: '货品图片',
      product_actions: '操作',
      attribute_name: '商品参数名称',
      attribute_value: '商品参数值',
      attribute_actions: '操作'
    },
    dialog: {
      create_specification: '设置规格',
      create_product: '添加货品',
      create_attribute: '添加商品参数',
      edit_specification: '设置规格',
      edit_product: '编辑货品',
      edit_attribute_add: '添加商品参数',
      edit_attribute_edit: '编辑商品参数'
    },
    form: {
      id: '商品ID',
      goods_sn: '商品款号',
      name: '商品名称',
      is_new: '是否新品',
      is_hot: '是否热卖',
      is_on_sale: '是否上架',
      pic_url: '商品图片',
      gallery: '宣传画廊',
      unit: '商品单位',
      keywords: '关键字',
      category_id: '所属分类',
      brand_id: '所属品牌商',
      brief: '商品简介',
      detail: '商品详细介绍',
      specification_name: '规格名',
      specification_value: '规格值',
      specification_pic_url: '规格图片',
      product_specifications: '货品规格列',
      product_price: '货品售价',
      product_number: '货品数量',
      product_url: '货品图片',
      attribute_name: '商品参数名称',
      attribute_value: '商品参数值'
    },
    value: {
      is_new_true: '新品',
      is_new_false: '非新品',
      is_hot_true: '热卖',
      is_hot_false: '普通',
      is_on_sale_true: '已上架',
      is_on_sale_false: '未上架',
      multiple_spec_true: '多规格支持',
      multiple_spec_false: '默认标准规格'
    },
    placeholder: {
      unit: '件 / 个 / 盒'
    },
    button: {
      publish: '上架',
      edit: '更新商品'
    }
  },
  promotion_coupon: {
    text: {
      days: '天',
      to_time: '至',
      units: '张',
      coupon_min: '满{min}元可用',
      coupon_discount: '减免{discount}元',
      unlimited: '不限'
    },
    table: {
      id: '优惠券ID',
      name: '优惠券名称',
      desc: '介绍',
      tag: '标签',
      min: '最低消费',
      discount: '满减金额',
      limit: '每人限领',
      goods_type: '商品使用范围',
      type: '优惠券类型',
      total: '优惠券数量',
      status: '状态',
      actions: '操作',
      category_name: '分类名称',
      category_actions: '操作',
      goods_name: '商品名称',
      goods_sn: '商品款号',
      goods_actions: '操作'
    },
    form: {
      name: '优惠券名称',
      desc: '介绍',
      tag: '标签',
      min: '最低消费',
      discount: '满减金额',
      limit: '每人限领',
      type: '分发类型',
      total: '优惠券数量',
      time_type: '有效期',
      goods_type: '商品限制范围'
    },
    value: {
      time_type_0: '领券相对天数',
      time_type_1: '指定绝对时间',
      goods_type_0: '全场通用',
      goods_type_1: '指定分类',
      goods_type_2: '指定商品'
    },
    placeholder: {
      filter_name: '请输入优惠券标题',
      filter_type: '请选择优惠券类型',
      filter_status: '请选择优惠券状态',
      start_time: '选择日期',
      end_time: '选择日期',
      category: '请选择分类名称',
      goods: '商品名称/商品货号'
    }
  },
  promotion_coupon_detail: {
    text: {
      coupon_min: '满{min}元可用',
      coupon_discount: '减免{discount}元',
      unlimited: '不限'
    },
    table: {
      name: '名称',
      desc: '介绍名称',
      tag: '标签',
      type: '优惠券类型',
      min: '最低消费',
      discount: '优惠面值',
      limit: '每人限额',
      status: '当前状态',
      goods_type: '商品范围',
      time_scope: '有效期',
      code: '优惠兑换码',
      total: '发行数量',
      id: '用户优惠券ID',
      user_id: '用户ID',
      add_time: '领取时间',
      use_status: '使用状态',
      order_id: '订单ID',
      used_time: '使用时间'
    },
    placeholder: {
      filter_user_id: '请输入用户ID',
      filter_status: '请选择使用状态'
    }
  },
  sys_admin: {
    table: {
      id: '管理员ID',
      username: '管理员名称',
      avatar: '管理员头像',
      role_ids: '管理员角色',
      actions: '操作'
    },
    form: {
      username: '管理员名称',
      password: '管理员密码',
      avatar: '管理员头像',
      role_ids: '管理员角色'
    },
    placeholder: {
      filter_username: '请输入管理员名称',
      role_ids: '请选择'
    }
  },
  sys_notice: {
    table: {
      title: '通知标题',
      content: '通知详情',
      add_time: '添加时间',
      admin_id: '管理员ID',
      actions: '操作'
    },
    dialog: {
      content_detail: '通知详情'
    },
    form: {
      title: '通知标题',
      content: '通知内容'
    },
    placeholder: {
      filter_title: '请输入标题关键字',
      filter_content: '请输入内容关键字'
    }
  },
  sys_log: {
    table: {
      admin: '操作管理员',
      ip: 'IP地址',
      add_time: '操作时间',
      type: '操作类别',
      action: '操作动作',
      status: '操作状态',
      result: '操作结果',
      comment: '备注信息'
    },
    placeholder: {
      filter_name: '请输入操作管理员'
    },
    value: {
      status_success: '成功',
      status_error: '失败'
    }
  },
  sys_role: {
    table: {
      name: '角色名称',
      desc: '说明',
      actions: '操作'
    },
    dialog: {
      permission: '权限配置'
    },
    form: {
      name: '角色名称',
      desc: '说明'
    },
    placeholder: {
      filter_name: '请输入角色名称'
    }
  },
  config_mall: {
    form: {
      mall_name: '商场名称',
      mall_address: '商场地址',
      mall_coordinates: '地理坐标',
      mall_phone: '联系电话',
      mall_qq: '联系QQ'
    },
    placeholder: {
      mall_longitude: '经度',
      mall_latitude: '纬度'
    }
  },
  config_express: {
    form: {
      freight_min: '运费满减所需最低消费',
      freight_value: '运费满减不足所需运费'
    }
  },
  config_order: {
    text: {
      minutes: '分钟',
      days: '天'
    },
    form: {
      unpaid: '用户下单后超时',
      unconfirm: '订单发货后超期',
      comment: '确认收货后超期'
    },
    help: {
      unpaid: '用户未付款，则订单自动取消',
      unconfirm: '未确认收货，则订单自动确认收货',
      comment: '未评价商品，则取消评价资格'
    }
  },
  config_wx: {
    section: {
      home: '首页配置',
      other: '其他配置'
    },
    form: {
      index_new: '新品首发栏目商品显示数量',
      index_hot: '人气推荐栏目商品显示数量',
      index_brand: '品牌制造商直供栏目品牌商显示数量',
      index_topic: '专题精选栏目显示数量',
      catlog_list: '分类栏目显示数量',
      catlog_goods: '分类栏目商品显示数量',
      share: '商品分享功能'
    }
  },
  profile_notice: {
    text: {
      read: '已读',
      unread: '未读',
      admin_time: '{admin} 于 {time} 通知如下内容：'
    },
    section: {
      unread: '未读通知',
      read: '已读通知',
      all: '所有通知'
    },
    table: {
      notice_title: '通知标题',
      add_time: '通知时间',
      read_time: '通知状态',
      actions: '操作'
    },
    placeholder: {
      filter_title: '请输入标题关键字'
    },
    button: {
      batch_read: '批量已读',
      read: '阅读'
    }
  },
  profile_password: {
    form: {
      old_password: '原密码',
      new_password: '新密码',
      new_password_2: '确认密码'
    }
  }
}
