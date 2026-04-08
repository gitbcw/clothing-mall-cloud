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
import { statOrder } from '@/api/stat'
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
      // 暂时使用模拟数据，后续对接真实API
      this.loadMockData()
    },
    loadMockData() {
      // 核心指标
      this.totalAmount = 125800
      this.totalOrders = 856
      this.totalCustomers = 623
      this.avgPrice = 147

      // 趋势数据
      const days = this.quickDays || 7
      const now = new Date()
      const rows = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dayStr = `${date.getMonth() + 1}/${date.getDate()}`
        rows.push({
          day: dayStr,
          amount: Math.floor(Math.random() * 10000) + 15000,
          orders: Math.floor(Math.random() * 50) + 100
        })
      }
      this.trendChartData.rows = rows

      // 商品榜单
      this.goodsTopList = [
        { name: '春日优雅连衣裙', sales: 156, amount: 46800 },
        { name: '法式雪纺衬衫', sales: 123, amount: 24600 },
        { name: '温柔针织开衫', sales: 98, amount: 19600 },
        { name: '干练西装外套', sales: 87, amount: 26100 },
        { name: '经典风衣外套', sales: 76, amount: 30400 },
        { name: 'A字半身裙', sales: 65, amount: 9750 },
        { name: '高腰阔腿裤', sales: 58, amount: 8700 },
        { name: '休闲牛仔外套', sales: 45, amount: 9000 },
        { name: '纯色T恤', sales: 42, amount: 2520 },
        { name: '运动套装', sales: 38, amount: 7600 }
      ]

      // 品类分布
      this.categoryData.rows = [
        { category: '连衣裙', amount: 46800 },
        { category: '衬衫', amount: 24600 },
        { category: '外套', amount: 65500 },
        { category: '半身裙', amount: 9750 },
        { category: '裤装', amount: 8700 }
      ]
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
