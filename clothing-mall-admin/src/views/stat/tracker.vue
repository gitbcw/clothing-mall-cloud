<template>
  <div class="app-container">
    <!-- 查询条件 -->
    <div class="filter-container">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="yyyy-MM-dd"
        :picker-options="pickerOptions"
      />
      <el-button type="primary" @click="fetchData">查询</el-button>
    </div>

    <!-- 核心指标卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">商品浏览量</div>
          <div class="metric-value">{{ overview.goodsView | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">购买意向率</div>
          <div class="metric-value">{{ overview.intentRate }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">下单转化率</div>
          <div class="metric-value">{{ overview.orderRate }}%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">支付转化率</div>
          <div class="metric-value">{{ overview.payRate }}%</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 事件趋势图 -->
    <el-card shadow="hover" class="chart-card">
      <div slot="header">事件趋势</div>
      <ve-line :data="trendChartData" :settings="trendSettings" :extend="chartExtend" />
    </el-card>

    <!-- 底部统计 Tab -->
    <el-card shadow="hover" class="table-card">
      <el-tabs v-model="activeTab" @tab-click="handleTabClick">
        <!-- 转化漏斗 -->
        <el-tab-pane label="转化漏斗" name="funnel">
          <div class="funnel-container">
            <div v-for="(item, idx) in funnelData" :key="item.stage" class="funnel-stage">
              <div class="funnel-bar-wrapper">
                <div class="funnel-bar" :class="'funnel-' + item.stage" :style="{ width: funnelWidth(item) + '%' }">
                  <span class="funnel-name">{{ item.name }}</span>
                  <span class="funnel-count">{{ item.count | numberFormat }}</span>
                </div>
              </div>
              <div v-if="idx > 0" class="funnel-rate">
                <span class="rate-value">{{ funnelRate(idx) }}</span>
                <span class="rate-label">{{ funnelData[idx - 1].name }} → {{ item.name }}</span>
              </div>
              <div v-else class="funnel-rate" />
            </div>
          </div>
          <div class="funnel-summary">
            <span>整体转化率（浏览 → 支付）：<strong>{{ overallRate }}</strong></span>
          </div>
        </el-tab-pane>

        <!-- 搜索词排行 -->
        <el-tab-pane label="搜索词排行" name="search">
          <el-table :data="searchData" border stripe>
            <el-table-column type="index" label="排名" width="70" align="center" />
            <el-table-column prop="keyword" label="搜索关键词" />
            <el-table-column prop="count" label="搜索次数" width="120" align="right">
              <template slot-scope="scope">
                {{ scope.row.count | numberFormat }}
              </template>
            </el-table-column>
          </el-table>
          <div v-if="searchData.length === 0" class="empty-hint">暂无搜索数据</div>
        </el-tab-pane>

        <!-- 场景点击排行 -->
        <el-tab-pane label="场景点击排行" name="banners">
          <el-table :data="bannerData" border stripe>
            <el-table-column label="位置" width="70" align="center">
              <template slot-scope="scope">
                第{{ scope.row.position + 1 }}张
              </template>
            </el-table-column>
            <el-table-column prop="sceneName" label="场景名称" />
            <el-table-column prop="clickCount" label="点击次数" width="120" align="right">
              <template slot-scope="scope">
                {{ scope.row.clickCount | numberFormat }}
              </template>
            </el-table-column>
            <el-table-column prop="uniqueUsers" label="独立用户数" width="120" align="right">
              <template slot-scope="scope">
                {{ scope.row.uniqueUsers | numberFormat }}
              </template>
            </el-table-column>
            <el-table-column label="点击占比" width="200">
              <template slot-scope="scope">
                <el-progress :percentage="bannerPercent(scope.row)" :stroke-width="14" :text-inside="true" />
              </template>
            </el-table-column>
          </el-table>
          <div v-if="bannerData.length === 0" class="empty-hint">暂无场景点击数据，请确认小程序端已部署最新版本</div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import { statTrackerOverview, statTrackerTrend, statTrackerFunnel, statTrackerBannerClicks, statSearchHistory } from '@/api/stat'
import VeLine from 'v-charts/lib/line'

export default {
  name: 'StatTracker',
  components: { VeLine },
  filters: {
    numberFormat(value) {
      if (!value) return '0'
      return Number(value).toLocaleString()
    }
  },
  data() {
    return {
      dateRange: [],
      pickerOptions: {
        shortcuts: [{
          text: '最近7天',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 6)
            picker.$emit('pick', [start, end])
          }
        }, {
          text: '最近30天',
          onClick(picker) {
            const end = new Date()
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24 * 29)
            picker.$emit('pick', [start, end])
          }
        }]
      },
      overview: {
        goodsView: 0,
        purchaseIntent: 0,
        orderCreate: 0,
        orderPay: 0,
        intentRate: 0,
        orderRate: 0,
        payRate: 0
      },
      trendChartData: {
        columns: ['day', 'goods_view', 'purchase_intent', 'order_create', 'order_pay'],
        rows: []
      },
      trendSettings: {
        labelMap: {
          goods_view: '商品浏览',
          purchase_intent: '购买意向',
          order_create: '提交订单',
          order_pay: '完成支付'
        }
      },
      chartExtend: {
        xAxis: {
          boundaryGap: false,
          axisLabel: {
            formatter: function(val) {
              const d = new Date(val)
              if (isNaN(d.getTime())) return val
              const mm = String(d.getMonth() + 1).padStart(2, '0')
              const dd = String(d.getDate()).padStart(2, '0')
              return mm + '-' + dd
            }
          }
        },
        series: {
          smooth: true,
          areaStyle: { opacity: 0.3 }
        },
        legend: { bottom: 0 }
      },
      activeTab: 'funnel',
      funnelData: [],
      searchData: [],
      bannerData: []
    }
  },
  computed: {
    overallRate() {
      if (this.funnelData.length < 2) return '0%'
      const first = this.funnelData[0].count
      const last = this.funnelData[this.funnelData.length - 1].count
      return first > 0 ? (last * 100 / first).toFixed(2) + '%' : '0%'
    }
  },
  created() {
    const end = new Date()
    const start = new Date()
    start.setTime(start.getTime() - 3600 * 1000 * 24 * 6)
    this.dateRange = [this.formatDate(start), this.formatDate(end)]
    this.fetchData()
  },
  methods: {
    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    getQueryParams() {
      const params = {}
      if (this.dateRange && this.dateRange.length === 2) {
        params.startDate = this.dateRange[0]
        params.endDate = this.dateRange[1]
      }
      return params
    },
    fetchData() {
      this.fetchOverview()
      this.fetchTrend()
      this.fetchFunnel()
      this.fetchBannerClicks()
    },
    handleTabClick(tab) {
      if (tab.name === 'search' && this.searchData.length === 0) {
        this.fetchSearch()
      }
    },
    fetchOverview() {
      statTrackerOverview(this.getQueryParams()).then(response => {
        const data = response.data.data
        this.overview = {
          goodsView: data.goodsView || 0,
          purchaseIntent: data.purchaseIntent || 0,
          orderCreate: data.orderCreate || 0,
          orderPay: data.orderPay || 0,
          intentRate: data.intentRate || 0,
          orderRate: data.orderRate || 0,
          payRate: data.payRate || 0
        }
      })
    },
    fetchTrend() {
      statTrackerTrend(this.getQueryParams()).then(response => {
        const raw = response.data.data || []
        const map = {}
        raw.forEach(function(r) {
          if (!map[r.day]) { map[r.day] = { day: r.day } }
          // 合并 add_cart + buy_now 为 purchase_intent
          if (r.type === 'add_cart' || r.type === 'buy_now') {
            map[r.day].purchase_intent = (map[r.day].purchase_intent || 0) + r.total
          } else if (r.type === 'goods_view' || r.type === 'order_create' || r.type === 'order_pay') {
            map[r.day][r.type] = r.total
          }
        })
        this.trendChartData.rows = Object.values(map)
      })
    },
    fetchFunnel() {
      statTrackerFunnel().then(response => {
        this.funnelData = response.data.data || []
      })
    },
    fetchSearch() {
      statSearchHistory().then(response => {
        this.searchData = (response.data.data || {}).topKeywords || []
      })
    },
    fetchBannerClicks() {
      statTrackerBannerClicks({ days: 30 }).then(response => {
        this.bannerData = response.data.data || []
      })
    },
    funnelWidth(item) {
      const max = this.funnelData.length > 0 ? this.funnelData[0].count : 1
      if (max === 0) return 20
      return Math.max(Math.round(item.count / max * 100), 20)
    },
    funnelRate(idx) {
      const prev = this.funnelData[idx - 1].count
      const curr = this.funnelData[idx].count
      if (prev === 0) return '0%'
      return (curr * 100 / prev).toFixed(2) + '%'
    },
    bannerPercent(row) {
      const total = this.bannerData.reduce((s, r) => s + Number(r.clickCount), 0)
      return total > 0 ? Math.round(Number(row.clickCount) / total * 100) : 0
    }
  }
}
</script>

<style scoped>
.filter-container {
  margin-bottom: 20px;
}
.metrics-row {
  margin-bottom: 20px;
}
.metric-card {
  text-align: center;
  padding: 10px 0;
}
.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}
.metric-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
}
.chart-card {
  margin-bottom: 20px;
}
.table-card {
  margin-bottom: 20px;
}
.empty-hint {
  text-align: center;
  padding: 20px;
  color: #C0C4CC;
  font-size: 13px;
}

/* 转化漏斗 */
.funnel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 0 20px;
}
.funnel-stage {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
}
.funnel-bar-wrapper {
  flex: 1;
}
.funnel-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  transition: width 0.3s ease;
}
.funnel-goods_view { background: #409EFF; }
.funnel-purchase_intent { background: #e6a23c; }
.funnel-order_create { background: #f5a142; }
.funnel-order_pay { background: #67C23A; }
.funnel-name {
  font-weight: bold;
}
.funnel-count {
  font-size: 18px;
  font-weight: bold;
}
.funnel-rate {
  min-width: 100px;
  text-align: right;
}
.rate-value {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.rate-label {
  display: block;
  font-size: 11px;
  color: #909399;
}
.funnel-summary {
  text-align: center;
  padding: 12px 0;
  border-top: 1px solid #EBEEF5;
  color: #606266;
  font-size: 14px;
}
.funnel-summary strong {
  font-size: 18px;
  color: #67C23A;
}
</style>
