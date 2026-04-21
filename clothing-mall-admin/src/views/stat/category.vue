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

    <!-- 场景 + 分类 并排 -->
    <el-row :gutter="20" type="flex">
      <el-col :xs="24" :lg="12">
        <el-card class="section-card stretch-card">
          <div slot="header" class="section-header">
            <span>场景销售</span>
            <el-tag size="small" type="info">按穿搭场景</el-tag>
          </div>
          <div class="chart-area">
            <ve-pie :data="sceneChartData" :settings="pieSettings" :extend="pieExtend" height="260px" />
          </div>
          <el-table :data="sceneTableData" border size="mini" max-height="240">
            <el-table-column prop="name" label="场景" />
            <el-table-column prop="orders" label="订单" width="60" align="right" />
            <el-table-column label="销售额" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.amount) }}</template>
            </el-table-column>
            <el-table-column label="占比" width="60" align="right">
              <template slot-scope="scope">{{ scope.row.percent }}%</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card class="section-card stretch-card">
          <div slot="header" class="section-header">
            <span>分类销售</span>
            <el-tag size="small" type="info">按商品分类</el-tag>
          </div>
          <div class="chart-area">
            <ve-pie :data="categoryChartData" :settings="pieSettings" :extend="pieExtend" height="260px" />
          </div>
          <el-table :data="categoryTableData" border size="mini" max-height="240">
            <el-table-column prop="name" label="分类" />
            <el-table-column prop="goodsCount" label="商品" width="60" align="right" />
            <el-table-column prop="orders" label="订单" width="60" align="right" />
            <el-table-column label="销售额" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.amount) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 活动效果 Tab -->
    <el-card class="section-card">
      <el-tabs v-model="activeTab">
        <!-- 节日活动 -->
        <el-tab-pane label="节日活动" name="holiday">
          <div v-if="holidayData.length === 0" class="empty-tip">
            <i class="el-icon-info" />
            <span>暂无节日活动数据</span>
          </div>
          <el-table v-else :data="holidayData" border size="small" row-key="name">
            <el-table-column type="expand">
              <template slot-scope="props">
                <div v-if="props.row.topGoods.length > 0" style="padding: 10px 20px">
                  <div class="expand-title">热销商品 Top 5</div>
                  <el-table :data="props.row.topGoods" size="mini" border>
                    <el-table-column prop="name" label="商品名称" show-overflow-tooltip />
                    <el-table-column prop="sales" label="销量" width="70" align="right" />
                    <el-table-column label="销售额" width="100" align="right">
                      <template slot-scope="scope">{{ formatMoney(scope.row.amount) }}</template>
                    </el-table-column>
                  </el-table>
                </div>
                <div v-else class="empty-tip"><span>该活动期间暂无销售数据</span></div>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="活动名称" min-width="120" />
            <el-table-column label="活动时间" width="180">
              <template slot-scope="scope">{{ scope.row.startDate }} ~ {{ scope.row.endDate }}</template>
            </el-table-column>
            <el-table-column prop="goodsCount" label="关联商品" width="80" align="right" />
            <el-table-column prop="orders" label="订单数" width="80" align="right" />
            <el-table-column label="GMV" width="120" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.gmv) }}</template>
            </el-table-column>
            <el-table-column label="客单价" width="100" align="right">
              <template slot-scope="scope">{{ formatMoney(scope.row.avgPrice) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 特价商品 -->
        <el-tab-pane label="特价商品" name="special">
          <div v-if="specialLoading" class="empty-tip">
            <i class="el-icon-loading" /><span>加载中...</span>
          </div>
          <template v-else-if="specialData.specialCount > 0">
            <el-row :gutter="16" class="special-summary">
              <el-col :xs="12" :sm="6">
                <div class="metric-item">
                  <div class="metric-value">{{ specialData.specialCount }}</div>
                  <div class="metric-label">特价商品数</div>
                </div>
              </el-col>
              <el-col :xs="12" :sm="6">
                <div class="metric-item">
                  <div class="metric-value">{{ specialData.soldOrders }}</div>
                  <div class="metric-label">成交订单</div>
                </div>
              </el-col>
              <el-col :xs="12" :sm="6">
                <div class="metric-item">
                  <div class="metric-value">{{ formatMoney(specialData.totalAmount) }}</div>
                  <div class="metric-label">特价销售额</div>
                </div>
              </el-col>
              <el-col :xs="12" :sm="6">
                <div class="metric-item">
                  <div class="metric-value">{{ specialData.discountRate }}%</div>
                  <div class="metric-label">平均折扣率</div>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :xs="24" :sm="12">
                <el-table :data="[specialCompareRow]" border size="small">
                  <el-table-column label="" width="80">
                    <template><el-tag size="mini" type="danger">特价</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="sOrders" label="订单" width="70" align="right" />
                  <el-table-column prop="sQty" label="件数" width="70" align="right" />
                  <el-table-column label="销售额" align="right">
                    <template slot-scope="scope">{{ formatMoney(scope.row.sAmount) }}</template>
                  </el-table-column>
                </el-table>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-table :data="[specialCompareRow]" border size="small">
                  <el-table-column label="" width="80">
                    <template><el-tag size="mini" type="info">原价</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="nOrders" label="订单" width="70" align="right" />
                  <el-table-column prop="nQty" label="件数" width="70" align="right" />
                  <el-table-column label="销售额" align="right">
                    <template slot-scope="scope">{{ formatMoney(scope.row.nAmount) }}</template>
                  </el-table-column>
                </el-table>
              </el-col>
            </el-row>
            <div v-if="specialData.topGoods.length > 0" style="margin-top: 12px">
              <div class="expand-title">特价热销 Top 5</div>
              <el-table :data="specialData.topGoods" border size="small">
                <el-table-column type="index" label="#" width="50" />
                <el-table-column prop="name" label="商品名称" min-width="200" show-overflow-tooltip />
                <el-table-column prop="sales" label="销量" width="70" align="right" />
                <el-table-column label="原价" width="90" align="right">
                  <template slot-scope="scope">{{ formatMoney(scope.row.retailPrice) }}</template>
                </el-table-column>
                <el-table-column label="特价" width="90" align="right">
                  <template slot-scope="scope">{{ formatMoney(scope.row.specialPrice) }}</template>
                </el-table-column>
                <el-table-column label="销售额" width="110" align="right">
                  <template slot-scope="scope">{{ formatMoney(scope.row.amount) }}</template>
                </el-table-column>
              </el-table>
            </div>
          </template>
          <div v-else class="empty-tip">
            <i class="el-icon-info" /><span>暂无特价商品数据</span>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import VePie from 'v-charts/lib/pie'
import { statRevenueScene, statRevenueCategory, statRevenueHoliday, statRevenueSpecialPrice } from '@/api/stat'

export default {
  name: 'StatCategory',
  components: { VePie },
  data() {
    return {
      dateRange: [],
      quickRange: 'month',
      activeTab: 'holiday',
      // 共用饼图设置
      pieSettings: {
        radius: 80,
        labelMap: { amount: '销售额' }
      },
      pieExtend: {
        legend: {
          orient: 'vertical',
          right: 0,
          top: 'middle'
        },
        series: {
          center: ['40%', '50%']
        },
        grid: {
          top: 10,
          bottom: 0
        }
      },
      // 场景销售
      sceneChartData: { columns: ['name', 'amount'], rows: [] },
      sceneTableData: [],
      // 分类销售
      categoryChartData: { columns: ['name', 'amount'], rows: [] },
      categoryTableData: [],
      // 节日活动
      holidayData: [],
      // 特价商品
      specialLoading: true,
      specialData: {
        specialCount: 0, soldOrders: 0, specialQty: 0, totalAmount: 0,
        discountRate: 0, normalOrders: 0, normalAmount: 0, normalQty: 0, topGoods: []
      }
    }
  },
  computed: {
    specialCompareRow() {
      const d = this.specialData
      return {
        sOrders: d.soldOrders, sQty: d.specialQty, sAmount: d.totalAmount,
        nOrders: d.normalOrders, nQty: d.normalQty, nAmount: d.normalAmount
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
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
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
        this.dateRange = [this.formatDate(new Date(year, month, 1)), this.formatDate(new Date(year, month + 1, 0))]
      } else if (value === 'quarter') {
        const qs = Math.floor(month / 3) * 3
        this.dateRange = [this.formatDate(new Date(year, qs, 1)), this.formatDate(new Date(year, qs + 3, 0))]
      }
      this.fetchData()
    },
    fetchData() {
      const [startDate, endDate] = this.dateRange || []
      const params = { startDate, endDate }

      statRevenueScene(params).then(response => {
        const data = response.data.data || []
        this.sceneChartData.rows = data.map(item => ({ name: item.name, amount: item.amount || 0 }))
        this.sceneTableData = data.map(item => ({ name: item.name, orders: item.orders || 0, amount: item.amount || 0, percent: item.percent || 0 }))
      }).catch(() => { this.sceneChartData.rows = []; this.sceneTableData = [] })

      statRevenueCategory(params).then(response => {
        const data = response.data.data || []
        this.categoryChartData.rows = data.map(item => ({ name: item.name, amount: item.amount || 0 }))
        this.categoryTableData = data.map(item => ({ name: item.name, goodsCount: item.goodsCount || 0, orders: item.orders || 0, amount: item.amount || 0 }))
      }).catch(() => { this.categoryChartData.rows = []; this.categoryTableData = [] })

      statRevenueHoliday(params).then(response => {
        this.holidayData = response.data.data || []
      }).catch(() => { this.holidayData = [] })

      this.specialLoading = true
      statRevenueSpecialPrice(params).then(response => {
        this.specialData = response.data.data || this.specialData
      }).catch(() => {}).finally(() => { this.specialLoading = false })
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

.stretch-card {
  height: 100%;
}

.chart-area {
  height: 280px;
  margin-bottom: 16px;
}

.empty-tip {
  padding: 30px 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
  i { margin-right: 4px; }
}

.expand-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.special-summary {
  text-align: center;
  .metric-item { padding: 12px 8px; }
  .metric-value {
    font-size: 22px;
    font-weight: bold;
    color: #409EFF;
    margin-bottom: 4px;
  }
  .metric-label {
    font-size: 12px;
    color: #909399;
  }
}
</style>
