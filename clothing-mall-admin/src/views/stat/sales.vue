<template>
  <div class="app-container">
    <!-- 查询条件 -->
    <div class="filter-container">
      <el-radio-group v-model="quickDays" size="small" @change="handleQuickDaysChange">
        <el-radio-button :label="7">7天</el-radio-button>
        <el-radio-button :label="30">1个月</el-radio-button>
        <el-radio-button :label="90">3个月</el-radio-button>
      </el-radio-group>
      <span class="date-separator">或</span>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        size="small"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="yyyy-MM-dd"
        :picker-options="pickerOptions"
        @change="handleDateChange"
      />
    </div>

    <!-- 核心指标卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">订单总额</div>
          <div class="metric-value primary">¥ {{ totalAmount | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">订单量</div>
          <div class="metric-value">{{ totalOrders | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">下单用户</div>
          <div class="metric-value">{{ totalCustomers | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">客单价</div>
          <div class="metric-value">¥ {{ avgPrice }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图表 -->
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover" class="chart-card">
          <div slot="header" class="chart-header">
            <span>销售趋势</span>
            <el-radio-group v-model="chartMetric" size="mini">
              <el-radio-button label="amount">金额</el-radio-button>
              <el-radio-button label="orders">订单</el-radio-button>
            </el-radio-group>
          </div>
          <ve-line :data="trendChartData" :settings="trendSettings" :extend="chartExtend" height="300px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 销售榜单 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :xs="24" :sm="12">
        <el-card shadow="hover">
          <div slot="header">商品销售 Top 10</div>
          <el-table :data="goodsTopList" stripe size="small">
            <el-table-column type="index" label="#" width="40" />
            <el-table-column prop="name" label="商品名称" show-overflow-tooltip />
            <el-table-column prop="sales" label="销量" width="80" align="right" />
            <el-table-column prop="amount" label="金额" width="100" align="right">
              <template slot-scope="scope">
                ¥{{ scope.row.amount }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card shadow="hover">
          <div slot="header">品类销售分布</div>
          <ve-pie :data="categoryData" :settings="categorySettings" height="300px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { statOrder, statSalesGoodsTop, statRevenueCategory } from '@/api/stat'
import VeLine from 'v-charts/lib/line'
import VePie from 'v-charts/lib/pie'

export default {
  name: 'StatSales',
  components: { VeLine, VePie },
  filters: {
    numberFormat(value) {
      if (!value) return '0'
      return Number(value).toLocaleString()
    }
  },
  data() {
    return {
      quickDays: 7,
      dateRange: null,
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
      // 核心指标
      totalAmount: 0,
      totalOrders: 0,
      totalCustomers: 0,
      avgPrice: 0,
      // 图表
      chartMetric: 'amount',
      trendChartData: { columns: ['day', 'amount', 'orders'], rows: [] },
      trendSettings: {
        labelMap: { amount: '销售金额', orders: '订单数' },
        metrics: ['amount'],
        dimension: ['day']
      },
      chartExtend: {
        xAxis: { boundaryGap: false },
        series: { smooth: true, areaStyle: { opacity: 0.3 }},
        grid: { right: 20 }
      },
      // 商品榜单
      goodsTopList: [],
      // 品类分布
      categoryData: { columns: ['category', 'amount'], rows: [] },
      categorySettings: {
        radius: 80,
        labelMap: { amount: '销售金额' }
      }
    }
  },
  watch: {
    chartMetric(val) {
      this.trendSettings.metrics = [val]
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    handleQuickDaysChange() {
      this.dateRange = null
      this.fetchData()
    },
    handleDateChange(val) {
      if (val) {
        this.quickDays = null
        this.fetchData()
      }
    },
    getDateParams() {
      if (this.dateRange && this.dateRange.length === 2) {
        return { startDate: this.dateRange[0], endDate: this.dateRange[1] }
      }
      const days = this.quickDays || 7
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * (days - 1))
      const formatDate = (date) => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      return { startDate: formatDate(start), endDate: formatDate(end) }
    },
    fetchData() {
      const params = this.getDateParams()
      this.fetchOrderData(params)
      this.fetchGoodsTop(params)
      this.fetchCategoryData(params)
    },
    fetchOrderData(params) {
      statOrder(params).then(response => {
        const rows = response.data.data.rows || []
        let totalAmount = 0
        let totalOrders = 0
        let totalCustomers = 0
        const customerSet = new Set()
        rows.forEach(item => {
          totalAmount += parseFloat(item.amount) || 0
          totalOrders += parseInt(item.orders) || 0
          totalCustomers = Math.max(totalCustomers, parseInt(item.customers) || 0)
        })
        this.totalAmount = Math.round(totalAmount)
        this.totalOrders = totalOrders
        this.avgPrice = totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0
        this.trendChartData.rows = rows.map(item => ({
          day: item.day,
          amount: Math.round(parseFloat(item.amount) || 0),
          orders: parseInt(item.orders) || 0
        }))
      }).catch(() => {
        this.totalAmount = 0
        this.totalOrders = 0
        this.avgPrice = 0
        this.trendChartData.rows = []
      })
    },
    fetchGoodsTop(params) {
      statSalesGoodsTop({ ...params, limit: 10 }).then(response => {
        this.goodsTopList = (response.data.data || []).map(item => ({
          name: item.name,
          sales: parseInt(item.sales) || 0,
          amount: Math.round(parseFloat(item.amount) || 0)
        }))
      }).catch(() => {
        this.goodsTopList = []
      })
    },
    fetchCategoryData(params) {
      statRevenueCategory(params).then(response => {
        this.categoryData.rows = (response.data.data || []).map(item => ({
          category: item.category,
          amount: Math.round(parseFloat(item.amount) || 0)
        }))
      }).catch(() => {
        this.categoryData.rows = []
      })
    }
  }
}
</script>

<style scoped>
.filter-container {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-separator {
  color: #909399;
  font-size: 14px;
}

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
  padding: 15px;
}

.metric-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.metric-value.primary {
  color: #409eff;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
