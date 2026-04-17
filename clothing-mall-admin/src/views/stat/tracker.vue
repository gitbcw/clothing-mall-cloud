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
          <div class="metric-label">总事件数</div>
          <div class="metric-value">{{ overview.total | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">页面浏览</div>
          <div class="metric-value">{{ overview.pageView | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">加购转化率</div>
          <div class="metric-value">{{ overview.addCartRate }}%</div>
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

    <!-- 页面访问排行 -->
    <el-card shadow="hover" class="table-card">
      <div slot="header">
        <span>页面访问排行</span>
        <el-select v-model="pageEventType" size="small" style="margin-left: 20px; width: 120px;" @change="fetchPages">
          <el-option label="页面浏览" value="page_view" />
          <el-option label="商品浏览" value="goods_view" />
        </el-select>
      </div>
      <el-table :data="pageRankData" border stripe>
        <el-table-column prop="pageRoute" label="页面路径" />
        <el-table-column prop="count" label="访问次数" width="120" align="right">
          <template slot-scope="scope">
            {{ scope.row.count | numberFormat }}
          </template>
        </el-table-column>
        <el-table-column prop="uniqueUsers" label="独立用户数" width="120" align="right">
          <template slot-scope="scope">
            {{ scope.row.uniqueUsers | numberFormat }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { statTrackerOverview, statTrackerTrend, statTrackerPages } from '@/api/stat'
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
        total: 0,
        pageView: 0,
        addCart: 0,
        orderPay: 0,
        addCartRate: 0,
        payRate: 0
      },
      eventTypes: ['page_view', 'goods_view', 'add_cart', 'order_create', 'order_pay'],
      trendChartData: {
        columns: ['day', 'page_view', 'goods_view', 'add_cart', 'order_create', 'order_pay'],
        rows: []
      },
      trendSettings: {
        labelMap: {
          page_view: '页面浏览',
          goods_view: '商品浏览',
          add_cart: '加购',
          order_create: '下单',
          order_pay: '支付'
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
      pageEventType: 'page_view',
      pageRankData: []
    }
  },
  created() {
    // 默认查询最近7天
    const end = new Date()
    const start = new Date()
    start.setTime(start.getTime() - 3600 * 1000 * 24 * 6)
    this.dateRange = [
      this.formatDate(start),
      this.formatDate(end)
    ]
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
      this.fetchPages()
    },
    fetchOverview() {
      statTrackerOverview(this.getQueryParams()).then(response => {
        const data = response.data.data
        this.overview = {
          total: (data.byType || []).reduce(function(s, r) { return s + (r.total || 0) }, 0),
          pageView: data.pageView || 0,
          addCart: data.addCart || 0,
          orderPay: data.orderPay || 0,
          addCartRate: data.addCartRate || 0,
          payRate: data.payRate || 0
        }
      })
    },
    fetchTrend() {
      statTrackerTrend(this.getQueryParams()).then(response => {
        const raw = response.data.data || []
        // 后端返回 [{day, type, total}] 长格式 → 透视为 [{day, page_view: 100, ...}] 宽格式
        const map = {}
        raw.forEach(function(r) {
          if (!map[r.day]) {
            map[r.day] = { day: r.day }
          }
          map[r.day][r.type] = r.total
        })
        this.trendChartData.rows = Object.values(map)
      })
    },
    fetchPages() {
      const params = {
        ...this.getQueryParams(),
        eventType: this.pageEventType,
        limit: 20
      }
      statTrackerPages(params).then(response => {
        this.pageRankData = response.data.data || []
      })
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
</style>
