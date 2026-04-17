<template>
  <div class="collect-stats">
    <!-- 概览 -->
    <div class="kpi-strip">
      <div class="kpi-item">
        <span class="kpi-num primary">{{ formatNum(kpi.totalCount) }}</span>
        <span class="kpi-label">收藏总量</span>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <span class="kpi-num">{{ kpi.perUser }}</span>
        <span class="kpi-label">人均收藏</span>
      </div>
      <div class="kpi-divider" />
      <div class="kpi-item">
        <span class="kpi-num">{{ formatNum(kpi.goodsCount) }}</span>
        <span class="kpi-label">被收藏商品</span>
      </div>
    </div>

    <!-- 分类分布 + 价格偏好 + 热门收藏 -->
    <el-row :gutter="16">
      <el-col :xs="24" :sm="10" :md="8">
        <div class="chart-card">
          <div class="card-title">分类分布</div>
          <ve-pie :data="categoryData" :settings="categorySettings" :extend="pieExtend" height="280px" />
        </div>
        <div class="chart-card">
          <div class="card-title">价格偏好</div>
          <ve-histogram :data="priceData" :settings="priceSettings" :extend="priceExtend" height="200px" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="14" :md="16">
        <div class="chart-card">
          <div class="card-title">热门收藏 TOP10</div>
          <div class="rank-list">
            <div v-if="!topList.length" class="empty-tip">暂无收藏数据</div>
            <div v-for="(item, idx) in topList" :key="idx" class="rank-item">
              <span :class="['rank-index', `rank-${idx + 1}`]">{{ idx + 1 }}</span>
              <el-image v-if="item.picUrl" :src="imageUrl(item.picUrl)" :preview-src-list="[imageUrl(item.picUrl)]" class="rank-img" fit="cover" />
              <div v-else class="rank-img rank-img-empty" />
              <div class="rank-text">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-price">{{ item.price ? '¥' + Number(item.price).toFixed(0) : '' }}</div>
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
import VePie from 'v-charts/lib/pie'
import VeHistogram from 'v-charts/lib/histogram'
import { statCollect } from '@/api/stat'

const COLORS = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#9B59B6', '#40C9C6', '#36A3F7', '#34BFA3']

export default {
  name: 'Collect',
  components: { VePie, VeHistogram },
  data() {
    return {
      kpi: { totalCount: 0, perUser: 0, goodsCount: 0 },
      categoryData: { columns: ['name', 'count'], rows: [] },
      categorySettings: { radius: 90, offsetY: 140, labelMap: { count: '收藏数' } },
      pieExtend: {
        color: COLORS,
        legend: { bottom: 0, textStyle: { fontSize: 12, color: '#909399' } },
        series: { label: { fontSize: 11 } }
      },
      priceData: { columns: ['name', 'count'], rows: [] },
      priceSettings: { labelMap: { count: '收藏数' } },
      priceExtend: {
        color: ['#409EFF'],
        series: { barWidth: 24, itemStyle: { borderRadius: [3, 3, 0, 0] } },
        xAxis: { axisLabel: { fontSize: 11 } },
        yAxis: { splitLine: { lineStyle: { color: '#F2F6FC' } } }
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
      statCollect().then(res => {
        const d = res.data.data || {}
        this.kpi = {
          totalCount: d.totalCount || 0,
          perUser: d.perUser || 0,
          goodsCount: d.goodsCount || 0
        }
        this.topList = (d.topGoods || []).map(r => ({
          name: r.name || '-', picUrl: r.picUrl || '', price: r.price || 0, count: Number(r.count)
        }))
        this.categoryData.rows = (d.categoryDistribution || []).map(r => ({
          name: r.name || '未分类', count: Number(r.count)
        }))
        this.priceData.rows = (d.priceDistribution || []).map(r => ({
          name: r.name, count: Number(r.count)
        }))
      }).catch(() => {
        this.$message.warning('获取收藏统计数据失败')
      })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.collect-stats {
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
  padding: 10px 0;
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
.rank-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  margin-right: 10px;
  flex-shrink: 0;
  background: #f5f7fa;
  &.rank-img-empty { background: #f0f2f5; }
}
.rank-text {
  flex: 1;
  overflow: hidden;
  .rank-name {
    font-size: 14px;
    color: #303133;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rank-price {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
  }
}
.rank-value {
  flex-shrink: 0;
  margin-left: 12px;
  .value-num { font-size: 16px; font-weight: 700; color: #303133; }
  .value-unit { font-size: 12px; color: #909399; margin-left: 2px; }
}
</style>
