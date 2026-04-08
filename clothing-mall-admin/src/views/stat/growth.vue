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
        @change="handleDateChange"
      />
      <el-button type="primary" @click="fetchData">查询</el-button>
    </div>

    <!-- 核心指标卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">累计用户</div>
          <div class="metric-value">{{ totalUsers | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">新增用户（今日）</div>
          <div class="metric-value">{{ todayNewUsers | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">日活用户（今日）</div>
          <div class="metric-value">{{ todayDau | numberFormat }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">活跃率</div>
          <div class="metric-value">{{ activeRate }}%</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="hover">
          <div slot="header">新增用户趋势</div>
          <ve-line :data="newUsersChartData" :settings="newUsersSettings" :extend="chartExtend" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div slot="header">日活用户趋势</div>
          <ve-line :data="dauChartData" :settings="dauSettings" :extend="chartExtend" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { statGrowth } from '@/api/stat'
import VeLine from 'v-charts/lib/line'

export default {
  name: 'StatGrowth',
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
      totalUsers: 0,
      todayNewUsers: 0,
      todayDau: 0,
      activeRate: 0,
      newUsersChartData: { columns: ['day', 'newUsers'], rows: [] },
      dauChartData: { columns: ['day', 'dau'], rows: [] },
      newUsersSettings: {
        labelMap: { newUsers: '新增用户' }
      },
      dauSettings: {
        labelMap: { dau: '日活用户' }
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
    handleDateChange() {
      // 日期变化时可以自动查询，或者等待用户点击查询按钮
    },
    fetchData() {
      const params = {}
      if (this.dateRange && this.dateRange.length === 2) {
        params.startDate = this.dateRange[0]
        params.endDate = this.dateRange[1]
      }
      statGrowth(params).then(response => {
        const data = response.data.data
        this.totalUsers = data.totalUsers || 0
        this.newUsersChartData.rows = data.newUsers || []
        this.dauChartData.rows = data.dau || []

        // 计算今日数据
        const today = this.formatDate(new Date())
        const todayNew = (data.newUsers || []).find(item => item.day === today)
        const todayDauData = (data.dau || []).find(item => item.day === today)
        this.todayNewUsers = todayNew ? todayNew.newUsers : 0
        this.todayDau = todayDauData ? todayDauData.dau : 0

        // 活跃率 = 日活 / 累计用户
        if (this.totalUsers > 0) {
          this.activeRate = ((this.todayDau / this.totalUsers) * 100).toFixed(1)
        }
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
</style>
