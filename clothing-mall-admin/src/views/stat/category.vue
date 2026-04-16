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
          <el-radio-button label="week">本周</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
          <el-radio-button label="quarter">本季度</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <!-- 场景销售情况 -->
    <el-card class="section-card">
      <div slot="header" class="section-header">
        <span>场景销售情况</span>
        <el-tag size="small" type="info">按穿搭场景统计</el-tag>
      </div>
      <el-row :gutter="20">
        <el-col :xs="24" :lg="12">
          <ve-pie :data="sceneChartData" :settings="sceneSettings" height="300px" />
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-table :data="sceneTableData" border size="small" max-height="320">
            <el-table-column prop="name" label="场景名称" />
            <el-table-column prop="orders" label="订单数" width="80" align="right" />
            <el-table-column label="销售额" align="right">
              <template slot-scope="scope">
                {{ formatMoney(scope.row.amount) }}
              </template>
            </el-table-column>
            <el-table-column label="占比" width="80" align="right">
              <template slot-scope="scope">
                {{ scope.row.percent }}%
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <!-- 分类销售情况 -->
    <el-card class="section-card">
      <div slot="header" class="section-header">
        <span>分类销售情况</span>
        <el-tag size="small" type="info">按商品分类统计</el-tag>
      </div>
      <el-row :gutter="20">
        <el-col :xs="24" :lg="12">
          <ve-histogram :data="categoryChartData" :settings="categorySettings" height="300px" />
        </el-col>
        <el-col :xs="24" :lg="12">
          <el-table :data="categoryTableData" border size="small" max-height="320">
            <el-table-column prop="name" label="分类名称" />
            <el-table-column prop="goodsCount" label="商品数" width="80" align="right" />
            <el-table-column prop="orders" label="订单数" width="80" align="right" />
            <el-table-column label="销售额" align="right">
              <template slot-scope="scope">
                {{ formatMoney(scope.row.amount) }}
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <!-- 活动效果分析 -->
    <el-card class="section-card">
      <div slot="header" class="section-header">
        <span>活动效果分析</span>
      </div>
      <div class="empty-tip">
        <i class="el-icon-info" />
        <span>暂无数据，需建立活动跟踪体系后采集</span>
      </div>
    </el-card>
  </div>
</template>

<script>
import VePie from 'v-charts/lib/pie'
import VeHistogram from 'v-charts/lib/histogram'
import { statRevenueScene, statRevenueCategory } from '@/api/stat'

export default {
  name: 'StatCategory',
  components: { VePie, VeHistogram },
  data() {
    return {
      dateRange: [],
      quickRange: 'month',
      // 场景销售
      sceneChartData: {
        columns: ['name', 'amount'],
        rows: []
      },
      sceneSettings: {
        radius: 100,
        labelMap: { amount: '销售额' }
      },
      sceneTableData: [],
      // 分类销售
      categoryChartData: {
        columns: ['name', 'amount'],
        rows: []
      },
      categorySettings: {
        labelMap: { amount: '销售额' }
      },
      categoryTableData: []
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
      const month = now.getMonth()
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      this.dateRange = [this.formatDate(start), this.formatDate(end)]
    },
    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    handleDateChange() {
      this.quickRange = ''
      this.fetchData()
    },
    handleQuickRange(value) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()

      if (value === 'week') {
        const day = now.getDay()
        const start = new Date(now)
        start.setDate(now.getDate() - day)
        const end = new Date(now)
        end.setDate(start.getDate() + 6)
        this.dateRange = [this.formatDate(start), this.formatDate(end)]
      } else if (value === 'month') {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0)
        this.dateRange = [this.formatDate(start), this.formatDate(end)]
      } else if (value === 'quarter') {
        const quarterStart = Math.floor(month / 3) * 3
        const start = new Date(year, quarterStart, 1)
        const end = new Date(year, quarterStart + 3, 0)
        this.dateRange = [this.formatDate(start), this.formatDate(end)]
      }
      this.fetchData()
    },
    fetchData() {
      const [startDate, endDate] = this.dateRange || []
      // 获取场景销售数据
      statRevenueScene({ startDate, endDate }).then(response => {
        const data = response.data.data || []
        this.sceneChartData.rows = data.map(item => ({
          name: item.name,
          amount: item.amount || 0
        }))
        this.sceneTableData = data.map(item => ({
          name: item.name,
          orders: item.orders || 0,
          amount: item.amount || 0,
          percent: item.percent || 0
        }))
      }).catch(() => {
        this.sceneChartData.rows = []
        this.sceneTableData = []
      })

      // 获取分类销售数据
      statRevenueCategory({ startDate, endDate }).then(response => {
        const data = response.data.data || []
        this.categoryChartData.rows = data.map(item => ({
          name: item.name,
          amount: item.amount || 0
        }))
        this.categoryTableData = data.map(item => ({
          name: item.name,
          goodsCount: item.goodsCount || 0,
          orders: item.orders || 0,
          amount: item.amount || 0
        }))
      }).catch(() => {
        this.categoryChartData.rows = []
        this.categoryTableData = []
      })
    },
    formatMoney(value) {
      if (!value) return '¥0'
      return '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
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

.section-card {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.empty-tip {
  padding: 30px 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
  i { margin-right: 4px; }
}
</style>
