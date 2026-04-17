<template>
  <div class="history-stats">
    <!-- 概览 -->
    <div class="kpi-strip">
      <div class="kpi-item">
        <span class="kpi-num primary">{{ formatNum(kpi.totalCount) }}</span>
        <span class="kpi-label">搜索总量</span>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <span class="kpi-num">{{ kpi.keywordCount }}</span>
        <span class="kpi-label">关键词数</span>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <span class="kpi-num">{{ kpi.userCount }}</span>
        <span class="kpi-label">搜索用户</span>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <span class="kpi-num">{{ kpi.dailyAvg }}</span>
        <span class="kpi-label">日均搜索</span>
      </div>
    </div>

    <!-- 时段分布 + 趋势 + 热门搜索 -->
    <el-row :gutter="16">
      <el-col :xs="24" :sm="10" :md="8">
        <div class="chart-card">
          <div class="card-title">时段分布</div>
          <ve-histogram :data="hourlyData" :settings="hourlySettings" :extend="hourlyExtend" height="200px" />
        </div>
        <div class="chart-card">
          <div class="card-title">近 7 天趋势</div>
          <ve-line :data="trendData" :settings="trendSettings" :extend="trendExtend" height="200px" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="14" :md="16">
        <div class="chart-card">
          <div class="card-title">热门搜索 TOP10</div>
          <div class="rank-list">
            <div v-if="!topList.length" class="empty-tip">暂无搜索数据</div>
            <div v-for="(item, idx) in topList" :key="idx" class="rank-item">
              <span :class="['rank-index', `rank-${idx + 1}`]">{{ idx + 1 }}</span>
              <div class="rank-text">
                <div class="rank-keyword">{{ item.keyword }}</div>
              </div>
              <div class="rank-value">
                <span class="value-num">{{ item.count }}</span>
                <span class="value-unit">次</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import VeHistogram from 'v-charts/lib/histogram'
import VeLine from 'v-charts/lib/line'
import { statSearchHistory } from '@/api/stat'

const COLORS = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#9B59B6', '#40C9C6', '#36A3F7', '#34BFA3']

export default {
  name: 'History',
  components: { VeHistogram, VeLine },
  data() {
    return {
      kpi: { totalCount: 0, keywordCount: 0, userCount: 0, dailyAvg: 0 },
      hourlyData: { columns: ['name', 'count'], rows: [] },
      hourlySettings: { labelMap: { count: '搜索数' } },
      hourlyExtend: {
        color: ['#409EFF'],
        series: { barWidth: 12, itemStyle: { borderRadius: [3, 3, 0, 0] } },
        xAxis: { axisLabel: { fontSize: 10, interval: 1 } },
        yAxis: { splitLine: { lineStyle: { color: '#F2F6FC' } } }
      },
      trendData: { columns: ['name', 'count'], rows: [] },
      trendSettings: { labelMap: { count: '搜索数' } },
      trendExtend: {
        color: ['#409EFF'],
        xAxis: { axisLabel: { fontSize: 11 } },
        yAxis: { splitLine: { lineStyle: { color: '#F2F6FC' } } },
        series: { smooth: true, areaStyle: { color: 'rgba(64,158,255,0.1)' } }
      },
      topList: []
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    formatNum(n) {
      return n == null ? '0' : Number(n).toLocaleString('zh-CN')
    },
    fetchData() {
      statSearchHistory().then(res => {
        const d = res.data.data || {}
        this.kpi = {
          totalCount: d.totalCount || 0,
          keywordCount: d.keywordCount || 0,
          userCount: d.userCount || 0,
          dailyAvg: d.dailyAvg || 0
        }
        this.topList = (d.topKeywords || []).map(r => ({
          keyword: r.keyword || '-', count: Number(r.count)
        }))
        this.hourlyData.rows = (d.hourlyDistribution || []).map(r => ({
          name: r.name, count: Number(r.count)
        }))
        this.trendData.rows = (d.dailyTrend || []).map(r => ({
          name: r.name, count: Number(r.count)
        }))
      }).catch(() => {
        this.$message.warning('获取搜索历史统计数据失败')
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.history-stats {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100%;
}

.kpi-strip {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px;
  padding: 16px 0;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.kpi-item {
  flex: 1;
  text-align: center;
  .kpi-num {
    display: block;
    font-size: 26px;
    font-weight: 700;
    color: #303133;
    line-height: 1.3;
    &.primary { color: #409eff; }
  }
  .kpi-label {
    display: block;
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
.kpi-divider {
  width: 1px;
  height: 32px;
  background: #ebeef5;
  flex-shrink: 0;
}

.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.rank-list {
  .empty-tip {
    text-align: center;
    padding: 40px 0;
    color: #909399;
    font-size: 13px;
  }
}
.rank-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  &:last-child { border-bottom: none; }
}
.rank-index {
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  border-radius: 50%;
  background: #f0f2f5;
  color: #909399;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
  &.rank-1 { background: #f56c6c; color: #fff; }
  &.rank-2 { background: #e6a23c; color: #fff; }
  &.rank-3 { background: #409eff; color: #fff; }
}
.rank-text {
  flex: 1;
  overflow: hidden;
  .rank-keyword {
    font-size: 15px;
    color: #303133;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.rank-value {
  flex-shrink: 0;
  margin-left: 12px;
  .value-num { font-size: 16px; font-weight: 700; color: #303133; }
  .value-unit { font-size: 12px; color: #909399; margin-left: 2px; }
}
</style>
