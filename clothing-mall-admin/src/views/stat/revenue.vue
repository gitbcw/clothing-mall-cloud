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
          <div class="metric-value">{{ formatMoney(totalRevenue) }}</div>
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
      <div slot="header">营收趋势</div>
      <ve-line :data="revenueChartData" :settings="chartSettings" :extend="chartExtend" />
    </el-card>

    <!-- 分类报表 -->
    <el-card class="table-card">
      <div slot="header">分类销售统计</div>
      <el-table :data="categoryData" border>
        <el-table-column prop="categoryName" label="分类名称" />
        <el-table-column prop="orderCount" label="订单数" />
        <el-table-column prop="goodsCount" label="商品数" />
        <el-table-column label="销售额">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.salesAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="占比">
          <template slot-scope="scope">
            {{ calculatePercentage(scope.row.salesAmount) }}%
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import VeLine from 'v-charts/lib/line'
import { statOrder } from '@/api/stat'

export default {
  name: 'RevenueStat',
  components: { VeLine },
  data() {
    return {
      dateRange: [],
      quickRange: 'thisYear',
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderPrice: 0,
      totalCustomers: 0,
      revenueChartData: {
        columns: ['month', 'revenue', 'orders'],
        rows: []
      },
      categoryData: [],
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
        // 修复跨年月份计算
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
      // 使用现有订单统计 API
      statOrder().then(response => {
        const data = response.data.data.rows || []
        this.processData(data)
      }).catch(() => {
        // 使用模拟数据
        this.useMockData()
        this.$message.warning('数据加载失败，当前显示为模拟数据')
      })
    },
    processData(data) {
      // 计算核心指标
      let revenue = 0
      let orders = 0

      data.forEach(item => {
        revenue += parseFloat(item.amount) || 0
        orders += parseInt(item.orders) || 0
      })

      this.totalRevenue = revenue
      this.totalOrders = orders
      this.avgOrderPrice = orders > 0 ? revenue / orders : 0

      // 生成图表数据（按月聚合）
      const monthlyData = {}
      data.forEach(item => {
        const month = item.day ? item.day.substring(0, 7) : 'unknown'
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, orders: 0 }
        }
        monthlyData[month].revenue += parseFloat(item.amount) || 0
        monthlyData[month].orders += parseInt(item.orders) || 0
      })

      this.revenueChartData.rows = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
    },
    useMockData() {
      this.totalRevenue = 1258000
      this.totalOrders = 5400
      this.avgOrderPrice = 233
      this.totalCustomers = 1280

      this.revenueChartData.rows = [
        { month: '2026-01', revenue: 156000, orders: 680 },
        { month: '2026-02', revenue: 189000, orders: 820 },
        { month: '2026-03', revenue: 245000, orders: 1050 }
      ]

      this.categoryData = [
        { categoryName: '连衣裙', orderCount: 1200, goodsCount: 2400, salesAmount: 358000 },
        { categoryName: '衬衫', orderCount: 980, goodsCount: 1800, salesAmount: 245000 },
        { categoryName: '外套', orderCount: 650, goodsCount: 980, salesAmount: 312000 },
        { categoryName: '半身裙', orderCount: 520, goodsCount: 860, salesAmount: 156000 },
        { categoryName: '裤子', orderCount: 480, goodsCount: 720, salesAmount: 128000 }
      ]
    },
    formatMoney(value) {
      if (!value) return '¥0'
      return '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    },
    calculatePercentage(value) {
      if (!this.totalRevenue) return 0
      return ((value / this.totalRevenue) * 100).toFixed(1)
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
    color: #409EFF;
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
</style>
