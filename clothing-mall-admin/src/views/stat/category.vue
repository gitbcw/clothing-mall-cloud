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
        <el-tag size="small" type="warning">模拟数据</el-tag>
      </div>
      <el-table :data="activityData" border>
        <el-table-column prop="name" label="活动名称" min-width="150" />
        <el-table-column prop="type" label="活动类型" width="100">
          <template slot-scope="scope">
            <el-tag size="small" :type="getActivityTagType(scope.row.type)">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="period" label="活动周期" width="180" />
        <el-table-column prop="participants" label="参与人数" width="100" align="right" />
        <el-table-column prop="orders" label="订单数" width="100" align="right" />
        <el-table-column label="销售额" width="120" align="right">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column label="转化率" width="100" align="right">
          <template slot-scope="scope">
            {{ scope.row.conversion }}%
          </template>
        </el-table-column>
        <el-table-column label="ROI" width="80" align="right">
          <template slot-scope="scope">
            <span :class="scope.row.roi >= 3 ? 'roi-good' : 'roi-normal'">
              {{ scope.row.roi }}x
            </span>
          </template>
        </el-table-column>
      </el-table>
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
      categoryTableData: [],
      // 活动效果
      activityData: []
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
        this.loadMockSceneData()
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
        this.loadMockCategoryData()
      })

      // 活动效果暂时使用模拟数据
      this.loadMockActivityData()
    },
    loadMockSceneData() {
      this.sceneChartData.rows = [
        { name: '日常通勤', amount: 186000 },
        { name: '约会聚会', amount: 145000 },
        { name: '商务正装', amount: 128000 },
        { name: '休闲度假', amount: 98000 },
        { name: '运动健身', amount: 65000 }
      ]
      const totalScene = this.sceneChartData.rows.reduce((sum, item) => sum + item.amount, 0)
      this.sceneTableData = this.sceneChartData.rows.map((item, index) => ({
        name: item.name,
        orders: [420, 350, 280, 210, 150][index],
        amount: item.amount,
        percent: ((item.amount / totalScene) * 100).toFixed(1)
      }))
    },
    loadMockCategoryData() {
      this.categoryChartData.rows = [
        { name: '连衣裙', amount: 245000 },
        { name: '衬衫', amount: 186000 },
        { name: '外套', amount: 165000 },
        { name: '半身裙', amount: 128000 },
        { name: '裤装', amount: 98000 }
      ]
      this.categoryTableData = [
        { name: '连衣裙', goodsCount: 156, orders: 520, amount: 245000 },
        { name: '衬衫', goodsCount: 128, orders: 430, amount: 186000 },
        { name: '外套', goodsCount: 98, orders: 380, amount: 165000 },
        { name: '半身裙', goodsCount: 85, orders: 290, amount: 128000 },
        { name: '裤装', goodsCount: 72, orders: 220, amount: 98000 }
      ]
    },
    loadMockActivityData() {
      this.activityData = [
        {
          name: '春季焕新季',
          type: '满减',
          period: '2026-03-01 ~ 2026-03-15',
          participants: 1250,
          orders: 380,
          amount: 156000,
          conversion: 30.4,
          roi: 4.2
        },
        {
          name: '女神节特惠',
          type: '折扣',
          period: '2026-03-06 ~ 2026-03-08',
          participants: 890,
          orders: 256,
          amount: 98000,
          conversion: 28.8,
          roi: 3.5
        },
        {
          name: '新人专享券',
          type: '优惠券',
          period: '2026-03-01 ~ 2026-03-31',
          participants: 560,
          orders: 125,
          amount: 45000,
          conversion: 22.3,
          roi: 2.8
        },
        {
          name: '限时特卖-春装',
          type: '秒杀',
          period: '2026-03-10 10:00 ~ 22:00',
          participants: 420,
          orders: 180,
          amount: 72000,
          conversion: 42.9,
          roi: 5.1
        }
      ]
    },
    formatMoney(value) {
      if (!value) return '¥0'
      return '¥' + Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    },
    getActivityTagType(type) {
      const typeMap = {
        '满减': 'danger',
        '折扣': 'warning',
        '优惠券': 'success',
        '秒杀': ''
      }
      return typeMap[type] || 'info'
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

.roi-good {
  color: #67C23A;
  font-weight: 600;
}

.roi-normal {
  color: #E6A23C;
}
</style>
