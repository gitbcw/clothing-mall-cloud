<template>
  <div class="app-container">
    <!-- 年份筛选 -->
    <el-card class="filter-card">
      <div class="filter-row">
        <span class="filter-label">选择年份：</span>
        <el-date-picker
          v-model="selectedYear"
          type="year"
          placeholder="选择年份"
          value-format="yyyy"
          @change="handleYearChange"
        />
        <el-radio-group v-model="quickYear" size="small" @change="handleQuickYear">
          <el-radio-button label="thisYear">今年</el-radio-button>
          <el-radio-button label="lastYear">去年</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <!-- 季节概览 -->
    <el-row :gutter="20" class="season-overview">
      <el-col v-for="season in seasons" :key="season.key" :xs="24" :sm="12">
        <el-card class="season-card" :class="season.key" shadow="hover" @click.native="selectSeason(season.key)">
          <div class="season-icon">{{ season.icon }}</div>
          <div class="season-name">{{ season.name }}</div>
          <div class="season-amount">{{ formatMoney(seasonData[season.key].amount) }}</div>
          <div class="season-orders">{{ seasonData[season.key].orders }} 订单</div>
          <div class="season-growth" :class="seasonData[season.key].growth >= 0 ? 'up' : 'down'">
            {{ seasonData[season.key].growth >= 0 ? '↑' : '↓' }} {{ Math.abs(seasonData[season.key].growth) }}%
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 季节对比图表 -->
    <el-card class="chart-card">
      <div slot="header" class="chart-header">
        <span>季节销售对比</span>
        <el-radio-group v-model="chartMetric" size="mini">
          <el-radio-button label="amount">销售额</el-radio-button>
          <el-radio-button label="orders">订单数</el-radio-button>
        </el-radio-group>
      </div>
      <ve-bar :data="seasonChartData" :settings="seasonChartSettings" height="300px" />
    </el-card>

    <!-- 季节详细数据 -->
    <el-card class="detail-card">
      <div slot="header">季节销售明细</div>
      <el-table :data="seasonDetailData" border>
        <el-table-column prop="season" label="季节" width="100">
          <template slot-scope="scope">
            <span class="season-tag" :class="scope.row.seasonKey">{{ scope.row.season }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="months" label="月份" width="120" />
        <el-table-column prop="orders" label="订单数" width="100" align="right" />
        <el-table-column label="销售额" align="right">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="goodsCount" label="在售商品" width="100" align="right" />
        <el-table-column label="Top 商品" min-width="180">
          <template slot-scope="scope">
            {{ scope.row.topGoods }}
          </template>
        </el-table-column>
        <el-table-column label="同比变化" width="100" align="right">
          <template slot-scope="scope">
            <span :class="scope.row.yoyGrowth >= 0 ? 'growth-up' : 'growth-down'">
              {{ scope.row.yoyGrowth >= 0 ? '+' : '' }}{{ scope.row.yoyGrowth }}%
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 当季热销商品 -->
    <el-card class="hot-goods-card">
      <div slot="header">{{ currentSeasonName }}热销商品 Top 10</div>
      <el-table :data="hotGoodsData" border size="small">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="name" label="商品名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="sales" label="销量" width="80" align="right" />
        <el-table-column label="销售额" width="120" align="right">
          <template slot-scope="scope">
            {{ formatMoney(scope.row.amount) }}
          </template>
        </el-table-column>
        <el-table-column label="占季节比" width="100" align="right">
          <template slot-scope="scope">
            {{ scope.row.percent }}%
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import VeBar from 'v-charts/lib/bar'
import { statRevenueSeasonOverview, statRevenueSeasonHotGoods } from '@/api/stat'

export default {
  name: 'StatSeason',
  components: { VeBar },
  data() {
    return {
      selectedYear: '2026',
      quickYear: 'thisYear',
      currentSeason: 'spring',
      seasons: [
        { key: 'spring', name: '春季', icon: '🌸', months: '3-5月' },
        { key: 'winter', name: '冬季', icon: '❄️', months: '12-2月' }
      ],
      seasonData: {
        spring: { amount: 0, orders: 0, growth: 0 },
        winter: { amount: 0, orders: 0, growth: 0 }
      },
      chartMetric: 'amount',
      seasonChartData: {
        columns: ['season', 'amount', 'orders'],
        rows: []
      },
      seasonChartSettings: {
        labelMap: { amount: '销售额', orders: '订单数' },
        metrics: ['amount']
      },
      seasonDetailData: [],
      hotGoodsData: []
    }
  },
  computed: {
    currentSeasonName() {
      const season = this.seasons.find(s => s.key === this.currentSeason)
      return season ? season.name : '春季'
    }
  },
  watch: {
    chartMetric(val) {
      this.seasonChartSettings.metrics = [val]
    }
  },
  created() {
    this.initYear()
    this.fetchData()
  },
  methods: {
    initYear() {
      this.selectedYear = String(new Date().getFullYear())
    },
    handleYearChange() {
      this.quickYear = ''
      this.fetchData()
    },
    handleQuickYear(value) {
      const year = new Date().getFullYear()
      this.selectedYear = value === 'thisYear' ? String(year) : String(year - 1)
      this.fetchData()
    },
    selectSeason(key) {
      this.currentSeason = key
      this.loadHotGoodsData()
    },
    fetchData() {
      const year = parseInt(this.selectedYear)
      // 获取季节概览
      statRevenueSeasonOverview({ year }).then(response => {
        const data = response.data.data || {}
        const chartData = data.chartData || []

        // 季节概览数据
        this.seasonData = {
          spring: data.spring || { amount: 0, orders: 0, growth: 0 },
          winter: data.winter || { amount: 0, orders: 0, growth: 0 }
        }

        // 图表数据
        this.seasonChartData.rows = chartData.map(item => ({
          season: item.season === 'spring' ? '春季' : '冬季',
          amount: item.amount || 0,
          orders: item.orders || 0
        }))

        // 明细数据
        this.seasonDetailData = [
          {
            seasonKey: 'spring',
            season: '春季',
            months: '3-5月',
            orders: this.seasonData.spring.orders || 0,
            amount: this.seasonData.spring.amount || 0,
            goodsCount: 0,
            topGoods: '-',
            yoyGrowth: this.seasonData.spring.growth || 0
          },
          {
            seasonKey: 'winter',
            season: '冬季',
            months: '12-2月',
            orders: this.seasonData.winter.orders || 0,
            amount: this.seasonData.winter.amount || 0,
            goodsCount: 0,
            topGoods: '-',
            yoyGrowth: this.seasonData.winter.growth || 0
          }
        ]

        // 加载热销商品
        this.loadHotGoodsData()
      }).catch(() => {
        this.loadMockData()
        this.$message.warning('数据加载失败，当前显示为模拟数据')
      })
    },
    loadHotGoodsData() {
      const year = parseInt(this.selectedYear)
      statRevenueSeasonHotGoods({ year, season: this.currentSeason, limit: 10 }).then(response => {
        this.hotGoodsData = response.data.data || []
      }).catch(() => {
        this.loadMockHotGoodsData()
      })
    },
    loadMockData() {
      // 季节数据
      this.seasonData = {
        spring: { amount: 458000, orders: 1280, growth: 18.5 },
        winter: { amount: 512000, orders: 1420, growth: 25.8 }
      }

      // 图表数据
      this.seasonChartData.rows = [
        { season: '春季', amount: 458000, orders: 1280 },
        { season: '冬季', amount: 512000, orders: 1420 }
      ]

      // 明细数据
      this.seasonDetailData = [
        {
          seasonKey: 'spring',
          season: '春季',
          months: '3-5月',
          orders: 1280,
          amount: 458000,
          goodsCount: 156,
          topGoods: '春日碎花连衣裙、轻薄针织衫',
          yoyGrowth: 18.5
        },
        {
          seasonKey: 'winter',
          season: '冬季',
          months: '12-2月',
          orders: 1420,
          amount: 512000,
          goodsCount: 168,
          topGoods: '羊毛大衣、加绒卫衣',
          yoyGrowth: 25.8
        }
      ]

      this.loadMockHotGoodsData()
    },
    loadMockHotGoodsData() {
      const allHotGoods = {
        spring: [
          { name: '春日碎花连衣裙', category: '连衣裙', sales: 286, amount: 85800, percent: 18.7 },
          { name: '法式轻薄针织衫', category: '针织衫', sales: 245, amount: 61250, percent: 13.4 },
          { name: '高腰A字半身裙', category: '半身裙', sales: 198, amount: 39600, percent: 8.6 },
          { name: '清新条纹衬衫', category: '衬衫', sales: 176, amount: 35200, percent: 7.7 },
          { name: '百搭牛仔外套', category: '外套', sales: 156, amount: 46800, percent: 10.2 },
          { name: '舒适棉麻T恤', category: 'T恤', sales: 320, amount: 32000, percent: 7.0 },
          { name: '雪纺荷叶边上衣', category: '衬衫', sales: 145, amount: 29000, percent: 6.3 },
          { name: '休闲阔腿裤', category: '裤装', sales: 132, amount: 26400, percent: 5.8 },
          { name: '小香风短外套', category: '外套', sales: 98, amount: 29400, percent: 6.4 },
          { name: '复古波点裙', category: '连衣裙', sales: 88, amount: 26400, percent: 5.8 }
        ],
        winter: [
          { name: '羊毛双面大衣', category: '大衣', sales: 286, amount: 286000, percent: 55.9 },
          { name: '加绒加厚卫衣', category: '卫衣', sales: 320, amount: 64000, percent: 12.5 },
          { name: '保暖羽绒服', category: '羽绒服', sales: 198, amount: 158400, percent: 30.9 },
          { name: '加绒打底裤', category: '裤装', sales: 420, amount: 42000, percent: 8.2 },
          { name: '高领毛衣', category: '毛衣', sales: 156, amount: 46800, percent: 9.1 },
          { name: '羽绒马甲', category: '马甲', sales: 145, amount: 43500, percent: 8.5 },
          { name: '毛呢短外套', category: '外套', sales: 132, amount: 52800, percent: 10.3 },
          { name: '加厚保暖内衣', category: '内衣', sales: 380, amount: 38000, percent: 7.4 },
          { name: '羊绒围巾', category: '配饰', sales: 210, amount: 42000, percent: 8.2 },
          { name: '皮质手套', category: '配饰', sales: 185, amount: 37000, percent: 7.2 }
        ]
      }

      this.hotGoodsData = allHotGoods[this.currentSeason] || allHotGoods.spring
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
  .filter-label {
    color: #606266;
    font-size: 14px;
  }
}

.season-overview {
  margin-bottom: 20px;
}

.season-card {
  text-align: center;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-3px);
  }

  .season-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .season-name {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }

  .season-amount {
    font-size: 20px;
    font-weight: bold;
    color: #409EFF;
    margin-bottom: 4px;
  }

  .season-orders {
    font-size: 13px;
    color: #909399;
    margin-bottom: 8px;
  }

  .season-growth {
    font-size: 13px;
    font-weight: 500;

    &.up {
      color: #67C23A;
    }

    &.down {
      color: #F56C6C;
    }
  }

  &.spring {
    border-top: 3px solid #F56C6C;
  }

  &.winter {
    border-top: 3px solid #409EFF;
  }
}

.chart-card, .detail-card, .hot-goods-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.season-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.spring {
    background: #fef0f0;
    color: #F56C6C;
  }

  &.winter {
    background: #ecf5ff;
    color: #409EFF;
  }
}

.growth-up {
  color: #67C23A;
}

.growth-down {
  color: #F56C6C;
}
</style>
