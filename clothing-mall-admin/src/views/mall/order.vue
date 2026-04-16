<template>
  <div class="order-page">

    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">订单管理</h2>
        <div class="view-switcher">
          <button
            :class="['view-btn', { active: businessView === 'pending' }]"
            @click="businessView = 'pending'; handleBusinessViewChange()"
          >待处理</button>
          <button
            :class="['view-btn', { active: businessView === 'completed' }]"
            @click="businessView = 'completed'; handleBusinessViewChange()"
          >已完结</button>
        </div>
      </div>
      <el-link v-if="businessView === 'pending'" class="view-all-link" @click="showAllOrders">
        查看全部订单 <i class="el-icon-arrow-right" />
      </el-link>
    </div>

    <!-- Status Overview Cards -->
    <div v-if="businessView === 'pending'" class="status-overview">
      <div class="overview-card card-amber">
        <div class="card-icon"><i class="el-icon-wallet" /></div>
        <div class="card-body">
          <span class="card-count">{{ statusCounts['101'] || 0 }}</span>
          <span class="card-label">待付款</span>
        </div>
      </div>
      <div class="overview-card card-blue">
        <div class="card-icon"><i class="el-icon-truck" /></div>
        <div class="card-body">
          <span class="card-count">{{ statusCounts['201'] || 0 }}</span>
          <span class="card-label">待发货</span>
        </div>
      </div>
      <div class="overview-card card-teal">
        <div class="card-icon"><i class="el-icon-circle-check" /></div>
        <div class="card-body">
          <span class="card-count">{{ statusCounts['501'] || 0 }}</span>
          <span class="card-label">待核销</span>
        </div>
      </div>
      <div class="overview-card card-orange">
        <div class="card-icon"><i class="el-icon-warning-outline" /></div>
        <div class="card-body">
          <span class="card-count">{{ statusCounts['202'] || 0 }}</span>
          <span class="card-label">退款中</span>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="custom-tabs">
      <button
        v-for="tab in tabList"
        :key="tab.name"
        :class="['tab-item', { active: activeTab === tab.name }]"
        @click="activeTab = tab.name; handleTabClick({ name: tab.name })"
      >
        {{ tab.label }}
        <span v-if="statusCounts[tab.name]" class="tab-badge" :class="'badge-' + getBadgeType(tab.name)">
          {{ statusCounts[tab.name] }}
        </span>
      </button>
    </div>

    <!-- Main Content -->
    <div class="content-card">

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-fields">
          <el-input v-model="listQuery.nickname" clearable class="filter-input" :placeholder="$t('mall_order.placeholder.filter_nickname')" prefix-icon="el-icon-user" />
          <el-input v-model="listQuery.consignee" clearable class="filter-input" :placeholder="$t('mall_order.placeholder.filter_consignee')" prefix-icon="el-icon-postcard" />
          <el-input v-model="listQuery.orderSn" clearable class="filter-input" :placeholder="$t('mall_order.placeholder.filter_order_sn')" prefix-icon="el-icon-document" />
          <el-date-picker
            v-model="listQuery.timeArray"
            type="datetimerange"
            value-format="yyyy-MM-dd HH:mm:ss"
            class="filter-date"
            :range-separator="$t('mall_order.text.date_range_separator')"
            :start-placeholder="$t('mall_order.placeholder.filter_time_start')"
            :end-placeholder="$t('mall_order.placeholder.filter_time_end')"
            :picker-options="pickerOptions"
          />
        </div>
        <div class="filter-actions">
          <el-button v-permission="['GET /admin/order/list']" type="primary" icon="el-icon-search" @click="handleFilter">{{ $t('app.button.search') }}</el-button>
          <el-button :loading="downloadLoading" icon="el-icon-download" @click="handleDownload">{{ $t('app.button.download') }}</el-button>
        </div>
      </div>

      <!-- Order Table -->
      <el-table
        v-loading="listLoading"
        :data="list"
        :element-loading-text="$t('app.message.list_loading')"
        fit
        highlight-current-row
        class="order-table"
      >
        <el-table-column type="expand">
          <template slot-scope="props">
            <div class="expanded-row">
              <div v-for="item in props.row.goodsVoList" :key="item.id" class="expanded-goods">
                <img :src="imageUrl(item.picUrl)" class="goods-thumb">
                <div class="goods-info">
                  <span class="goods-name">{{ $t('mall_order.text.expand_goods_name', { goods_name: item.goodsName }) }}</span>
                  <span class="goods-spec">
                    <span v-if="item.color || item.size">{{ item.color || '' }}{{ item.size ? ' / ' + item.size : '' }}</span>
                    <span v-else>{{ $t('mall_order.text.expand_specifications', { specifications: item.specifications ? item.specifications.join('-') : '' }) }}</span>
                  </span>
                </div>
                <span class="goods-price">¥{{ item.price }}</span>
                <span class="goods-num">×{{ item.number }}</span>
                <span class="goods-subtotal">¥{{ item.price * item.number }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="orderSn" :label="$t('mall_order.table.order_sn')" min-width="140">
          <template slot-scope="scope">
            <span class="order-sn">{{ scope.row.orderSn }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.user_name')" width="140">
          <template slot-scope="scope">
            <div class="user-cell">
              <el-avatar :src="imageUrl(scope.row.avatar)" :size="28" />
              <span class="user-name">{{ scope.row.userName }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.add_time')" min-width="100">
          <template slot-scope="scope">
            <span class="time-text">{{ (scope.row.addTime || '').substring(0, 10) }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.order_status')" width="110">
          <template slot-scope="scope">
            <span :class="['status-tag', 'status-' + scope.row.orderStatus]">
              {{ scope.row.orderStatus | orderStatusFilter }}
            </span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.order_price')" width="130" align="right">
          <template slot-scope="scope">
            <div class="price-cell">
              <span class="price-actual">¥{{ scope.row.actualPrice }}</span>
              <span v-if="scope.row.orderPrice !== scope.row.actualPrice" class="price-original">¥{{ scope.row.orderPrice }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.pay_time')" prop="payTime" min-width="100">
          <template slot-scope="scope">
            <span class="time-text">{{ scope.row.payTime || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.consignee')" min-width="130">
          <template slot-scope="scope">
            <div class="consignee-cell">
              <span class="consignee-name">{{ scope.row.consignee }}</span>
              <span class="consignee-mobile">{{ scope.row.mobile }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.ship_sn')" min-width="120">
          <template slot-scope="scope">
            <div v-if="scope.row.shipSn" class="ship-cell">
              <span class="ship-channel">{{ scope.row.shipChannel }}</span>
              <span class="ship-sn">{{ scope.row.shipSn }}</span>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_order.table.actions')" width="240" class-name="action-col" fixed="right">
          <template slot-scope="scope">
            <div class="action-buttons">
              <el-button v-if="canShip(scope.row)" type="primary" size="mini" round @click="handleShip(scope.row)">{{ $t('mall_order.button.ship') }}</el-button>
              <el-button v-if="canVerify(scope.row)" type="success" size="mini" round @click="handleVerify(scope.row)">核销</el-button>
              <el-button v-if="canRefund(scope.row)" type="danger" size="mini" round @click="handleRefund(scope.row)">{{ $t('mall_order.button.refund') }}</el-button>
              <el-button v-if="canDelete(scope.row)" size="mini" round @click="handleDelete(scope.row)">{{ $t('app.button.delete') }}</el-button>
              <el-button size="mini" round plain @click="handleDetail(scope.row)">{{ $t('app.button.detail') }}</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrap">
        <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />
      </div>
    </div>

    <!-- Order Detail Dialog -->
    <el-dialog :visible.sync="orderDialogVisible" :title="$t('mall_order.dialog.detail')" width="800px" custom-class="detail-dialog" top="4vh">
      <div class="dialog-body">
        <!-- Basic Info -->
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">订单编号</span>
              <span class="info-value">{{ orderDetail.order.orderSn }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">订单状态</span>
              <span :class="['status-tag', 'status-' + orderDetail.order.orderStatus]">
                {{ orderDetail.order.orderStatus | orderStatusFilter }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ $t('mall_order.form.detail_user_nickname') }}</span>
              <span class="info-value">{{ orderDetail.user.nickname }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">用户留言</span>
              <span class="info-value">{{ orderDetail.order.message || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Receiving Info -->
        <div class="detail-section">
          <div class="section-title">{{ $t('mall_order.form.detail_receiving_info') }}</div>
          <template v-if="orderDetail.order.deliveryType !== 'pickup'">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ $t('mall_order.text.detail_consigne', { consignee: '' }).replace(/\s*/g, '') }}</span>
                <span class="info-value">{{ orderDetail.order.consignee }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ $t('mall_order.text.detail_mobile', { mobile: '' }).replace(/\s*/g, '') }}</span>
                <span class="info-value">{{ orderDetail.order.mobile }}</span>
              </div>
              <div class="info-item full-width">
                <span class="info-label">{{ $t('mall_order.text.detail_address', { address: '' }).replace(/\s*/g, '') }}</span>
                <span class="info-value">{{ orderDetail.order.address }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="pickup-info">
              <div class="pickup-badge">到店自提</div>
              <div v-if="orderDetail.order.pickupCode" class="pickup-code">
                取货码：<strong>{{ orderDetail.order.pickupCode }}</strong>
              </div>
              <div v-if="orderDetail.order.pickupContact" class="pickup-contact">
                联系人：{{ orderDetail.order.pickupContact }}
                <span style="margin-left: 16px;">电话：{{ orderDetail.order.pickupPhone }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- Goods -->
        <div class="detail-section">
          <div class="section-title">{{ $t('mall_order.form.detail_goods') }}</div>
          <el-table :data="orderDetail.orderGoods" size="small" class="goods-table">
            <el-table-column align="center" :label="$t('mall_order.table.detail_goods_name')" prop="goodsName" />
            <el-table-column align="center" :label="$t('mall_order.table.detail_goods_sn')" prop="goodsSn" width="120" />
            <el-table-column align="center" :label="$t('mall_order.table.detail_goods_specifications')" prop="specifications" width="140">
              <template slot-scope="scope">
                <span v-if="scope.row.color || scope.row.size">{{ scope.row.color || '' }}{{ scope.row.size ? ' / ' + scope.row.size : '' }}</span>
                <span v-else>{{ scope.row.specifications ? scope.row.specifications.join('-') : '' }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" :label="$t('mall_order.table.detail_goods_price')" prop="price" width="100" />
            <el-table-column align="center" :label="$t('mall_order.table.detail_goods_number')" prop="number" width="80" />
            <el-table-column align="center" :label="$t('mall_order.table.detail_goods_pic_url')" prop="picUrl" width="70">
              <template slot-scope="scope">
                <img :src="imageUrl(scope.row.picUrl)" width="40" style="border-radius: 4px;">
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- Price Info -->
        <div class="detail-section">
          <div class="section-title">{{ $t('mall_order.form.detail_price_info') }}</div>
          <div class="price-breakdown">
            <div class="price-row">
              <span>商品总价</span><span>¥{{ orderDetail.order.goodsPrice }}</span>
            </div>
            <div class="price-row">
              <span>运费</span><span>¥{{ orderDetail.order.freightPrice }}</span>
            </div>
            <div v-if="orderDetail.order.couponPrice" class="price-row discount">
              <span>优惠券</span><span>-¥{{ orderDetail.order.couponPrice }}</span>
            </div>
            <div class="price-row total">
              <span>实付金额</span><span>¥{{ orderDetail.order.actualPrice }}</span>
            </div>
          </div>
        </div>

        <!-- Payment & Shipping & Refund -->
        <div class="detail-section">
          <div class="section-title">支付与物流</div>
          <div class="info-grid cols-2">
            <div class="info-item">
              <span class="info-label">支付方式</span>
              <span class="info-value">微信支付</span>
            </div>
            <div class="info-item">
              <span class="info-label">支付时间</span>
              <span class="info-value">{{ orderDetail.order.payTime || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">物流公司</span>
              <span class="info-value">{{ orderDetail.order.shipChannel || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">物流单号</span>
              <span class="info-value">{{ orderDetail.order.shipSn || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">发货时间</span>
              <span class="info-value">{{ orderDetail.order.shipTime || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">收货时间</span>
              <span class="info-value">{{ orderDetail.order.confirmTime || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Refund Info -->
        <div v-if="orderDetail.order.refundAmount" class="detail-section">
          <div class="section-title">{{ $t('mall_order.form.detail_refund_info') }}</div>
          <div class="info-grid cols-2">
            <div class="info-item">
              <span class="info-label">退款金额</span>
              <span class="info-value refund-amount">¥{{ orderDetail.order.refundAmount }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">退款类型</span>
              <span class="info-value">{{ orderDetail.order.refundType || '—' }}</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">退款备注</span>
              <span class="info-value">{{ orderDetail.order.refundContent || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">退款时间</span>
              <span class="info-value">{{ orderDetail.order.refundTime || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="orderDialogVisible = false">关闭</el-button>
        <el-button v-if="orderDetail.order.orderStatus === 201 && orderDetail.order.deliveryType !== 'pickup'" type="primary" icon="el-icon-truck" @click="dialogAction('ship')">发货</el-button>
        <el-button v-if="orderDetail.order.orderStatus === 501" type="success" icon="el-icon-circle-check" @click="dialogAction('verify')">核销</el-button>
        <el-button v-if="orderDetail.order.orderStatus === 202" type="danger" icon="el-icon-money" @click="dialogAction('refund')">退款</el-button>
      </div>
    </el-dialog>

    <!-- Pay Dialog -->
    <el-dialog :visible.sync="payDialogVisible" :title="$t('mall_order.dialog.pay')" width="500px" custom-class="action-dialog">
      <div class="dialog-body">
        <div class="pay-tip">
          {{ $t('mall_order.message.pay_confirm', { order_sn: payForm.orderSn }) }}
        </div>
        <el-form ref="payForm" :model="payForm" label-position="top">
          <el-form-item :label="$t('mall_order.form.pay_old_money')">
            <el-input-number v-model="payForm.oldMoney" :controls="false" disabled style="width: 100%;" />
          </el-form-item>
          <el-form-item :label="$t('mall_order.form.pay_new_money')">
            <el-input-number v-model="payForm.newMoney" :controls="false" style="width: 100%;" />
          </el-form-item>
        </el-form>
        <el-table :data="payForm.goodsList" size="small">
          <el-table-column property="goodsName" :label="$t('mall_order.table.pay_goods_name')" />
          <el-table-column :label="$t('mall_order.table.pay_goods_specifications')">
            <template slot-scope="scope">
              {{ scope.row.specifications.join('-') }}
            </template>
          </el-table-column>
          <el-table-column property="onumber" width="100" :label="$t('mall_order.table.pay_goods_number')" />
        </el-table>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="payDialogVisible = false">{{ $t('app.button.cancel') }}</el-button>
        <el-button type="primary" @click="confirmPay">{{ $t('app.button.confirm') }}</el-button>
      </div>
    </el-dialog>

    <!-- Ship Dialog -->
    <el-dialog :visible.sync="shipDialogVisible" :title="$t('mall_order.dialog.ship')" width="480px" custom-class="action-dialog">
      <div class="dialog-body">
        <el-form ref="shipForm" :model="shipForm" label-position="top">
          <el-form-item :label="$t('mall_order.form.ship_channel')" prop="shipChannel">
            <el-select v-model="shipForm.shipChannel" :placeholder="$t('mall_order.placeholder.ship_channel')" style="width: 100%;">
              <el-option v-for="item in channels" :key="item.code" :label="item.name" :value="item.code" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('mall_order.form.ship_sn')" prop="shipSn">
            <el-input v-model="shipForm.shipSn" placeholder="请输入物流单号" />
          </el-form-item>
        </el-form>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="shipDialogVisible = false">{{ $t('app.button.cancel') }}</el-button>
        <el-button type="primary" icon="el-icon-check" @click="confirmShip">{{ $t('app.button.confirm') }}</el-button>
      </div>
    </el-dialog>

    <!-- Refund Dialog -->
    <el-dialog :visible.sync="refundDialogVisible" :title="$t('mall_order.dialog.refund')" width="420px" custom-class="action-dialog">
      <div class="dialog-body">
        <div class="refund-tip">确认对该订单进行退款？</div>
        <el-form ref="refundForm" :model="refundForm" label-position="top">
          <el-form-item :label="$t('mall_order.form.refund_money')">
            <el-input v-model="refundForm.refundMoney" :disabled="true">
              <template slot="prepend">¥</template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="refundDialogVisible = false">{{ $t('app.button.cancel') }}</el-button>
        <el-button type="danger" @click="confirmRefund">确认退款</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { detailOrder, listOrder, listChannel, refundOrder, payOrder, deleteOrder, shipOrder, listOrderCount, verifyOrder } from '@/api/order'
import Pagination from '@/components/Pagination' // Secondary package based on el-pagination
import checkPermission from '@/utils/permission' // 权限判断函数

const statusMap = {
  101: '未付款',
  102: '用户取消',
  103: '系统取消',
  104: '管理员取消',
  201: '已付款',
  202: '申请退款',
  203: '已退款',
  301: '已发货',
  401: '用户收货',
  402: '系统收货',
  501: '待核销',
  502: '已核销',
  503: '核销过期',
  504: '核销退款'
}

export default {
  name: 'Order',
  components: { Pagination },
  filters: {
    orderStatusFilter(status) {
      return statusMap[status]
    }
  },
  data() {
    return {
      list: [],
      total: 0,
      listLoading: true,
      businessView: 'pending', // 业务视图：pending, completed, all（隐藏）
      listQuery: {
        page: 1,
        limit: 20,
        nickname: undefined,
        consignee: undefined,
        orderSn: undefined,
        timeArray: [],
        orderStatusArray: [],
        deliveryType: undefined,
        sort: 'add_time',
        order: 'desc'
      },
      pickerOptions: {
        shortcuts: [{
          text: '最近一周',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
            picker.$emit('pick', [start, end])
          }
        }, {
          text: '最近一个月',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
            picker.$emit('pick', [start, end])
          }
        }, {
          text: '最近三个月',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
            picker.$emit('pick', [start, end])
          }
        }]
      },
      statusMap,
      statusCounts: {},
      activeTab: 'all',
      orderDialogVisible: false,
      orderDetail: {
        order: {},
        user: {},
        orderGoods: []
      },
      shipForm: {
        orderId: undefined,
        shipChannel: undefined,
        shipSn: undefined
      },
      shipDialogVisible: false,
      payForm: {
        orderId: undefined,
        orderSn: '',
        oldMoney: 0,
        newMoney: 0,
        goodsList: []
      },
      payDialogVisible: false,
      refundForm: {
        orderId: undefined,
        refundMoney: undefined
      },
      refundDialogVisible: false,
      downloadLoading: false,
      channels: []
    }
  },
  computed: {
    tabList() {
      if (this.businessView === 'pending') {
        return [
          { name: 'pending_all', label: '全部待处理' },
          { name: '101', label: '待付款' },
          { name: '201', label: '待发货' },
          { name: '501', label: '待核销' }
        ]
      } else if (this.businessView === 'completed') {
        return [
          { name: 'completed_all', label: '全部已完结' },
          { name: '102', label: '用户取消' },
          { name: '103', label: '系统取消' },
          { name: '203', label: '已退款' },
          { name: '401', label: '用户收货' },
          { name: '402', label: '系统收货' },
          { name: '502', label: '已核销' },
          { name: '503', label: '核销过期' },
          { name: '504', label: '核销退款' }
        ]
      }
      // 全部订单
      const tabs = [{ name: 'all', label: '全部' }]
      for (const key in this.statusMap) {
        tabs.push({ name: key, label: this.statusMap[key] })
      }
      return tabs
    }
  },
  created() {
    // 设置初始 Tab 和筛选条件
    this.activeTab = this.tabList[0].name
    this.handleTabClick({ name: this.activeTab })
    this.getChannel()
    this.getOrderCounts()
  },
  methods: {
    checkPermission,
    getBadgeType(status) {
      // 红色: 201(已付款), 202(申请退款), 501(待核销) - 需要紧急处理
      if (['201', '202', '501', 'pending_all'].includes(String(status))) {
        return 'danger'
      }
      // 蓝色: 301(已发货), all(全部) - 进行中或总览
      if (String(status) === '301' || status === 'all') {
        return 'primary'
      }
      // 橙色: 101(未付款) - 待办但不紧急
      if (String(status) === '101') {
        return 'warning'
      }
      // 绿色: 401, 402, 502(已收货/已核销) - 成功完成
      if (['401', '402', '502', 'completed_all'].includes(String(status))) {
        return 'success'
      }
      // 灰色: 其他(取消、退款完成等)
      return 'info'
    },
    // 业务视图切换
    handleBusinessViewChange() {
      this.activeTab = this.tabList[0].name
      this.listQuery.page = 1
      this.listQuery.orderStatusArray = []
      this.listQuery.deliveryType = undefined
      this.handleTabClick({ name: this.activeTab })
    },
    // 显示全部订单（隐藏入口）
    showAllOrders() {
      this.businessView = 'all'
      this.activeTab = 'all'
      this.listQuery.page = 1
      this.listQuery.orderStatusArray = []
      this.listQuery.deliveryType = undefined
      this.getList()
      this.getOrderCounts()
    },
    // 按钮显示条件
    canDelete(row) {
      return [102, 103, 104, 203, 401, 402, 502, 503, 504].includes(row.orderStatus)
    },
    canShip(row) {
      return row.orderStatus === 201 && row.deliveryType !== 'pickup'
    },
    canRefund(row) {
      return row.orderStatus === 202
    },
    canVerify(row) {
      return row.orderStatus === 501
    },
    getOrderCounts() {
      listOrderCount().then(response => {
        this.statusCounts = response.data.data
      }).catch(() => {
        this.statusCounts = {}
      })
    },
    getList() {
      this.listLoading = true
      if (this.listQuery.timeArray && this.listQuery.timeArray.length === 2) {
        this.listQuery.start = this.listQuery.timeArray[0]
        this.listQuery.end = this.listQuery.timeArray[1]
      } else {
        this.listQuery.start = null
        this.listQuery.end = null
      }
      if (this.listQuery.orderId) {
        detailOrder(this.listQuery.orderId).then(response => {
          this.list = []
          if (response.data.data.order) {
            this.list.push(response.data.data.order)
            this.total = 1
            this.listLoading = false
          }
        }).catch(() => {
          this.list = []
          this.total = 0
          this.listLoading = false
        })
      } else {
        listOrder(this.listQuery).then(response => {
          this.list = response.data.data.list
          this.total = response.data.data.total
          this.listLoading = false
        }).catch(() => {
          this.list = []
          this.total = 0
          this.listLoading = false
        })
      }
    },
    getChannel() {
      listChannel().then(response => {
        this.channels = response.data.data
      })
    },
    handleTabClick(tab) {
      this.listQuery.page = 1
      const tabName = tab.name || this.activeTab

      // 重置筛选条件
      this.listQuery.orderStatusArray = []
      this.listQuery.deliveryType = undefined

      if (tabName === 'all') {
        // 全部订单 - 不筛选
      } else if (tabName === 'pending_all') {
        // 全部待处理
        this.listQuery.orderStatusArray = [101, 201, 501]
      } else if (tabName === 'completed_all') {
        // 全部已完结
        this.listQuery.orderStatusArray = [102, 103, 104, 203, 401, 402, 502, 503, 504]
      } else {
        // 单个状态
        this.listQuery.orderStatusArray = [parseInt(tabName)]
      }
      this.getList()
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleDetail(row) {
      detailOrder(row.id).then(response => {
        this.orderDetail = response.data.data
      })
      this.orderDialogVisible = true
    },
    // 详情对话框操作按钮 → 跳转到对应操作
    dialogAction(action) {
      this.orderDialogVisible = false
      const row = { id: this.orderDetail.order.id, orderStatus: this.orderDetail.order.orderStatus, actualPrice: this.orderDetail.order.actualPrice }
      if (action === 'ship') {
        this.handleShip({ id: row.id, shipChannel: this.orderDetail.order.shipChannel, shipSn: this.orderDetail.order.shipSn })
      } else if (action === 'verify') {
        this.handleVerify({ id: row.id })
      } else if (action === 'refund') {
        this.handleRefund({ id: row.id, actualPrice: row.actualPrice })
      }
    },
    handleVerify(row) {
      this.$confirm('确认核销该订单？', '核销确认', {
        confirmButtonText: '确定核销',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        verifyOrder({ orderId: row.id }).then(response => {
          this.$notify.success({ title: '成功', message: '核销成功' })
          this.getList()
          this.getOrderCounts()
        }).catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
      }).catch(() => {})
    },
    handlePay(row) {
      this.payForm.orderId = row.id
      this.payForm.orderSn = row.orderSn
      this.payForm.oldMoney = row.actualPrice
      this.payForm.newMoney = row.actualPrice
      this.payForm.goodsList = row.goodsVoList
      this.payForm.goodsList.forEach(element => {
        element.onumber = element.number
      })
      this.payDialogVisible = true
    },
    confirmPay() {
      if (this.payForm.oldMoney !== this.payForm.newMoney) {
        const diff = this.payForm.newMoney - this.payForm.oldMoney
        this.$confirm('差额 ' + diff + '元， 是否确认提交')
          .then(_ => {
            this.confirmPay2()
          })
          .catch(_ => {})
      } else {
        this.confirmPay2()
      }
    },
    confirmPay2() {
      payOrder(this.payForm).then(response => {
        this.$notify.success({
          title: '成功',
          message: '订单收款操作成功'
        })
        this.getList()
      }).catch(response => {
        this.$notify.error({
          title: '失败',
          message: response.data.errmsg
        })
      }).finally(() => {
        this.payDialogVisible = false
      })
    },
    handleShip(row) {
      this.shipForm.orderId = row.id
      this.shipForm.shipChannel = row.shipChannel
      this.shipForm.shipSn = row.shipSn

      this.shipDialogVisible = true
      this.$nextTick(() => {
        this.$refs['shipForm'].clearValidate()
      })
    },
    confirmShip() {
      this.$refs['shipForm'].validate((valid) => {
        if (valid) {
          shipOrder(this.shipForm).then(response => {
            this.shipDialogVisible = false
            this.$notify.success({
              title: '成功',
              message: '确认发货成功'
            })
            this.getList()
            this.getOrderCounts()
          }).catch(response => {
            this.$notify.error({
              title: '失败',
              message: response.data.errmsg
            })
          })
        }
      })
    },
    handleDelete(row) {
      deleteOrder({ orderId: row.id }).then(response => {
        this.$notify.success({
          title: '成功',
          message: '订单删除成功'
        })
        this.getList()
        this.getOrderCounts()
      }).catch(response => {
        this.$notify.error({
          title: '失败',
          message: response.data.errmsg
        })
      })
    },
    handleRefund(row) {
      this.refundForm.orderId = row.id
      this.refundForm.refundMoney = row.actualPrice

      this.refundDialogVisible = true
      this.$nextTick(() => {
        this.$refs['refundForm'].clearValidate()
      })
    },
    confirmRefund() {
      this.$refs['refundForm'].validate((valid) => {
        if (valid) {
          refundOrder(this.refundForm).then(response => {
            this.refundDialogVisible = false
            this.$notify.success({
              title: '成功',
              message: '确认退款成功'
            })
            this.getList()
            this.getOrderCounts()
          }).catch(response => {
            this.$notify.error({
              title: '失败',
              message: response.data.errmsg
            })
          })
        }
      })
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['订单ID', '订单编号', '用户ID', '订单状态', '是否删除', '收货人', '收货联系电话', '收货地址']
        const filterVal = ['id', 'orderSn', 'userId', 'orderStatus', 'isDelete', 'consignee', 'mobile', 'address']
        excel.export_json_to_excel2(tHeader, this.list, filterVal, '订单信息')
        this.downloadLoading = false
      })
    }
  }
}
</script>

<style lang="scss" scoped>
// ====================== Variables ======================
$order-primary: #1890ff;
$order-success: #52c41a;
$order-warning: #fa8c16;
$order-danger: #ff4d4f;
$order-bg: #f0f2f5;
$order-surface: #ffffff;
$order-text: #1f1f1f;
$order-text-secondary: #8c8c8c;
$order-border: #f0f0f0;
$order-radius: 8px;

.order-page {
  padding: 24px;
  background: $order-bg;
  min-height: calc(100vh - 84px);

  // ====================== Page Header ======================
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: $order-text;
      margin: 0;
    }

    .view-switcher {
      display: flex;
      background: $order-surface;
      border-radius: 6px;
      padding: 3px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

      .view-btn {
        padding: 6px 18px;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        color: $order-text-secondary;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;

        &.active {
          background: $order-primary;
          color: #fff;
          box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
        }

        &:not(.active):hover {
          color: $order-primary;
        }
      }
    }

    .view-all-link {
      font-size: 13px;
      color: $order-text-secondary;
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: $order-primary;
      }

      i {
        margin-left: 2px;
        font-size: 12px;
      }
    }
  }

  // ====================== Status Overview ======================
  .status-overview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;

    .overview-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: $order-surface;
      border-radius: $order-radius;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: transform 0.2s, box-shadow 0.2s;
      border-left: 3px solid transparent;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .card-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .card-body {
        display: flex;
        flex-direction: column;
      }

      .card-count {
        font-size: 28px;
        font-weight: 700;
        line-height: 1.2;
      }

      .card-label {
        font-size: 13px;
        color: $order-text-secondary;
        margin-top: 2px;
      }

      &.card-amber {
        border-left-color: $order-warning;
        .card-icon { background: rgba(250, 140, 22, 0.1); color: $order-warning; }
        .card-count { color: $order-warning; }
      }

      &.card-blue {
        border-left-color: $order-primary;
        .card-icon { background: rgba(24, 144, 255, 0.1); color: $order-primary; }
        .card-count { color: $order-primary; }
      }

      &.card-teal {
        border-left-color: #13c2c2;
        .card-icon { background: rgba(19, 194, 194, 0.1); color: #13c2c2; }
        .card-count { color: #13c2c2; }
      }

      &.card-orange {
        border-left-color: $order-danger;
        .card-icon { background: rgba(255, 77, 79, 0.1); color: $order-danger; }
        .card-count { color: $order-danger; }
      }
    }
  }

  // ====================== Tab Navigation ======================
  .custom-tabs {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: $order-surface;
    border-radius: $order-radius;
    margin-bottom: 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    overflow-x: auto;

    .tab-item {
      position: relative;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: transparent;
      font-size: 13px;
      color: $order-text-secondary;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      font-weight: 500;

      &:hover {
        color: $order-text;
        background: rgba(0, 0, 0, 0.04);
      }

      &.active {
        color: $order-primary;
        background: rgba(24, 144, 255, 0.08);
        font-weight: 600;
      }

      .tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        margin-left: 6px;
        border-radius: 9px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;

        &.badge-danger { background: rgba(255, 77, 79, 0.1); color: $order-danger; }
        &.badge-primary { background: rgba(24, 144, 255, 0.1); color: $order-primary; }
        &.badge-warning { background: rgba(250, 140, 22, 0.1); color: $order-warning; }
        &.badge-success { background: rgba(82, 196, 26, 0.1); color: $order-success; }
        &.badge-info { background: rgba(140, 140, 140, 0.1); color: $order-text-secondary; }
      }
    }
  }

  // ====================== Content Card ======================
  .content-card {
    background: $order-surface;
    border-radius: $order-radius;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  // ====================== Filter Bar ======================
  .filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid $order-border;
    gap: 12px;
    flex-wrap: wrap;

    .filter-fields {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      flex: 1;
    }

    .filter-input {
      width: 160px;
    }

    .filter-date {
      width: 360px;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  // ====================== Table ======================
  .order-table {
    ::v-deep {
      th {
        background: #fafbfc !important;
        color: $order-text-secondary !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        border-bottom: 1px solid #eee !important;
      }

      td {
        padding: 12px 0;
      }

      .el-table__expanded-cell {
        padding: 0;
      }
    }

    .order-sn {
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      color: $order-text;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 8px;

      .user-name {
        font-size: 13px;
        color: $order-text;
      }
    }

    .time-text {
      font-size: 13px;
      color: $order-text-secondary;
    }

    // Status Tags
    .status-tag {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-101 { background: rgba(250, 140, 22, 0.1); color: $order-warning; }
    .status-102, .status-103, .status-104 { background: rgba(140, 140, 140, 0.1); color: #8c8c8c; }
    .status-201 { background: rgba(24, 144, 255, 0.1); color: $order-primary; }
    .status-202 { background: rgba(255, 77, 79, 0.1); color: $order-danger; }
    .status-203 { background: rgba(140, 140, 140, 0.1); color: #8c8c8c; }
    .status-301 { background: rgba(24, 144, 255, 0.1); color: $order-primary; }
    .status-401, .status-402 { background: rgba(82, 196, 26, 0.1); color: $order-success; }
    .status-501 { background: rgba(19, 194, 194, 0.1); color: #13c2c2; }
    .status-502 { background: rgba(82, 196, 26, 0.1); color: $order-success; }
    .status-503, .status-504 { background: rgba(140, 140, 140, 0.1); color: #8c8c8c; }

    // Price Cell
    .price-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .price-actual {
        font-size: 14px;
        font-weight: 600;
        color: $order-text;
      }

      .price-original {
        font-size: 12px;
        color: #bbb;
        text-decoration: line-through;
      }
    }

    // Consignee Cell
    .consignee-cell {
      display: flex;
      flex-direction: column;

      .consignee-name {
        font-size: 13px;
        color: $order-text;
        font-weight: 500;
      }

      .consignee-mobile {
        font-size: 12px;
        color: $order-text-secondary;
      }
    }

    // Ship Cell
    .ship-cell {
      display: flex;
      flex-direction: column;

      .ship-channel {
        font-size: 13px;
        color: $order-text;
      }

      .ship-sn {
        font-size: 12px;
        color: $order-text-secondary;
        font-family: 'SF Mono', monospace;
      }
    }

    .text-muted {
      color: #d9d9d9;
    }

    // Action Buttons
    .action-buttons {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;

      .el-button--mini {
        padding: 5px 12px;
        font-size: 12px;
      }
    }
  }

  // ====================== Expanded Row ======================
  .expanded-row {
    padding: 12px 20px;
    background: #fafbfc;

    .expanded-goods {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid $order-border;

      &:last-child {
        border-bottom: none;
      }

      .goods-thumb {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .goods-info {
        flex: 1;
        display: flex;
        flex-direction: column;

        .goods-name {
          font-size: 13px;
          color: $order-text;
        }

        .goods-spec {
          font-size: 12px;
          color: $order-text-secondary;
          margin-top: 2px;
        }
      }

      .goods-price {
        width: 80px;
        text-align: right;
        font-size: 13px;
        color: $order-text-secondary;
      }

      .goods-num {
        width: 60px;
        text-align: center;
        font-size: 13px;
        color: $order-text-secondary;
      }

      .goods-subtotal {
        width: 80px;
        text-align: right;
        font-size: 13px;
        font-weight: 600;
        color: $order-text;
      }
    }
  }

  // ====================== Pagination ======================
  .pagination-wrap {
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
  }
}

// ====================== Dialogs ======================
::v-deep .detail-dialog {
  border-radius: 12px;
  overflow: hidden;

  .el-dialog__header {
    padding: 20px 24px;
    border-bottom: 1px solid $order-border;
    background: #fafbfc;

    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
      color: $order-text;
    }
  }

  .el-dialog__body {
    padding: 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid $order-border;
  }
}

.detail-dialog .dialog-body {
  .detail-section {
    padding: 20px 24px;
    border-bottom: 1px solid $order-border;

    &:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: $order-text;
      margin-bottom: 16px;
      padding-left: 10px;
      border-left: 3px solid $order-primary;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;

    &.cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      &.full-width {
        grid-column: 1 / -1;
      }

      .info-label {
        font-size: 12px;
        color: $order-text-secondary;
      }

      .info-value {
        font-size: 14px;
        color: $order-text;

        &.refund-amount {
          color: $order-danger;
          font-weight: 600;
        }
      }
    }
  }

  .status-tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
  }

  .pickup-info {
    background: rgba(250, 140, 22, 0.06);
    border-radius: 8px;
    padding: 16px;

    .pickup-badge {
      display: inline-block;
      padding: 2px 10px;
      background: rgba(250, 140, 22, 0.15);
      color: $order-warning;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .pickup-code {
      font-size: 14px;
      margin-bottom: 8px;

      strong {
        color: $order-danger;
        font-size: 20px;
        font-weight: 700;
      }
    }

    .pickup-contact {
      font-size: 13px;
      color: $order-text-secondary;
    }
  }

  .price-breakdown {
    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: $order-text-secondary;

      &.discount span:last-child {
        color: $order-success;
      }

      &.total {
        border-top: 1px solid $order-border;
        margin-top: 8px;
        padding-top: 12px;
        font-weight: 600;
        color: $order-text;
        font-size: 16px;

        span:last-child {
          color: $order-danger;
        }
      }
    }
  }

  .goods-table {
    ::v-deep th {
      background: #fafbfc !important;
      font-size: 12px !important;
    }
  }
}

::v-deep .action-dialog {
  border-radius: 12px;

  .el-dialog__header {
    padding: 20px 24px 12px;

    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
    }
  }

  .el-dialog__body {
    padding: 12px 24px;
  }

  .el-dialog__footer {
    padding: 12px 24px 20px;
  }
}

.action-dialog .dialog-body {
  .pay-tip {
    padding: 12px 16px;
    background: rgba(24, 144, 255, 0.06);
    border-radius: 6px;
    font-size: 13px;
    color: $order-primary;
    margin-bottom: 16px;
  }

  .refund-tip {
    padding: 12px 16px;
    background: rgba(255, 77, 79, 0.06);
    border-radius: 6px;
    font-size: 13px;
    color: $order-danger;
    margin-bottom: 16px;
  }
}

// ====================== Responsive ======================
@media (max-width: 1200px) {
  .order-page {
    .status-overview {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

@media (max-width: 768px) {
  .order-page {
    padding: 16px;

    .status-overview {
      grid-template-columns: 1fr;
    }

    .filter-bar {
      flex-direction: column;

      .filter-fields {
        width: 100%;
        .filter-input, .filter-date { width: 100%; }
      }
    }
  }
}
</style>
