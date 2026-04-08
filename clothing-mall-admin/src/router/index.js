import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/views/layout/Layout'

/** note: Submenu only appear when children.length>=1
 *  detail see  https://panjiachen.github.io/vue-element-admin-site/guide/essentials/router-and-nav.html
 **/

/**
* hidden: true                   if `hidden:true` will not show in the sidebar(default is false)
* alwaysShow: true               if set true, will always show the root menu, whatever its child routes length
*                                if not set alwaysShow, only more than one route under the children
*                                it will becomes nested mode, otherwise not show the root menu
* redirect: noredirect           if `redirect:noredirect` will no redirect in the breadcrumb
* name:'router-name'             the name is used by <keep-alive> (must set!!!)
* meta : {
    perms: ['GET /aaa','POST /bbb']     will control the page perms (you can set multiple perms)
    title: 'title'               the name show in submenu and breadcrumb (recommend set)
    icon: 'svg-name'             the icon show in the sidebar,
    noCache: true                if true ,the page will no be cached(default is false)
  }
**/
export const constantRoutes = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index')
      }
    ]
  },
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },
  {
    path: '/auth-redirect',
    component: () => import('@/views/login/authredirect'),
    hidden: true
  },
  {
    path: '/404',
    component: () => import('@/views/errorPage/404'),
    hidden: true
  },
  {
    path: '/401',
    component: () => import('@/views/errorPage/401'),
    hidden: true
  },
  {
    path: '',
    component: Layout,
    redirect: 'dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/index'),
        name: 'Dashboard',
        meta: { title: 'app.menu.dashboard', icon: 'dashboard', affix: true }
      }
    ]
  }
]

export const asyncRoutes = [
  // ==================== 1. 订单管理 ====================
  {
    path: '/order',
    component: Layout,
    redirect: 'noredirect',
    alwaysShow: true,
    name: 'orderCenter',
    meta: {
      title: 'app.menu.order_manage',
      icon: 'chart'
    },
    children: [
      {
        path: 'order',
        component: () => import('@/views/mall/order'),
        name: 'order',
        meta: {
          perms: ['GET /admin/order/list', 'GET /admin/order/detail', 'POST /admin/order/ship', 'POST /admin/order/refund', 'POST /admin/order/delete', 'POST /admin/order/reply'],
          title: 'app.menu.order_order',
          noCache: true
        }
      },
      {
        path: 'aftersale',
        component: () => import('@/views/mall/aftersale'),
        name: 'aftersale',
        meta: {
          perms: ['GET /admin/aftersale/list', 'GET /admin/aftersale/detail', 'POST /admin/order/receive', 'POST /admin/aftersale/complete', 'POST /admin/aftersale/reject'],
          title: 'app.menu.aftersale_aftersale',
          noCache: true
        }
      }
    ]
  },

  // ==================== 2. 商品管理 ====================
  {
    path: '/goods',
    component: Layout,
    redirect: 'noredirect',
    alwaysShow: true,
    name: 'goodsManage',
    meta: {
      title: 'app.menu.goods',
      icon: 'chart'
    },
    children: [
      {
        path: 'list',
        component: () => import('@/views/goods/list'),
        name: 'goodsList',
        meta: {
          perms: ['GET /admin/goods/list', 'POST /admin/goods/delete'],
          title: 'app.menu.goods_list',
          noCache: true
        }
      },
      {
        path: 'create',
        component: () => import('@/views/goods/create'),
        name: 'goodsCreate',
        meta: {
          perms: ['POST /admin/goods/create'],
          title: 'app.menu.goods_create',
          noCache: true
        },
        hidden: true
      },
      {
        path: 'edit',
        component: () => import('@/views/goods/edit'),
        name: 'goodsEdit',
        meta: {
          perms: ['GET /admin/goods/detail', 'POST /admin/goods/update', 'POST /admin/goods/catAndBrand'],
          title: 'app.menu.goods_edit',
          noCache: true
        },
        hidden: true
      },
      {
        path: 'category',
        component: () => import('@/views/mall/category'),
        name: 'category',
        meta: {
          perms: ['GET /admin/category/list', 'POST /admin/category/create', 'GET /admin/category/read', 'POST /admin/category/update', 'POST /admin/category/delete'],
          title: 'app.menu.mall_category',
          noCache: true
        }
      },
      // 场景管理（从系统设置移入）
      {
        path: 'scene',
        component: () => import('@/views/goods/scene'),
        name: 'goodsScene',
        meta: {
          perms: ['admin:clothing:scene:list', 'admin:clothing:scene:create', 'admin:clothing:scene:update', 'admin:clothing:scene:delete'],
          title: 'app.menu.goods_scene',
          noCache: true
        }
      },
      // 穿搭推荐（从营销管理移入）
      {
        path: 'outfit',
        component: () => import('@/views/promotion/outfit'),
        name: 'goodsOutfit',
        meta: {
          perms: ['GET /admin/outfit/list', 'POST /admin/outfit/create', 'POST /admin/outfit/update', 'POST /admin/outfit/delete'],
          title: 'app.menu.goods_outfit',
          noCache: true
        }
      },
      // 节日商品管理
      {
        path: 'holiday',
        component: () => import('@/views/goods/holiday'),
        name: 'goodsHoliday',
        meta: {
          perms: ['admin:clothing:holiday:list', 'admin:clothing:holiday:create', 'admin:clothing:holiday:update', 'admin:clothing:holiday:delete'],
          title: 'app.menu.goods_holiday',
          noCache: true
        }
      },
      // 隐藏的品牌管理（保留路由但不在菜单显示）
      {
        path: 'brand',
        component: () => import('@/views/mall/brand'),
        name: 'brand',
        meta: {
          perms: ['GET /admin/brand/list', 'POST /admin/brand/create', 'GET /admin/brand/read', 'POST /admin/brand/update', 'POST /admin/brand/delete'],
          title: 'app.menu.mall_brand',
          noCache: true
        },
        hidden: true
      },
      {
        path: 'region',
        component: () => import('@/views/mall/region'),
        name: 'region',
        meta: {
          title: 'app.menu.mall_region',
          noCache: true
        },
        hidden: true
      }
    ]
  },

  // ==================== 3. 平台设置（消息推送、推送组管理、会员管理、店铺设置） ====================
  {
    path: '/platform',
    component: Layout,
    redirect: 'noredirect',
    alwaysShow: true,
    name: 'platformManage',
    meta: {
      title: 'app.menu.platform',
      icon: 'chart'
    },
    children: [
      // 消息推送（企业微信）
      {
        path: 'wework-push',
        component: () => import('@/views/wework/push'),
        name: 'platformWeworkPush',
        meta: {
          perms: ['POST /admin/wework/uploadMedia', 'POST /admin/wework/sendCard', 'POST /admin/wework/sendCardByTag'],
          title: 'app.menu.platform_wework',
          noCache: true
        }
      },
      // 推送组管理
      {
        path: 'push-group',
        component: () => import('@/views/platform/pushGroup'),
        name: 'platformPushGroup',
        meta: {
          perms: ['admin:push:group:list', 'admin:push:group:create', 'admin:push:group:update', 'admin:push:group:delete'],
          title: 'app.menu.platform_push_group',
          noCache: true
        }
      },
      // 会员管理（Tab 容器）
      {
        path: 'user',
        component: () => import('@/views/user/index'),
        name: 'platformUser',
        meta: {
          perms: ['GET /admin/user/list', 'GET /admin/address/list', 'GET /admin/collect/list', 'GET /admin/footprint/list', 'GET /admin/history/list'],
          title: 'app.menu.platform_user',
          noCache: true
        }
      },
      // 以下为旧路由兼容（已合并至会员管理 Tab）
      {
        path: 'collect',
        component: { render: h => h('div') },
        name: 'platformCollect',
        beforeEnter(to, from, next) { next('/platform/user?tab=collect') },
        meta: { perms: ['GET /admin/collect/list'], title: 'app.menu.user_collect', noCache: true },
        hidden: true
      },
      {
        path: 'footprint',
        component: { render: h => h('div') },
        name: 'platformFootprint',
        beforeEnter(to, from, next) { next('/platform/user?tab=footprint') },
        meta: { perms: ['GET /admin/footprint/list'], title: 'app.menu.user_footprint', noCache: true },
        hidden: true
      },
      {
        path: 'history',
        component: { render: h => h('div') },
        name: 'platformHistory',
        beforeEnter(to, from, next) { next('/platform/user?tab=history') },
        meta: { perms: ['GET /admin/history/list'], title: 'app.menu.user_history', noCache: true },
        hidden: true
      },
      {
        path: 'address',
        component: { render: h => h('div') },
        name: 'platformAddress',
        beforeEnter(to, from, next) { next('/platform/user?tab=address') },
        meta: { perms: ['GET /admin/address/list'], title: 'app.menu.user_address', noCache: true },
        hidden: true
      },
      {
        path: 'feedback',
        component: () => import('@/views/user/feedback'),
        name: 'platformFeedback',
        meta: {
          perms: ['GET /admin/feedback/list'],
          title: 'app.menu.user_feedback',
          noCache: true
        },
        hidden: true
      },
      // 店铺设置（门店列表）
      {
        path: 'shop',
        component: () => import('@/views/mall/shop'),
        name: 'platformShop',
        meta: {
          perms: ['GET /admin/clothing/store/list', 'POST /admin/clothing/store/create', 'POST /admin/clothing/store/update', 'POST /admin/clothing/store/delete'],
          title: 'app.menu.platform_shop',
          noCache: true
        }
      },
      // 门店人员（子页面）
      {
        path: 'shop-guide',
        component: () => import('@/views/mall/shopGuide'),
        name: 'platformShopGuide',
        meta: {
          perms: ['GET /admin/clothing/guide/list', 'POST /admin/clothing/guide/create', 'POST /admin/clothing/guide/update', 'POST /admin/clothing/guide/delete'],
          title: '门店人员',
          noCache: true
        },
        hidden: true
      },
      // 平台配置（Tab 整合页）
      {
        path: 'config',
        component: () => import('@/views/platform/config'),
        name: 'platformConfig',
        meta: {
          perms: [
            'GET /admin/config/order', 'POST /admin/config/order',
            'GET /admin/config/express', 'POST /admin/config/express',
            'GET /admin/coupon/list',
            'GET /admin/config/promotion', 'POST /admin/config/promotion',
            'GET /admin/issue/list',
            'GET /admin/keyword/list'
          ],
          title: 'app.menu.platform_config_tab',
          noCache: true
        }
      }
    ]
  },

  // ==================== 系统设置 ====================
  {
    path: '/system',
    component: Layout,
    redirect: 'noredirect',
    alwaysShow: true,
    name: 'systemManage',
    meta: {
      title: 'app.menu.system',
      icon: 'chart'
    },
    children: [
      // 场景管理（已移至 /goods，保留路由兼容）
      {
        path: 'scene',
        component: () => import('@/views/goods/scene'),
        name: 'systemScene',
        meta: {
          perms: ['admin:clothing:scene:list', 'admin:clothing:scene:create', 'admin:clothing:scene:update', 'admin:clothing:scene:delete'],
          title: 'app.menu.goods_scene',
          noCache: true
        },
        hidden: true
      },
      // 平台规则（已移至 /platform/config，保留路由兼容）
      {
        path: 'rule',
        component: () => import('@/views/config/rule'),
        name: 'systemRule',
        meta: {
          perms: ['GET /admin/config/order', 'POST /admin/config/order', 'GET /admin/config/express', 'POST /admin/config/express'],
          title: 'app.menu.platform_rule',
          noCache: true
        },
        hidden: true
      },
      // 搜索关键词（已移至 /platform/config，保留路由兼容）
      {
        path: 'keyword',
        component: () => import('@/views/mall/keyword'),
        name: 'systemKeyword',
        meta: {
          perms: ['GET /admin/keyword/list', 'POST /admin/keyword/create', 'GET /admin/keyword/read', 'POST /admin/keyword/update', 'POST /admin/keyword/delete'],
          title: 'app.menu.mall_keyword',
          noCache: true
        },
        hidden: true
      },
      // 权限管理（合并管理员+角色管理）
      {
        path: 'permission',
        component: () => import('@/views/sys/permission'),
        name: 'systemPermission',
        meta: {
          perms: ['GET /admin/admin/list', 'GET /admin/role/list'],
          title: 'app.menu.platform_permission',
          noCache: true
        }
      },
      // 通用问题（已移至 /platform/config，保留路由兼容）
      {
        path: 'issue',
        component: () => import('@/views/mall/issue'),
        name: 'systemIssue',
        meta: {
          perms: ['GET /admin/issue/list', 'POST /admin/issue/create', 'GET /admin/issue/read', 'POST /admin/issue/update', 'POST /admin/issue/delete'],
          title: 'app.menu.mall_issue',
          noCache: true
        },
        hidden: true
      },
      // 通知管理（隐藏）
      {
        path: 'notice',
        component: () => import('@/views/sys/notice'),
        name: 'systemNotice',
        meta: {
          perms: ['GET /admin/notice/list', 'POST /admin/notice/create', 'POST /admin/notice/update', 'POST /admin/notice/delete'],
          title: 'app.menu.platform_notice',
          noCache: true
        },
        hidden: true
      },
      // 操作日志
      {
        path: 'log',
        component: () => import('@/views/sys/log'),
        name: 'systemLog',
        meta: {
          perms: ['GET /admin/log/list'],
          title: 'app.menu.platform_log',
          noCache: true
        }
      },
      // 对象存储
      {
        path: 'storage',
        component: () => import('@/views/sys/os'),
        name: 'systemStorage',
        meta: {
          perms: ['GET /admin/storage/list', 'POST /admin/storage/create', 'POST /admin/storage/update', 'POST /admin/storage/delete'],
          title: 'app.menu.platform_storage',
          noCache: true
        }
      },
      // 小程序设置（已拆分至 /platform/config 的客服设置和促销规则 Tab）
      // 隐藏的原商城配置（保留路由兼容）
      {
        path: 'config-mall',
        component: () => import('@/views/config/mall'),
        name: 'systemConfigMall',
        meta: {
          perms: ['GET /admin/config/mall', 'POST /admin/config/mall'],
          title: 'app.menu.config_mall',
          noCache: true
        },
        hidden: true
      },
      // 隐藏的原运费配置（保留路由兼容）
      {
        path: 'config-express',
        component: () => import('@/views/config/express'),
        name: 'systemConfigExpress',
        meta: {
          perms: ['GET /admin/config/express', 'POST /admin/config/express'],
          title: 'app.menu.config_express',
          noCache: true
        },
        hidden: true
      },
      // 隐藏的原订单配置（保留路由兼容）
      {
        path: 'config-order',
        component: () => import('@/views/config/order'),
        name: 'systemConfigOrder',
        meta: {
          perms: ['GET /admin/config/order', 'POST /admin/config/order'],
          title: 'app.menu.config_order',
          noCache: true
        },
        hidden: true
      },
      // 隐藏的原管理员（保留路由兼容）
      {
        path: 'admin',
        component: () => import('@/views/sys/admin'),
        name: 'systemAdmin',
        meta: {
          perms: ['GET /admin/admin/list', 'POST /admin/admin/create', 'POST /admin/admin/update', 'POST /admin/admin/delete'],
          title: 'app.menu.platform_admin',
          noCache: true
        },
        hidden: true
      },
      // 隐藏的原角色管理（保留路由兼容）
      {
        path: 'role',
        component: () => import('@/views/sys/role'),
        name: 'systemRole',
        meta: {
          perms: ['GET /admin/role/list', 'POST /admin/role/create', 'POST /admin/role/update', 'POST /admin/role/delete', 'GET /admin/role/permissions', 'POST /admin/role/permissions'],
          title: 'app.menu.platform_role',
          noCache: true
        },
        hidden: true
      }
    ]
  },

  // ==================== 4. 营销管理（已隐藏，功能移至商品管理和平台配置） ====================
  {
    path: '/promotion',
    component: Layout,
    redirect: 'noredirect',
    alwaysShow: true,
    hidden: true,
    name: 'promotionManage',
    meta: {
      title: 'app.menu.promotion',
      icon: 'chart'
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/promotion/index'),
        name: 'promotionIndex',
        meta: {
          perms: ['GET /admin/coupon/list'],
          title: 'app.menu.promotion_index',
          noCache: true
        }
      },
      {
        path: 'outfit',
        component: () => import('@/views/promotion/outfit'),
        name: 'outfit',
        meta: {
          perms: ['GET /admin/outfit/list', 'POST /admin/outfit/create', 'POST /admin/outfit/update', 'POST /admin/outfit/delete'],
          title: 'app.menu.promotion_outfit',
          noCache: true
        }
      },
      {
        path: 'coupon',
        component: () => import('@/views/promotion/coupon'),
        name: 'coupon',
        meta: {
          perms: ['GET /admin/coupon/list', 'POST /admin/coupon/create', 'POST /admin/coupon/update', 'POST /admin/coupon/delete'],
          title: 'app.menu.promotion_coupon',
          noCache: true
        },
        hidden: true
      },
      {
        path: 'couponDetail',
        component: () => import('@/views/promotion/couponDetail'),
        name: 'couponDetail',
        meta: {
          perms: ['GET /admin/coupon/list', 'GET /admin/coupon/listuser'],
          title: 'app.menu.promotion_coupon_detail',
          noCache: true
        },
        hidden: true
      }
    ]
  },

  // ==================== 5. 营收分析 ====================
  {
    path: '/stat',
    component: Layout,
    redirect: '/stat/overview',
    alwaysShow: true,
    name: 'statManage',
    meta: {
      title: 'app.menu.stat',
      icon: 'chart'
    },
    children: [
      // 隐藏的增长分析（保留路由但不在菜单显示）
      {
        path: 'growth',
        component: () => import('@/views/stat/growth'),
        name: 'statGrowth',
        meta: {
          perms: ['GET /admin/stat/growth'],
          title: 'app.menu.stat_growth',
          noCache: true
        },
        hidden: true
      },
      {
        path: 'overview',
        component: () => import('@/views/stat/overview'),
        name: 'statOverview',
        meta: {
          perms: ['GET /admin/stat/order'],
          title: 'app.menu.stat_overview',
          noCache: true
        }
      },
      {
        path: 'category',
        component: () => import('@/views/stat/category'),
        name: 'statCategory',
        meta: {
          perms: ['GET /admin/stat/order'],
          title: 'app.menu.stat_category',
          noCache: true
        }
      },
      {
        path: 'season',
        component: () => import('@/views/stat/season'),
        name: 'statSeason',
        meta: {
          perms: ['GET /admin/stat/order'],
          title: 'app.menu.stat_season',
          noCache: true
        }
      },
      {
        path: 'tracker',
        component: () => import('@/views/stat/tracker'),
        name: 'statTracker',
        meta: {
          perms: ['GET /admin/stat/tracker/overview'],
          title: 'app.menu.stat_tracker',
          noCache: true
        }
      }
    ]
  },

  // 外链（隐藏）
  {
    path: 'external-link',
    component: Layout,
    redirect: 'noredirect',
    alwaysShow: true,
    name: 'externalLink',
    meta: {
      title: 'app.menu.external_link',
      icon: 'link'
    },
    hidden: true,
    children: [
      {
        path: 'https://cloud.tencent.com/product/cos',
        meta: { title: 'app.menu.external_link_tencent_cos', icon: 'link' }
      },
      {
        path: 'https://cloud.tencent.com/product/sms',
        meta: { title: 'app.menu.external_link_tencent_sms', icon: 'link' }
      },
      {
        path: 'https://pay.weixin.qq.com/index.php/core/home/login',
        meta: { title: 'app.menu.external_link_weixin_pay', icon: 'link' }
      },
      {
        path: 'https://mpkf.weixin.qq.com/',
        meta: { title: 'app.menu.external_link_weixin_mpkf', icon: 'link' }
      },
      {
        path: 'https://www.alibabacloud.com/zh/product/oss',
        meta: { title: 'app.menu.external_link_alibaba_oss', icon: 'link' }
      },
      {
        path: 'https://www.qiniu.com/products/kodo',
        meta: { title: 'app.menu.external_link_qiniu_kodo', icon: 'link' }
      },
      {
        path: 'http://www.kdniao.com/api-track',
        meta: { title: 'app.menu.external_link_kdniao_api', icon: 'link' }
      }
    ]
  },
  {
    path: '/profile',
    component: Layout,
    redirect: 'noredirect',
    alwaysShow: true,
    children: [
      {
        path: 'password',
        component: () => import('@/views/profile/password'),
        name: 'password',
        meta: { title: 'app.menu.profile_password', noCache: true }
      },
      {
        path: 'notice',
        component: () => import('@/views/profile/notice'),
        name: 'notice',
        meta: { title: 'app.menu.profile_notice', noCache: true }
      }
    ],
    hidden: true
  },

  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  // mode: 'history', // require service support
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

export default router
