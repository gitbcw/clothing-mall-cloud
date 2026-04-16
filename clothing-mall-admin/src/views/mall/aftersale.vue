<template>
  <div class="aftersale-page">

    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">售后管理</h2>
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
      <el-link v-if="businessView === 'pending'" class="view-all-link" @click="showAllAftersales">
        查看全部售后订单 <i class="el-icon-arrow-right" />
      </el-link>
    </div>

    <!-- Status Overview Cards -->
    <div v-if="businessView === 'pending'" class="status-overview">
      <div class="overview-card card-red">
        <div class="card-icon"><i class="el-icon-bell" /></div>
        <div class="card-body">
          <span class="card-count">{{ statusCounts['1'] || 0 }}</span>
          <span class="card-label">待审核</span>
        </div>
      </div>
      <div class="overview-card card-blue">
        <div class="card-icon"><i class="el-icon-box" /></div>
        <div class="card-body">
          <span class="card-count">{{ statusCounts['2'] || 0 }}</span>
          <span class="card-label">待补发</span>
        </div>
      </div>
      <div class="overview-card card-teal">
        <div class="card-icon"><i class="el-icon-s-promotion" /></div>
        <div class="card-body">
          <span class="card-count">{{ statusCounts['3'] || 0 }}</span>
          <span class="card-label">待完成</span>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="custom-tabs">
      <button
        v-for="item in tabList"
        :key="item.name"
        :class="['tab-item', { active: tab === item.name }]"
        @click="tab = item.name; handleClick({ name: item.name })"
      >
        {{ item.label }}
        <span v-if="statusCounts[item.code]" class="tab-badge" :class="'badge-' + getBadgeType(item.code)">
          {{ statusCounts[item.code] }}
        </span>
      </button>
    </div>

    <!-- Main Content -->
    <div class="content-card">

      <!-- Filter & Batch Actions -->
      <div class="toolbar">
        <div class="filter-fields">
          <el-input v-model="listQuery.aftersaleSn" clearable class="filter-input" :placeholder="$t('mall_aftersale.placeholder.filter_aftersale_sn')" prefix-icon="el-icon-document" />
          <el-input v-model="listQuery.orderId" clearable class="filter-input" :placeholder="$t('mall_aftersale.placeholder.filter_order_id')" prefix-icon="el-icon-tickets" />
          <el-button v-permission="['GET /admin/aftersale/list']" type="primary" icon="el-icon-search" @click="handleFilter">{{ $t('app.button.search') }}</el-button>
          <el-button :loading="downloadLoading" icon="el-icon-download" @click="handleDownload">{{ $t('app.button.download') }}</el-button>
        </div>
        <div v-if="multipleSelection.length > 0" class="batch-actions">
          <span class="batch-count">已选 {{ multipleSelection.length }} 项</span>
          <el-button v-permission="['GET /admin/aftersale/batch-recept']" type="success" size="small" icon="el-icon-check" @click="handleBatchRecept">{{ $t('mall_aftersale.button.batch_recept') }}</el-button>
          <el-button v-permission="['GET /admin/aftersale/batch-reject']" type="danger" size="small" icon="el-icon-close" @click="handleBatchReject">{{ $t('mall_aftersale.button.batch_reject') }}</el-button>
        </div>
      </div>

      <!-- Aftersale Table -->
      <el-table
        v-loading="listLoading"
        :data="list"
        :element-loading-text="$t('app.message.list_loading')"
        fit
        highlight-current-row
        @selection-change="handleSelectionChange"
        class="aftersale-table"
      >
        <el-table-column type="selection" width="48" />

        <el-table-column prop="aftersaleSn" :label="$t('mall_aftersale.table.aftersale_sn')" min-width="140">
          <template slot-scope="scope">
            <span class="aftersale-sn">{{ scope.row.aftersaleSn }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_aftersale.table.order_id')" prop="orderId" width="100">
          <template slot-scope="scope">
            <span class="order-id">#{{ scope.row.orderId }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_aftersale.table.user_id')" prop="userId" width="90">
          <template slot-scope="scope">
            <span class="user-id">{{ scope.row.userId }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_aftersale.table.type')" prop="type" width="120">
          <template slot-scope="scope">
            <span :class="['type-tag', 'type-' + scope.row.type]">
              {{ typeDesc[scope.row.type] }}
            </span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_aftersale.table.reason')" prop="reason" min-width="160">
          <template slot-scope="scope">
            <span class="reason-text" :title="scope.row.reason">{{ scope.row.reason }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="售后状态" width="110">
          <template slot-scope="scope">
            <span :class="['status-tag', 'aftersale-' + scope.row.status]">
              {{ aftersaleStatusMap[scope.row.status] }}
            </span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_aftersale.table.amount')" prop="amount" width="100" align="right">
          <template slot-scope="scope">
            <span class="amount-text">¥{{ scope.row.amount }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_aftersale.table.add_time')" prop="addTime" min-width="100">
          <template slot-scope="scope">
            <span class="time-text">{{ scope.row.addTime }}</span>
          </template>
        </el-table-column>

        <el-table-column :label="$t('mall_aftersale.table.actions')" width="220" class-name="action-col" fixed="right">
          <template slot-scope="scope">
            <div class="action-buttons">
              <el-button v-permission="['POST /admin/aftersale/detail']" size="mini" round plain @click="handleRead(scope.row)">{{ $t('app.button.detail') }}</el-button>
              <el-button v-if="scope.row.status === 1" v-permission="['POST /admin/aftersale/recept']" type="success" size="mini" round @click="handleRecept(scope.row)">{{ $t('mall_aftersale.button.recept') }}</el-button>
              <el-button v-if="scope.row.status === 1" v-permission="['POST /admin/aftersale/reject']" type="danger" size="mini" round @click="handleReject(scope.row)">{{ $t('mall_aftersale.button.reject') }}</el-button>
              <el-button v-if="scope.row.status === 2" v-permission="['POST /admin/aftersale/ship']" type="warning" size="mini" round @click="handleShip(scope.row)">换货发货</el-button>
              <el-button v-if="scope.row.status === 3" v-permission="['POST /admin/aftersale/complete']" type="success" size="mini" round @click="handleComplete(scope.row)">换货完成</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrap">
        <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />
      </div>
    </div>

    <el-tooltip placement="top" :content="$t('app.tooltip.back_to_top')">
      <back-to-top :visibility-height="100" />
    </el-tooltip>

    <!-- Detail Dialog -->
    <el-dialog :visible.sync="aftersaleDialogVisible" :title="$t('mall_aftersale.dialog.detail')" width="700px" custom-class="detail-dialog" top="6vh">
      <div class="dialog-body">
        <!-- Basic Info -->
        <div class="detail-section">
          <div class="section-title">售后信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">售后编号</span>
              <span class="info-value mono">{{ aftersaleDetail.aftersaleSn }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">关联订单</span>
              <span class="info-value">#{{ aftersaleDetail.orderId }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">用户 ID</span>
              <span class="info-value">{{ aftersaleDetail.userId }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">售后金额</span>
              <span class="info-value amount">¥{{ aftersaleDetail.amount }}</span>
            </div>
          </div>
        </div>

        <!-- Status -->
        <div class="detail-section">
          <div class="section-title">售后状态</div>
          <div class="status-timeline">
            <div
              v-for="(item, index) in aftersaleTimeline(aftersaleDetail.status)"
              :key="index"
              :class="['timeline-step', { active: item.active, current: item.current }]"
            >
              <div class="step-dot" />
              <div class="step-label">{{ item.label }}</div>
            </div>
          </div>
        </div>

        <!-- Reason -->
        <div class="detail-section">
          <div class="section-title">售后原因</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">类型</span>
              <span :class="['type-tag', 'type-' + aftersaleDetail.type]">
                {{ typeDesc[aftersaleDetail.type] }}
              </span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">具体原因</span>
              <span class="info-value">{{ aftersaleDetail.reason || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Pictures -->
        <div v-if="aftersaleDetail.pictures && aftersaleDetail.pictures.length" class="detail-section">
          <div class="section-title">凭证照片</div>
          <div class="evidence-photos">
            <a
              v-for="(pic, index) in aftersaleDetail.pictures"
              :key="index"
              :href="pic"
              target="_blank"
              class="photo-thumb"
            >
              <img :src="pic">
            </a>
          </div>
        </div>

        <!-- Time Info -->
        <div class="detail-section">
          <div class="section-title">时间记录</div>
          <div class="info-grid cols-3">
            <div class="info-item">
              <span class="info-label">申请时间</span>
              <span class="info-value">{{ aftersaleDetail.addTime || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">处理时间</span>
              <span class="info-value">{{ aftersaleDetail.handleTime || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">更新时间</span>
              <span class="info-value">{{ aftersaleDetail.updateTime || '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="aftersaleDialogVisible = false">关闭</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { listAftersale, listAftersaleCount, receptAftersale, batchReceptAftersale, rejectAftersale, batchRejectAftersale, shipAftersale, completeAftersale } from '@/api/aftersale'
import BackToTop from '@/components/BackToTop'
import Pagination from '@/components/Pagination' // Secondary package based on el-pagination
import _ from 'lodash'

export default {
  name: 'Aftersale',
  components: { BackToTop, Pagination },
  data() {
    return {
      list: [],
      total: 0,
      listLoading: true,
      businessView: 'pending', // 业务视图：pending, completed, all（隐藏）
      tab: 'pending_all',
      statusCounts: {},
      listQuery: {
        page: 1,
        limit: 20,
        aftersaleSn: undefined,
        orderId: undefined,
        status: '',
        statusArray: [],
        sort: 'add_time',
        order: 'desc'
      },
      typeTag: [
        'primary',
        'success',
        'warning',
        'info'
      ],
      typeDesc: [
        '尺码不合适',
        '颜色不喜欢',
        '商品有瑕疵',
        '其他原因'
      ],
      aftersaleStatusMap: {
        1: '待审核',
        2: '待补发',
        3: '已发货',
        4: '已拒绝',
        5: '已取消',
        6: '已完成'
      },
      multipleSelection: [],
      contentDetail: '',
      contentDialogVisible: false,
      downloadLoading: false,
      aftersaleDialogVisible: false,
      aftersaleDetail: {}
    }
  },
  computed: {
    tabList() {
      if (this.businessView === 'pending') {
        return [
          { name: 'pending_all', label: '全部待处理', code: 'pending_all' },
          { name: '1', label: '待审核', code: '1' },
          { name: '2', label: '待补发', code: '2' },
          { name: '3', label: '待完成', code: '3' }
        ]
      } else if (this.businessView === 'completed') {
        return [
          { name: 'completed_all', label: '全部已完结', code: 'completed_all' },
          { name: '4', label: '已拒绝', code: '4' },
          { name: '5', label: '已取消', code: '5' },
          { name: '6', label: '已完成', code: '6' }
        ]
      }
      // 全部售后订单（隐藏入口）
      return [
        { name: 'all', label: this.$t('mall_aftersale.section.all'), code: 'all' },
        { name: '1', label: '待审核', code: '1' },
        { name: '2', label: '待补发', code: '2' },
        { name: '3', label: '待完成', code: '3' },
        { name: '4', label: '已拒绝', code: '4' },
        { name: '5', label: '已取消', code: '5' },
        { name: '6', label: '已完成', code: '6' }
      ]
    }
  },
  created() {
    // 设置初始 Tab 和筛选条件
    this.tab = this.tabList[0].name
    this.handleClick({ name: this.tab })
    this.getAftersaleCounts()
  },
  methods: {
    aftersaleTimeline(status) {
      const steps = [
        { label: '已申请', active: true, current: status === 1 },
        { label: '审核通过', active: [2, 3, 6].includes(status), current: status === 2 },
        { label: '已发货', active: [3, 6].includes(status), current: status === 3 },
        { label: '已完成', active: status === 6, current: status === 6 }
      ]
      if ([4, 5].includes(status)) {
        return [
          { label: '已申请', active: true, current: false },
          { label: status === 4 ? '已拒绝' : '已取消', active: true, current: true }
        ]
      }
      return steps
    },
    getAftersaleCounts() {
      listAftersaleCount().then(response => {
        this.statusCounts = response.data.data
      })
    },
    getBadgeType(status) {
      // 红色: 需要紧急处理
      if (['1', '2', '3', 'pending_all'].includes(String(status))) {
        return 'danger'
      }
      // 绿色: 成功完成
      if (['6', 'completed_all'].includes(String(status))) {
        return 'success'
      }
      // 灰色: 其他
      return 'info'
    },
    // 业务视图切换
    handleBusinessViewChange() {
      this.tab = this.tabList[0].name
      this.listQuery.page = 1
      this.listQuery.status = ''
      this.listQuery.statusArray = []
      this.handleClick({ name: this.tab })
    },
    // 显示全部售后订单（隐藏入口）
    showAllAftersales() {
      this.businessView = 'all'
      this.tab = 'all'
      this.listQuery.page = 1
      this.listQuery.status = ''
      this.listQuery.statusArray = []
      this.getList()
      this.getAftersaleCounts()
    },
    getList() {
      this.listLoading = true
      listAftersale(this.listQuery)
        .then(response => {
          this.list = response.data.data.list
          this.total = response.data.data.total
          this.listLoading = false
        })
        .catch(() => {
          this.list = []
          this.total = 0
          this.listLoading = false
        })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleSelectionChange(val) {
      this.multipleSelection = val
    },
    handleClick(tab) {
      this.listQuery.page = 1
      const tabName = tab.name || this.tab

      // 重置筛选条件
      this.listQuery.status = ''
      this.listQuery.statusArray = []

      if (tabName === 'all') {
        // 全部售后订单 - 不筛选
      } else if (tabName === 'pending_all') {
        // 全部待处理
        this.listQuery.statusArray = [1, 2, 3]
      } else if (tabName === 'completed_all') {
        // 全部已完结
        this.listQuery.statusArray = [4, 5, 6]
      } else {
        // 单个状态
        this.listQuery.status = tabName
      }
      this.getList()
    },
    handleRecept(row) {
      receptAftersale(row)
        .then(response => {
          this.$notify.success({
            title: '成功',
            message: '审核通过操作成功'
          })
          this.getList()
          this.getAftersaleCounts()
        })
        .catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
    },
    handleBatchRecept() {
      if (this.multipleSelection.length === 0) {
        this.$message.error('请选择至少一条记录')
        return
      }
      const ids = []
      _.forEach(this.multipleSelection, function(item) {
        ids.push(item.id)
      })
      batchReceptAftersale({ ids: ids })
        .then(response => {
          this.$notify.success({
            title: '成功',
            message: '批量通过操作成功'
          })
          this.getList()
          this.getAftersaleCounts()
        })
        .catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
    },
    handleReject(row) {
      rejectAftersale(row)
        .then(response => {
          this.$notify.success({
            title: '成功',
            message: '审核拒绝操作成功'
          })
          this.getList()
          this.getAftersaleCounts()
        })
        .catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
    },
    handleBatchReject() {
      if (this.multipleSelection.length === 0) {
        this.$message.error('请选择至少一条记录')
        return
      }
      const ids = []
      _.forEach(this.multipleSelection, function(item) {
        ids.push(item.id)
      })
      batchRejectAftersale({ ids: ids })
        .then(response => {
          this.$notify.success({
            title: '成功',
            message: '批量拒绝操作成功'
          })
          this.getList()
          this.getAftersaleCounts()
        })
        .catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
    },
    handleShip(row) {
      shipAftersale(row)
        .then(response => {
          this.$notify.success({
            title: '成功',
            message: '换货发货操作成功'
          })
          this.getList()
          this.getAftersaleCounts()
        })
        .catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
    },
    handleComplete(row) {
      completeAftersale(row)
        .then(response => {
          this.$notify.success({
            title: '成功',
            message: '换货完成操作成功'
          })
          this.getList()
          this.getAftersaleCounts()
        })
        .catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = [
          '售后编号',
          '订单ID',
          '用户ID',
          '售后类型',
          '换货原因',
          '申请时间'
        ]
        const filterVal = [
          'aftersaleSn',
          'orderId',
          'userId',
          'type',
          'reason',
          'addTime'
        ]
        excel.export_json_to_excel2(tHeader, this.list, filterVal, '售后信息')
        this.downloadLoading = false
      })
    },
    handleRead(row) {
      this.aftersaleDetail = row
      console.log(this.aftersaleDetail)
      this.aftersaleDialogVisible = true
    }
  }
}
</script>

<style lang="scss" scoped>
// ====================== Variables ======================
$as-primary: #1890ff;
$as-success: #52c41a;
$as-warning: #fa8c16;
$as-danger: #ff4d4f;
$as-bg: #f0f2f5;
$as-surface: #ffffff;
$as-text: #1f1f1f;
$as-text-secondary: #8c8c8c;
$as-border: #f0f0f0;
$as-radius: 8px;

.aftersale-page {
  padding: 24px;
  background: $as-bg;
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
      color: $as-text;
      margin: 0;
    }

    .view-switcher {
      display: flex;
      background: $as-surface;
      border-radius: 6px;
      padding: 3px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);

      .view-btn {
        padding: 6px 18px;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        color: $as-text-secondary;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;

        &.active {
          background: $as-primary;
          color: #fff;
          box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
        }

        &:not(.active):hover {
          color: $as-primary;
        }
      }
    }

    .view-all-link {
      font-size: 13px;
      color: $as-text-secondary;
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: $as-primary;
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
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 20px;

    .overview-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: $as-surface;
      border-radius: $as-radius;
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
        color: $as-text-secondary;
        margin-top: 2px;
      }

      &.card-red {
        border-left-color: $as-danger;
        .card-icon { background: rgba(255, 77, 79, 0.1); color: $as-danger; }
        .card-count { color: $as-danger; }
      }

      &.card-blue {
        border-left-color: $as-primary;
        .card-icon { background: rgba(24, 144, 255, 0.1); color: $as-primary; }
        .card-count { color: $as-primary; }
      }

      &.card-teal {
        border-left-color: #13c2c2;
        .card-icon { background: rgba(19, 194, 194, 0.1); color: #13c2c2; }
        .card-count { color: #13c2c2; }
      }
    }
  }

  // ====================== Tab Navigation ======================
  .custom-tabs {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: $as-surface;
    border-radius: $as-radius;
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
      color: $as-text-secondary;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      font-weight: 500;

      &:hover {
        color: $as-text;
        background: rgba(0, 0, 0, 0.04);
      }

      &.active {
        color: $as-primary;
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

        &.badge-danger { background: rgba(255, 77, 79, 0.1); color: $as-danger; }
        &.badge-success { background: rgba(82, 196, 26, 0.1); color: $as-success; }
        &.badge-info { background: rgba(140, 140, 140, 0.1); color: $as-text-secondary; }
      }
    }
  }

  // ====================== Content Card ======================
  .content-card {
    background: $as-surface;
    border-radius: $as-radius;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  // ====================== Toolbar ======================
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid $as-border;
    gap: 12px;
    flex-wrap: wrap;

    .filter-fields {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-input {
      width: 200px;
    }

    .batch-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(24, 144, 255, 0.04);
      border-radius: 6px;
      border: 1px solid rgba(24, 144, 255, 0.12);

      .batch-count {
        font-size: 13px;
        color: $as-primary;
        font-weight: 500;
        margin-right: 4px;
      }
    }
  }

  // ====================== Table ======================
  .aftersale-table {
    ::v-deep {
      th {
        background: #fafbfc !important;
        color: $as-text-secondary !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        border-bottom: 1px solid #eee !important;
      }

      td {
        padding: 12px 0;
      }
    }

    .aftersale-sn {
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      color: $as-text;
    }

    .order-id, .user-id {
      font-size: 13px;
      color: $as-text-secondary;
      font-family: 'SF Mono', monospace;
    }

    // Type Tags
    .type-tag {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
    }

    .type-0 { background: rgba(24, 144, 255, 0.1); color: $as-primary; }
    .type-1 { background: rgba(82, 196, 26, 0.1); color: $as-success; }
    .type-2 { background: rgba(250, 140, 22, 0.1); color: $as-warning; }
    .type-3 { background: rgba(140, 140, 140, 0.1); color: $as-text-secondary; }

    .reason-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 13px;
      color: $as-text;
      line-height: 1.5;
    }

    // Status Tags
    .status-tag {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 500;
    }

    .aftersale-1 { background: rgba(255, 77, 79, 0.1); color: $as-danger; }
    .aftersale-2 { background: rgba(24, 144, 255, 0.1); color: $as-primary; }
    .aftersale-3 { background: rgba(19, 194, 194, 0.1); color: #13c2c2; }
    .aftersale-4 { background: rgba(140, 140, 140, 0.1); color: #8c8c8c; }
    .aftersale-5 { background: rgba(140, 140, 140, 0.1); color: #8c8c8c; }
    .aftersale-6 { background: rgba(82, 196, 26, 0.1); color: $as-success; }

    .amount-text {
      font-weight: 600;
      color: $as-danger;
    }

    .time-text {
      font-size: 13px;
      color: $as-text-secondary;
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

  // ====================== Pagination ======================
  .pagination-wrap {
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
  }
}

// ====================== Detail Dialog ======================
::v-deep .detail-dialog {
  border-radius: 12px;
  overflow: hidden;

  .el-dialog__header {
    padding: 20px 24px;
    border-bottom: 1px solid $as-border;
    background: #fafbfc;

    .el-dialog__title {
      font-size: 16px;
      font-weight: 600;
      color: $as-text;
    }
  }

  .el-dialog__body {
    padding: 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid $as-border;
  }
}

.detail-dialog .dialog-body {
  .detail-section {
    padding: 20px 24px;
    border-bottom: 1px solid $as-border;

    &:last-child {
      border-bottom: none;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: $as-text;
      margin-bottom: 16px;
      padding-left: 10px;
      border-left: 3px solid $as-primary;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 24px;

    &.cols-3 {
      grid-template-columns: repeat(3, 1fr);
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
        color: $as-text-secondary;
      }

      .info-value {
        font-size: 14px;
        color: $as-text;

        &.mono {
          font-family: 'SF Mono', 'Monaco', monospace;
        }

        &.amount {
          color: $as-danger;
          font-weight: 600;
        }
      }
    }
  }

  .type-tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
  }

  // Status Timeline
  .status-timeline {
    display: flex;
    gap: 0;
    align-items: center;

    .timeline-step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;

      &:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 8px;
        left: 50%;
        width: 100%;
        height: 2px;
        background: #eee;
        z-index: 0;
      }

      &.active:not(:last-child)::after {
        background: $as-primary;
      }

      .step-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #eee;
        border: 2px solid #eee;
        z-index: 1;
        position: relative;
        margin-bottom: 8px;
        transition: all 0.2s;
      }

      &.active .step-dot {
        background: $as-primary;
        border-color: $as-primary;
      }

      &.current .step-dot {
        box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
        width: 18px;
        height: 18px;
      }

      .step-label {
        font-size: 12px;
        color: $as-text-secondary;
        font-weight: 500;
      }

      &.active .step-label {
        color: $as-primary;
        font-weight: 600;
      }
    }
  }

  // Evidence Photos
  .evidence-photos {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;

    .photo-thumb {
      display: block;
      width: 80px;
      height: 80px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid $as-border;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
}

// ====================== Responsive ======================
@media (max-width: 1200px) {
  .aftersale-page {
    .status-overview {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

@media (max-width: 768px) {
  .aftersale-page {
    padding: 16px;

    .status-overview {
      grid-template-columns: 1fr;
    }

    .toolbar {
      flex-direction: column;

      .filter-fields {
        width: 100%;
        .filter-input { width: 100%; }
      }
    }

    .detail-dialog .dialog-body .status-timeline {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .timeline-step {
        flex-direction: row;
        gap: 8px;

        &:not(:last-child)::after {
          display: none;
        }
      }
    }
  }
}
</style>
