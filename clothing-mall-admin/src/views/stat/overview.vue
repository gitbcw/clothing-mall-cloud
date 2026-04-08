<template>
  <div class="app-container">
    <!-- 时间筛选 -->
    <el-card class="filter-card">
      <div class="filter-row">
        <el-date-picker
          v-model="dateRange"
          type="monthrange"
          range-separator="至"
          start-placeholder="开始月份"
          end-placeholder="结束月份"
          value-format="yyyy-MM"
          @change="handleDateChange"
        />
        <el-radio-group v-model="quickRange" size="small" @change="handleQuickRange">
          <el-radio-button label="thisYear">今年</el-radio-button>
          <el-radio-button label="lastYear">去年</el-radio-button>
          <el-radio-button label="recent3">近3个月</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <!-- 核心指标 -->
    <el-row :gutter="20" class="metric-row">
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-value primary">{{ formatMoney(totalRevenue) }}</div>
          <div class="metric-label">总营收</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-value">{{ totalOrders }}</div>
          <div class="metric-label">订单数</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-value">{{ formatMoney(avgOrderPrice) }}</div>
          <div class="metric-label">客单价</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card">
          <div class="metric-value">{{ totalCustomers }}</div>
          <div class="metric-label">消费客户</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 营收趋势图 -->
    <el-card class="chart-card">
      <div slot="header" class="chart-header">
        <span>营收趋势</span>
        <el-radio-group v-model="chartType" size="mini">
          <el-radio-button label="line">折线图</el-radio-button>
          <el-radio-button label="bar">柱状图</el-radio-button>
        </el-radio-group>
      </div>
      <ve-line v-if="chartType === 'line'" :data="revenueChartData" :settings="chartSettings" :extend="chartExtend" />
      <ve-histogram v-else :data="revenueChartData" :settings="chartSettings" :extend="chartExtend" />
    </el-card>

    <!-- 收益统计明细表 -->
    <el-card class="table-card">
      <div slot="header">收益统计明细</div>
      <el-table :data="revenueDetailData" border show-summary :summary-method="getSummaries">
        <el-table-column prop="month" label="月份" width="120" />
        <el-table-column prop="orders" label="订单数" width="100" align="right" />
        <el-table-column label="营收金额" align="right">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.revenue) }}
          </template>
        </el-table-column>
        <el-table-column label="退款金额" align="right">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.refund) }}
          </template>
        </el-table-column>
        <el-table-column label="净营收" align="right">
          <template slot-scope="scope">
            <span class="net-revenue">{{ formatMoney(scope.row.revenue - scope.row.refund) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="环比增长" width="120" align="right">
          <template slot-scope="scope">
            <span :class="scope.row.growth >= 0 ? 'growth-up' : 'growth-down'">
              {{ scope.row.growth >= 0 ? '+' : '' }}{{ scope.row.growth }}%
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import VeLine from 'v-charts/lib/line'
import VeHistogram from 'v-charts/lib/histogram'
import { statRevenueOverview } from '@/api/stat'

export default {
  name: 'StatOverview',
  components: { VeLine, VeHistogram },
  data() {
    return {
      dateRange: [],
      quickRange: 'thisYear',
      chartType: 'line',
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderPrice: 0,
      totalCustomers: 0,
      revenueChartData: {
        columns: ['month', 'revenue', 'orders'],
        rows: []
      },
      revenueDetailData: [],
      chartSettings: {
        labelMap: {
          revenue: '营收（元）',
          orders: '订单数'
        },
        axisSite: { right: ['orders'] },
        yAxisType: ['KMB', 'KMB'],
        yAxisName: ['营收（元）', '订单数']
      },
      chartExtend: {
        xAxis: { boundaryGap: false },
        series: {
          smooth: true,
          areaStyle: { opacity: 0.3 }
        }
      }
    }
  },
  created() {
    this.initDateRange()
    this.fetchData()
  },
  methods: {
    initDateRange() {
      const now = new Date()
      const year = now.getFullYear()
      this.dateRange = [`${year}-01`, `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`]
    },
    handleDateChange() {
      this.quickRange = ''
      this.fetchData()
    },
    handleQuickRange(value) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1

      if (value === 'thisYear') {
        this.dateRange = [`${year}-01`, `${year}-${String(month).padStart(2, '0')}`]
      } else if (value === 'lastYear') {
        this.dateRange = [`${year - 1}-01`, `${year - 1}-12`]
      } else if (value === 'recent3') {
        let startMonth = month - 2
        let startYear = year
        if (startMonth <= 0) {
          startMonth += 12
          startYear -= 1
        }
        this.dateRange = [`${startYear}-${String(startMonth).padStart(2, '0')}`, `${year}-${String(month).padStart(2, '0')}`]
      }
      this.fetchData()
    },
    fetchData() {
      const [startMonth, endMonth] = this.dateRange || []
      statRevenueOverview({ startMonth, endMonth }).then(response => {
        const data = response.data.data || {}
        const overview = data.overview || {}
        const trend = data.trend || []
        const detail = data.detail || []

        // 核心指标
        this.totalRevenue = overview.totalRevenue || 0
        this.totalOrders = overview.totalOrders || 0
        this.avgOrderPrice = overview.avgOrderPrice || 0
        this.totalCustomers = overview.totalCustomers || 0

        // 趋势图
        this.revenueChartData.rows = trend.map(item => ({
          month: item.month,
          revenue: item.revenue || 0,
          orders: item.orders || 0
        }))

        // 明细表（计算环比增长）
        this.revenueDetailData = detail.map((item, index, arr) => {
          const prevRevenue = index > 0 ? arr[index - 1].revenue : 0
          const currRevenue = item.revenue || 0
          const growth = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0
          return {
            month: item.month,
            orders: item.orders || 0,
            revenue: item.revenue || 0,
            refund: item.refund || 0,
            growth: parseFloat(growth)
          }
        })
      }).catch(() => {
        this.useMockData()
        this.$message.warning('数据加载失败，当前显示为模拟数据')
      })
    },
    useMockData() {
      // 核心指标
      this.totalRevenue = 2856000
      this.totalOrders = 12380
      this.avgOrderPrice = 231
      this.totalCustomers = 3256

      // 趋势图数据 - 按筛选条件动态调整
      const range = this.quickRange || 'thisYear'
      if (range === 'lastYear') {
        this.revenueChartData.rows = [
          { month: '2025-01', revenue: 98000, orders: 420 },
          { month: '2025-02', revenue: 112000, orders: 480 },
          { month: '2025-03', revenue: 145000, orders: 620 },
          { month: '2025-04', revenue: 128000, orders: 550 },
          { month: '2025-05', revenue: 156000, orders: 680 },
          { month: '2025-06', revenue: 142000, orders: 610 },
          { month: '2025-07', revenue: 135000, orders: 580 },
          { month: '2025-08', revenue: 148000, orders: 640 },
          { month: '2025-09', revenue: 168000, orders: 720 },
          { month: '2025-10', revenue: 192000, orders: 830 },
          { month: '2025-11', revenue: 225000, orders: 980 },
          { month: '2025-12', revenue: 286000, orders: 1250 }
        ]
        this.revenueDetailData = [
          { month: '2025-01', orders: 420, revenue: 98000, refund: 4500, growth: 0 },
          { month: '2025-02', orders: 480, revenue: 112000, refund: 5200, growth: 14.3 },
          { month: '2025-03', orders: 620, revenue: 145000, refund: 6800, growth: 29.5 },
          { month: '2025-04', orders: 550, revenue: 128000, refund: 5900, growth: -11.7 },
          { month: '2025-05', orders: 680, revenue: 156000, refund: 7200, growth: 21.9 },
          { month: '2025-06', orders: 610, revenue: 142000, refund: 6500, growth: -9.0 },
          { month: '2025-07', orders: 580, revenue: 135000, refund: 6100, growth: -4.9 },
          { month: '2025-08', orders: 640, revenue: 148000, refund: 6800, growth: 9.6 },
          { month: '2025-09', orders: 720, revenue: 168000, refund: 7800, growth: 13.5 },
          { month: '2025-10', orders: 830, revenue: 192000, refund: 8900, growth: 14.3 },
          { month: '2025-11', orders: 980, revenue: 225000, refund: 10500, growth: 17.2 },
          { month: '2025-12', orders: 1250, revenue: 286000, refund: 13200, growth: 27.1 }
        ]
      } else if (range === 'recent3') {
        this.revenueChartData.rows = [
          { month: '2026-01', revenue: 156000, orders: 680 },
          { month: '2026-02', revenue: 189000, orders: 820 },
          { month: '2026-03', revenue: 245000, orders: 1050 }
        ]
        this.revenueDetailData = [
          { month: '2026-01', orders: 680, revenue: 156000, refund: 8500, growth: 15.2 },
          { month: '2026-02', orders: 820, revenue: 189000, refund: 12300, growth: 21.2 },
          { month: '2026-03', orders: 1050, revenue: 245000, refund: 15600, growth: 29.6 }
        ]
      } else {
        // 今年
        this.revenueChartData.rows = [
          { month: '2026-01', revenue: 156000, orders: 680 },
          { month: '2026-02', revenue: 189000, orders: 820 },
          { month: '2026-03', revenue: 245000, orders: 1050 }
        ]
        this.revenueDetailData = [
          { month: '2026-01', orders: 680, revenue: 156000, refund: 8500, growth: 59.2 },
          { month: '2026-02', orders: 820, revenue: 189000, refund: 12300, growth: 21.2 },
          { month: '2026-03', orders: 1050, revenue: 245000, refund: 15600, growth: 29.6 }
        ]
      }
    },
    formatMoney(value) {
      if (!value) return '¥0'
      return '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    },
    getSummaries(param) {
      const { columns, data } = param
      const sums = []
      columns.forEach((column, index) => {
        if (index === 0) {
          sums[index] = '合计'
          return
        }
        const values = data.map(item => Number(item[column.property]))
        if (!values.every(value => isNaN(value))) {
          sums[index] = this.formatMoney(values.reduce((prev, curr) => {
            const value = Number(curr)
            if (!isNaN(value)) {
              return prev + curr
            } else {
              return prev
            }
          }, 0))
        } else {
          sums[index] = ''
        }
      })
      return sums
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.filter-card {
  margin-bottom: 20px;
  .filter-row {
    display: flex;
    align-items: center;
    gap: 20px;
  }
}

.metric-row {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
  padding: 20px 0;

  .metric-value {
    font-size: 28px;
    font-weight: bold;
    color: #303133;

    &.primary {
      color: #409EFF;
    }
  }

  .metric-label {
    font-size: 14px;
    color: #909399;
    margin-top: 8px;
  }
}

.chart-card, .table-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.net-revenue {
  color: #67C23A;
  font-weight: 600;
}

.growth-up {
  color: #67C23A;
}

.growth-down {
  color: #F56C6C;
}
</style>
