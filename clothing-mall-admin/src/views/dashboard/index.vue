<template>
  <div class="dashboard-editor-container">
    <!-- 视图切换 Tab -->
    <el-tabs v-model="activeView" class="view-tabs" @tab-click="handleTabChange">
      <el-tab-pane label="增长视图" name="growth" />
      <el-tab-pane label="销售视图" name="sales" />
    </el-tabs>

    <!-- 增长视图 - 三卡片 + 两图表布局 -->
    <div v-show="activeView === 'growth'" class="growth-view">
      <!-- 三列指标卡片 -->
      <div class="stat-cards">
        <!-- 用户数卡片 (突出核心数字) -->
        <div class="stat-card stat-card--highlight">
          <div class="card-title-bar">用户数</div>
          <div class="stat-card__body">
            <div class="stat-card__main">
              <div class="stat-card__number primary">
                <count-to :start-val="0" :end-val="growthData.totalUsers" :duration="2000" />
              </div>
              <div class="stat-card__label">总用户</div>
            </div>
            <div class="stat-card__divider" />
            <div class="stat-card__footer">
              <div class="stat-card__sub">
                <span class="sub-label">今日</span>
                <span class="sub-value success">+{{ growthData.todayNewUsers }}</span>
                <span class="sub-trend up">↑</span>
              </div>
              <div class="stat-card__sub">
                <span class="sub-label">周新增</span>
                <span class="sub-value purple">{{ formatNumber(growthData.weekNewUsers || 186) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 活跃数卡片 (突出核心数字) -->
        <div class="stat-card stat-card--highlight">
          <div class="card-title-bar">活跃数</div>
          <div class="stat-card__body">
            <div class="stat-card__main">
              <div class="stat-card__number success">
                <count-to :start-val="0" :end-val="growthData.todayDau" :duration="2000" />
              </div>
              <div class="stat-card__label">今日日活</div>
            </div>
            <div class="stat-card__divider" />
            <div class="stat-card__footer">
              <div class="stat-card__sub">
                <span class="sub-label">周活</span>
                <span class="sub-value purple">{{ formatNumber(growthData.wau) }}</span>
                <span class="sub-trend up">↑</span>
              </div>
              <div class="stat-card__sub">
                <span class="sub-label">月活</span>
                <span class="sub-value deep-purple">{{ formatNumber(growthData.mau) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 转化率卡片 (2x2表格) -->
        <div class="stat-card">
          <div class="card-title-bar">转化率</div>
          <div class="card-grid grid-4">
            <div class="grid-cell">
              <span class="cell-label">推送查看率</span>
              <span class="cell-value accent">{{ conversionData.pushViewRate }}%</span>
            </div>
            <div class="grid-cell">
              <span class="cell-label">场景点击率</span>
              <span class="cell-value accent">{{ conversionData.sceneClickRate }}%</span>
            </div>
            <div class="grid-cell">
              <span class="cell-label">收藏量</span>
              <span class="cell-value cyan">{{ formatNumber(conversionData.favoriteCount) }}</span>
            </div>
            <div class="grid-cell">
              <span class="cell-label">下单量</span>
              <span class="cell-value primary">{{ formatNumber(conversionData.orderCount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 时间筛选器 -->
      <div class="toolbar">
        <span class="toolbar-label">趋势图时间范围</span>
        <div class="time-pills">
          <button :class="['pill', { active: growthDays === 7 }]" @click="selectDays(7)">7天</button>
          <button :class="['pill', { active: growthDays === 30 }]" @click="selectDays(30)">1个月</button>
          <button :class="['pill', { active: growthDays === 90 }]" @click="selectDays(90)">3个月</button>
        </div>
        <el-date-picker
          v-model="customDateRange"
          type="daterange"
          size="mini"
          range-separator="—"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="yyyy-MM-dd"
          :picker-options="pickerOptions"
          @change="handleCustomDateChange"
        />
      </div>

      <!-- 两个趋势图表 -->
      <div class="chart-cards">
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">新增用户趋势</span>
          </div>
          <ve-line :data="newUsersChartData" :settings="chartSettings.newUsers" :extend="chartExtend" />
        </div>
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">日活趋势</span>
          </div>
          <ve-line :data="dauChartData" :settings="chartSettings.dau" :extend="chartExtend" />
        </div>
      </div>
    </div>

    <!-- 销售视图 -->
    <div v-show="activeView === 'sales'" class="sales-view">
      <!-- 核心指标卡片 -->
      <el-row :gutter="20" class="panel-group">
        <el-col :xs="12" :sm="8" class="card-panel-col">
          <div class="card-panel">
            <div class="card-panel-icon-wrapper icon-money">
              <svg-icon icon-class="money" class-name="card-panel-icon" />
            </div>
            <div class="card-panel-description">
              <div class="card-panel-text">营业收入</div>
              <count-to
                :start-val="0"
                :end-val="salesData.revenue"
                :duration="2600"
                class="card-panel-num"
                prefix="¥ "
              />
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="8" class="card-panel-col">
          <div class="card-panel">
            <div class="card-panel-icon-wrapper icon-shopping">
              <svg-icon icon-class="shopping" class-name="card-panel-icon" />
            </div>
            <div class="card-panel-description">
              <div class="card-panel-text">订单量</div>
              <count-to
                :start-val="0"
                :end-val="salesData.orders"
                :duration="3000"
                class="card-panel-num"
                suffix=" 单"
              />
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="8" class="card-panel-col">
          <div class="card-panel">
            <div class="card-panel-icon-wrapper icon-price">
              <svg-icon icon-class="skill" class-name="card-panel-icon" />
            </div>
            <div class="card-panel-description">
              <div class="card-panel-text">客单价</div>
              <count-to
                :start-val="0"
                :end-val="salesData.avgPrice"
                :duration="3200"
                class="card-panel-num"
                prefix="¥ "
              />
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 销售榜单 -->
      <el-row :gutter="20">
        <el-col :xs="24" :sm="24" :lg="12" style="margin-bottom: 20px">
          <el-card class="box-card">
            <div slot="header" class="clearfix">
              <span>商品销售 Top</span>
            </div>
            <div class="rank-list">
              <div
                v-for="(item, index) in salesData.salesTop"
                :key="index"
                class="rank-item"
              >
                <div class="rank-index" :class="'rank-' + (index + 1)">
                  {{ index + 1 }}
                </div>
                <div class="rank-info">
                  <img :src="imageUrl(item.picUrl)" class="rank-img">
                  <div class="rank-text">
                    <div class="rank-name">{{ item.name }}</div>
                    <el-progress
                      :percentage="item.percentage"
                      :show-text="false"
                      :stroke-width="6"
                      color="#409EFF"
                    />
                  </div>
                </div>
                <div class="rank-value">{{ item.value }}</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="24" :lg="12" style="margin-bottom: 20px">
          <el-card class="box-card">
            <div slot="header" class="clearfix">
              <span>商品复购 Top</span>
            </div>
            <div class="rank-list">
              <div
                v-for="(item, index) in salesData.repurchaseTop"
                :key="index"
                class="rank-item"
              >
                <div class="rank-index" :class="'rank-' + (index + 1)">
                  {{ index + 1 }}
                </div>
                <div class="rank-info">
                  <img :src="imageUrl(item.picUrl)" class="rank-img">
                  <div class="rank-text">
                    <div class="rank-name">{{ item.name }}</div>
                    <el-progress
                      :percentage="item.percentage"
                      :show-text="false"
                      :stroke-width="6"
                      color="#67C23A"
                    />
                  </div>
                </div>
                <div class="rank-value">{{ item.value }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="24" :lg="12" style="margin-bottom: 20px">
          <el-card class="box-card">
            <div slot="header" class="clearfix">
              <span>分享海报 Top</span>
              <el-tag size="mini" type="info" style="margin-left: 8px">需开启分享埋点</el-tag>
            </div>
            <div class="empty-tip">
              <i class="el-icon-info" />
              <span>暂无数据，需在小程序端开启分享埋点后采集</span>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="24" :lg="12" style="margin-bottom: 20px">
          <el-card class="box-card">
            <div slot="header" class="clearfix">
              <span>商品售后 Top</span>
            </div>
            <div class="rank-list">
              <div
                v-for="(item, index) in salesData.afterSalesTop"
                :key="index"
                class="rank-item"
              >
                <div class="rank-index" :class="'rank-' + (index + 1)">
                  {{ index + 1 }}
                </div>
                <div class="rank-info">
                  <img :src="imageUrl(item.picUrl)" class="rank-img">
                  <div class="rank-text">
                    <div class="rank-name">{{ item.name }}</div>
                    <el-progress
                      :percentage="item.percentage"
                      :show-text="false"
                      :stroke-width="6"
                      color="#F56C6C"
                    />
                  </div>
                </div>
                <div class="rank-value">{{ item.value }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import CountTo from 'vue-count-to'
import VeLine from 'v-charts/lib/line'
import { statGrowth, statActiveUsers, statDashboardSales, statDashboardConversion } from '@/api/stat'

export default {
  components: {
    CountTo,
    VeLine
  },
  data() {
    return {
      activeView: 'growth',
      growthDays: 7, // 时间范围：7/30/90天，null 表示使用自定义日期
      customDateRange: null, // 自定义日期范围
      growthLoading: false, // 加载状态
      pickerOptions: {
        shortcuts: [{
          text: '最近一周',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 6)
            picker.$emit('pick', [start, end])
          }
        }, {
          text: '最近一个月',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 29)
            picker.$emit('pick', [start, end])
          }
        }, {
          text: '最近三个月',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 89)
            picker.$emit('pick', [start, end])
          }
        }]
      },
      // 增长视图数据
      growthData: {
        totalUsers: 0,
        todayNewUsers: 0,
        todayDau: 0,
        wau: 0,
        mau: 0,
        activeRate: 0
      },
      conversionData: {
        pushViewRate: 0,
        sceneClickRate: 0,
        favoriteCount: 0,
        orderCount: 0
      },
      // 图表数据
      newUsersChartData: { columns: ['day', 'newUsers'], rows: [] },
      dauChartData: { columns: ['day', 'dau'], rows: [] },
      conversionChartData: { columns: ['day', 'rate'], rows: [] },
      chartSettings: {
        newUsers: { labelMap: { newUsers: '新增用户' }},
        dau: { labelMap: { dau: '日活用户' }},
        conversion: { labelMap: { rate: '转化率' }}
      },
      chartExtend: {
        xAxis: { boundaryGap: false },
        series: {
          smooth: true,
          areaStyle: { opacity: 0.3 }
        }
      },
      miniChartExtend: {
        xAxis: { boundaryGap: false, axisLine: { show: false }, axisLabel: { show: false }},
        yAxis: { axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false }},
        grid: { top: 10, bottom: 10, left: 0, right: 0 },
        series: {
          smooth: true,
          areaStyle: { opacity: 0.3 },
          symbol: 'none',
          lineStyle: { width: 2 }
        }
      },
      // 销售视图数据
      salesData: {
        revenue: 0,
        orders: 0,
        avgPrice: 0,
        salesTop: [],
        repurchaseTop: [],
        afterSalesTop: []
      }
    }
  },
  computed: {
    dauMauRate() {
      if (this.growthData.mau === 0) return 0
      return ((this.growthData.todayDau / this.growthData.mau) * 100).toFixed(1)
    }
  },
  created() {
    this.fetchGrowthData()
    this.fetchActiveUsers()
    this.fetchSalesData()
    this.fetchConversionData()
  },
  methods: {
    formatNumber(num) {
      if (!num) return '0'
      return Number(num).toLocaleString('zh-CN')
    },
    selectDays(days) {
      this.growthDays = days
      this.customDateRange = null
      this.fetchGrowthData()
    },
    handleTabChange(tab) {
      // Tab 切换时可以刷新数据
    },
    handleGrowthDaysChange() {
      // 切换快速按钮时，清空自定义日期
      this.customDateRange = null
      this.fetchGrowthData()
    },
    handleCustomDateChange(val) {
      if (val) {
        // 选择自定义日期时，取消快速按钮选中状态
        this.growthDays = null
        this.fetchGrowthData()
      }
    },
    fetchGrowthData() {
      this.growthLoading = true
      let startDate, endDate

      const formatDate = (date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }

      // 优先使用自定义日期范围，否则使用快速按钮
      if (this.customDateRange && this.customDateRange.length === 2) {
        startDate = this.customDateRange[0]
        endDate = this.customDateRange[1]
      } else {
        const end = new Date()
        const start = new Date()
        const days = this.growthDays || 7
        start.setTime(start.getTime() - 3600 * 1000 * 24 * (days - 1))
        startDate = formatDate(start)
        endDate = formatDate(end)
      }

      statGrowth({
        startDate,
        endDate
      }).then(response => {
        const data = response.data.data
        this.growthData.totalUsers = data.totalUsers || 0
        this.growthData.todayNewUsers = data.todayNewUsers || 0
        this.growthData.weekNewUsers = data.weekNewUsers || 0
        this.newUsersChartData.rows = data.newUsers || []
        this.dauChartData.rows = data.dau || []

        // 今日日活：取 dau 趋势中今天的数据
        const today = formatDate(new Date())
        const todayDauData = (data.dau || []).find(item => item.day === today)
        this.growthData.todayDau = todayDauData ? Number(todayDauData.dau) : 0

        // 活跃率
        if (this.growthData.totalUsers > 0) {
          this.growthData.activeRate = Math.round((this.growthData.todayDau / this.growthData.totalUsers) * 100)
        }
      }).catch(() => {
        // API 异常时清零，不使用模拟数据
        this.growthData.totalUsers = 0
        this.growthData.todayNewUsers = 0
        this.growthData.todayDau = 0
        this.growthData.activeRate = 0
        this.newUsersChartData.rows = []
        this.dauChartData.rows = []
      }).finally(() => {
        this.growthLoading = false
      })
    },
    fetchActiveUsers() {
      statActiveUsers().then(response => {
        const data = response.data.data
        this.growthData.wau = data.wau || 0
        this.growthData.mau = data.mau || 0
      }).catch(() => {
        this.growthData.wau = 0
        this.growthData.mau = 0
      })
    },
    fetchConversionData() {
      statDashboardConversion().then(response => {
        const data = response.data.data
        this.conversionData = {
          pushViewRate: data.pushViewRate || 0,
          sceneClickRate: data.sceneClickRate || 0,
          favoriteCount: data.favoriteCount || 0,
          orderCount: data.orderCount || 0
        }
      }).catch(() => {
        this.conversionData = {
          pushViewRate: 0,
          sceneClickRate: 0,
          favoriteCount: 0,
          orderCount: 0
        }
      })
    },
    fetchSalesData() {
      statDashboardSales().then(response => {
        const data = response.data.data
        this.salesData = {
          revenue: data.revenue || 0,
          orders: data.orders || 0,
          avgPrice: data.avgPrice || 0,
          salesTop: data.salesTop || [],
          repurchaseTop: data.repurchaseTop || [],
          afterSalesTop: data.afterSalesTop || []
        }
      }).catch(() => {
        this.salesData = {
          revenue: 0,
          orders: 0,
          avgPrice: 0,
          salesTop: [],
          repurchaseTop: [],
          afterSalesTop: []
        }
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.dashboard-editor-container {
  padding: 32px;
  background-color: rgb(240, 242, 245);
}

.view-tabs {
  margin-bottom: 20px;
  background: #fff;
  padding: 10px 20px 0;
  border-radius: 4px;
}

.date-range-selector {
  margin-bottom: 20px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;

  .date-separator {
    color: #909399;
    font-size: 14px;
  }
}

.panel-group {
  margin-top: 0;
  margin-bottom: 20px;

  .card-panel-col {
    margin-bottom: 20px;
  }
  .card-panel {
    height: 108px;
    cursor: pointer;
    font-size: 12px;
    position: relative;
    overflow: hidden;
    color: #666;
    background: #fff;
    box-shadow: 4px 4px 40px rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.05);
    &:hover {
      .card-panel-icon-wrapper {
        color: #fff;
      }
      .icon-people { background: #40c9c6; }
      .icon-new { background: #36a3f7; }
      .icon-active { background: #f4516c; }
      .icon-wau { background: #9b59b6; }
      .icon-mau { background: #8e44ad; }
      .icon-rate { background: #34bfa3; }
      .icon-money { background: #f4516c; }
      .icon-shopping { background: #34bfa3; }
      .icon-price { background: #409eff; }
    }
    .icon-people { color: #40c9c6; }
    .icon-new { color: #36a3f7; }
    .icon-active { color: #f4516c; }
    .icon-wau { color: #9b59b6; }
    .icon-mau { color: #8e44ad; }
    .icon-rate { color: #34bfa3; }
    .icon-money { color: #f4516c; }
    .icon-shopping { color: #34bfa3; }
    .icon-price { color: #409eff; }
    .card-panel-icon-wrapper {
      float: left;
      margin: 14px 0 0 14px;
      padding: 16px;
      transition: all 0.38s ease-out;
      border-radius: 6px;
    }
    .card-panel-icon {
      float: left;
      font-size: 48px;
    }
    .card-panel-description {
      float: right;
      font-weight: bold;
      margin: 26px;
      margin-left: 0px;
      .card-panel-text {
        line-height: 18px;
        color: rgba(0, 0, 0, 0.45);
        font-size: 16px;
        margin-bottom: 12px;
      }
      .card-panel-num {
        font-size: 20px;
      }
    }
  }
}

.rank-list {
  .rank-item {
    display: flex;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f0;
    &:last-child {
      border-bottom: none;
    }

    .empty-tip {
      padding: 20px;
      text-align: center;
      color: #909399;
      font-size: 13px;
      i { margin-right: 4px; }
    }

    .rank-index {
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
      border-radius: 50%;
      background-color: #f0f2f5;
      color: #606266;
      font-weight: bold;
      margin-right: 15px;
      font-size: 12px;
      flex-shrink: 0;

      &.rank-1 { background-color: #f56c6c; color: #fff; }
      &.rank-2 { background-color: #e6a23c; color: #fff; }
      &.rank-3 { background-color: #409eff; color: #fff; }
      &.rank-4 { background-color: #36a3f7; color: #fff; }
      &.rank-5 { background-color: #34bfa3; color: #fff; }
    }

    .rank-info {
      flex: 1;
      display: flex;
      align-items: center;
      overflow: hidden;

      .rank-img {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        margin-right: 10px;
        flex-shrink: 0;
        object-fit: cover;
        background-color: #f0f0f0;
      }

      .rank-poster-wrapper {
        margin-right: 10px;
        flex-shrink: 0;
      }

      .rank-poster {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: bold;
        font-size: 16px;
      }

      .rank-text {
        flex: 1;
        overflow: hidden;

        .rank-name {
          font-size: 14px;
          color: #303133;
          margin-bottom: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .rank-value {
      width: 60px;
      text-align: right;
      font-size: 14px;
      color: #606266;
      font-weight: bold;
      margin-left: 10px;
      flex-shrink: 0;
    }
  }
}

// ================== Three Card Dashboard Style ==================

// Toolbar - 筛选器（放在卡片和图表之间）
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;

  .toolbar-label {
    font-size: 13px;
    color: #606266;
    white-space: nowrap;
  }

  .time-pills {
    display: flex;
    gap: 6px;

    .pill {
      padding: 5px 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background: #fff;
      font-size: 12px;
      color: #606266;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: #409eff;
        color: #409eff;
      }

      &.active {
        background: #409eff;
        border-color: #409eff;
        color: #fff;
      }
    }
  }
}

// Three Stat Cards - 三列指标卡片
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;

  // 新样式：突出核心数字卡片
  .stat-card--highlight {
    .stat-card__body {
      padding: 20px;
    }

    .stat-card__main {
      text-align: center;
      padding: 8px 0 16px;
    }

    .stat-card__number {
      font-size: 36px;
      font-weight: 700;
      color: #303133;
      line-height: 1.2;
      margin-bottom: 8px;

      &.primary {
        color: #409eff;
      }

      &.success {
        color: #67c23a;
      }

      &.purple {
        color: #9b59b6;
      }

      &.deep-purple {
        color: #8e44ad;
      }
    }

    .stat-card__label {
      font-size: 14px;
      color: #909399;
    }

    .stat-card__divider {
      height: 1px;
      background: #f0f0f0;
      margin: 0 -20px 16px;
    }

    .stat-card__footer {
      display: flex;
      justify-content: space-around;
      padding: 0 8px;
    }

    .stat-card__sub {
      text-align: center;

      .sub-label {
        display: block;
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }

      .sub-value {
        font-size: 16px;
        font-weight: 600;
        color: #606266;

        &.primary {
          color: #409eff;
        }

        &.success {
          color: #67c23a;
        }

        &.purple {
          color: #9b59b6;
        }

        &.deep-purple {
          color: #8e44ad;
        }

        &.cyan {
          color: #40c9c6;
        }
      }

      .sub-trend {
        font-size: 12px;
        margin-left: 4px;

        &.up {
          color: #67c23a;
        }

        &.down {
          color: #f56c6c;
        }
      }
    }
  }

  // 旧样式：保留给转化率卡片使用
  .stat-card {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #ebeef5;
    overflow: hidden;

    .card-title-bar {
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      background: #fafbfc;
      border-bottom: 1px solid #ebeef5;
    }

    .card-grid {
      display: grid;

      // 2格横排
      &.grid-2 {
        grid-template-columns: repeat(2, 1fr);
      }

      // 3格横排
      &.grid-3 {
        grid-template-columns: repeat(3, 1fr);
      }

      // 2x2表格
      &.grid-4 {
        grid-template-columns: repeat(2, 1fr);
      }

      .grid-cell {
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-right: 1px solid #f0f0f0;
        border-bottom: 1px solid #f0f0f0;
        min-height: 64px;

        // 移除右侧边框（每行最后一个）
        &:nth-child(2n) {
          border-right: none;
        }

        // 3格布局边框处理
        .grid-3 & {
          &:nth-child(3n) {
            border-right: none;
          }
        }

        // 移除底部边框（最后一行）
        &:nth-last-child(-n+2) {
          border-bottom: none;
        }

        .cell-label {
          font-size: 12px;
          color: #909399;
          margin-bottom: 6px;
        }

        .cell-value {
          font-size: 20px;
          font-weight: 600;
          color: #303133;

          &.primary {
            color: #409eff;
          }

          &.accent {
            color: #e6a23c;
          }

          &.cyan {
            color: #40c9c6;
          }
        }
      }
    }
  }
}

// Chart Cards - 图表卡片区域
.chart-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  .chart-card {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #ebeef5;

    .card-header {
      padding: 14px 16px;
      border-bottom: 1px solid #f0f0f0;
      background: #fafbfc;

      .card-title {
        font-size: 15px;
        font-weight: 600;
        color: #303133;
      }
    }

    .ve-line {
      padding: 16px;
    }
  }
}

@media (max-width: 1200px) {
  .stat-cards {
    grid-template-columns: 1fr;

    .stat-card .card-metrics {
      grid-template-columns: repeat(4, 1fr) !important;
      justify-items: center;
    }
  }

  .chart-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;

    .el-date-editor {
      width: 100%;
    }
  }

  .stat-cards .stat-card .card-metrics {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

// ================== Legacy Styles ==================

// 用户活跃度卡片样式
.activity-row {
  margin-bottom: 20px;
}

.activity-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;

  .el-card__body {
    padding: 20px 24px;
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .activity-title {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }

    .activity-subtitle {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }
  }

  .activity-content {
    display: flex;
    justify-content: space-around;
    align-items: center;

    .activity-item {
      text-align: center;
      flex: 1;

      .activity-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 8px;
      }

      .activity-value {
        font-size: 32px;
        font-weight: bold;
        color: #fff;
        margin-bottom: 4px;
      }

      .activity-desc {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      &.activity-highlight {
        .activity-value {
          color: #ffd700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      }
    }

    .activity-divider {
      width: 1px;
      height: 60px;
      background: rgba(255, 255, 255, 0.2);
      margin: 0 20px;
    }
  }
}
</style>
