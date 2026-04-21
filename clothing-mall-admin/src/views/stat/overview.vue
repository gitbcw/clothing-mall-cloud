<template>
  <div class="app-container">
    <!-- 时间筛选 -->
    <el-card class="filter-card">
      <div class="filter-row">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="yyyy-MM-dd"
          @change="handleDateChange"
        />
        <el-radio-group v-model="quickRange" size="small" @change="handleQuickRange">
          <el-radio-button label="thisWeek">本周</el-radio-button>
          <el-radio-button label="thisMonth">本月</el-radio-button>
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
        <el-table-column prop="month" :label="granularity === 'day' ? '日期' : '月份'" width="120" />
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
      quickRange: 'thisWeek',
      granularity: 'day',
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
      // 默认选中"本周"
      const { start, end } = this.getWeekRange()
      this.dateRange = [start, end]
      this.granularity = 'day'
    },
    handleDateChange() {
      this.quickRange = ''
      // 手动选日期时，根据跨度自动判断粒度
      const [start, end] = this.dateRange || []
      if (start && end) {
        const days = (new Date(end) - new Date(start)) / 86400000
        this.granularity = days <= 31 ? 'day' : 'month'
      }
      this.fetchData()
    },
    handleQuickRange(value) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const day = now.getDate()

      if (value === 'thisWeek') {
        const { start, end } = this.getWeekRange()
        this.dateRange = [start, end]
        this.granularity = 'day'
      } else if (value === 'thisMonth') {
        const mm = String(month + 1).padStart(2, '0')
        const dd = String(day).padStart(2, '0')
        this.dateRange = [`${year}-${mm}-01`, `${year}-${mm}-${dd}`]
        this.granularity = 'day'
      } else if (value === 'recent3') {
        const mm = String(month + 1).padStart(2, '0')
        const dd = String(day).padStart(2, '0')
        // 近三个月：从3个月前的1号到今天
        let startMonth = month - 2
        let startYear = year
        if (startMonth < 0) {
          startMonth += 12
          startYear -= 1
        }
        this.dateRange = [`${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`, `${year}-${mm}-${dd}`]
        this.granularity = 'month'
      }
      this.fetchData()
    },
    getWeekRange() {
      const now = new Date()
      const dayOfWeek = now.getDay() || 7 // 周日=0 → 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - dayOfWeek + 1)
      const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { start: fmt(monday), end: fmt(now) }
    },
    fetchData() {
      const [startDate, endDate] = this.dateRange || []
      const params = { startDate, endDate, granularity: this.granularity }
      statRevenueOverview(params).then(response => {
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
          month: item.period,
          revenue: item.revenue || 0,
          orders: item.orders || 0
        }))

        // 明细表（计算环比增长）
        this.revenueDetailData = detail.map((item, index, arr) => {
          const prevRevenue = index > 0 ? arr[index - 1].revenue : 0
          const currRevenue = item.revenue || 0
          const growth = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0
          return {
            month: item.period,
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
      const range = this.quickRange || 'thisWeek'
      if (range === 'thisWeek') {
        // 本周按日
        this.revenueChartData.rows = [
          { month: '04-14', revenue: 3200, orders: 12 },
          { month: '04-15', revenue: 5600, orders: 22 },
          { month: '04-16', revenue: 4100, orders: 16 },
          { month: '04-17', revenue: 6800, orders: 28 },
          { month: '04-18', revenue: 5200, orders: 20 },
          { month: '04-19', revenue: 8900, orders: 35 },
          { month: '04-20', revenue: 4500, orders: 18 }
        ]
        this.revenueDetailData = [
          { month: '04-14', orders: 12, revenue: 3200, refund: 150, growth: 0 },
          { month: '04-15', orders: 22, revenue: 5600, refund: 280, growth: 75.0 },
          { month: '04-16', orders: 16, revenue: 4100, refund: 200, growth: -26.8 },
          { month: '04-17', orders: 28, revenue: 6800, refund: 350, growth: 65.9 },
          { month: '04-18', orders: 20, revenue: 5200, refund: 260, growth: -23.5 },
          { month: '04-19', orders: 35, revenue: 8900, refund: 450, growth: 71.2 },
          { month: '04-20', orders: 18, revenue: 4500, refund: 220, growth: -49.4 }
        ]
      } else if (range === 'thisMonth') {
        // 本月按日
        this.revenueChartData.rows = Array.from({ length: 20 }, (_, i) => ({
          month: `04-${String(i + 1).padStart(2, '0')}`,
          revenue: Math.round(3000 + Math.random() * 6000),
          orders: Math.round(10 + Math.random() * 25)
        }))
        this.revenueDetailData = this.revenueChartData.rows.map((item, idx) => {
          const prev = idx > 0 ? this.revenueChartData.rows[idx - 1].revenue : 0
          const growth = prev > 0 ? ((item.revenue - prev) / prev * 100).toFixed(1) : 0
          return { month: item.month, orders: item.orders, revenue: item.revenue, refund: Math.round(item.revenue * 0.05), growth: parseFloat(growth) }
        })
      } else {
        // 近三个月
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
