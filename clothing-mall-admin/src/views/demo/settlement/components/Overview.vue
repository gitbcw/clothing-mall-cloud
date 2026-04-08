<template>
  <div class="settlement-overview">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover" class="box-card">
          <div slot="header" class="clearfix">
            <span>本期应结</span>
            <el-tag type="success" size="mini" style="float: right;">实时</el-tag>
          </div>
          <div class="text-item amount">¥ 1,245,678.00</div>
          <div class="text-item desc">包含待确认和待打款金额</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="box-card">
          <div slot="header" class="clearfix">
            <span>待结算 (未出账)</span>
          </div>
          <div class="text-item amount">¥ 345,120.50</div>
          <div class="text-item desc">当前周期内累计交易额</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="box-card">
          <div slot="header" class="clearfix">
            <span>冻结金额</span>
            <el-tooltip content="因售后或风控原因冻结的资金" placement="top">
              <i class="el-icon-info" style="float: right; color: #909399;" />
            </el-tooltip>
          </div>
          <div class="text-item amount">¥ 12,000.00</div>
          <div class="text-item desc">涉及 15 笔订单</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="box-card">
          <div slot="header" class="clearfix">
            <span>已结算总额</span>
          </div>
          <div class="text-item amount">¥ 58,920,330.00</div>
          <div class="text-item desc">本年度累计</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <div slot="header">
            <span>近7日结算趋势</span>
          </div>
          <div style="height: 300px;">
            <ve-histogram :data="trendData" :settings="trendSettings" :extend="trendExtend" height="300px" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <div slot="header">
            <span>费用构成</span>
          </div>
          <div style="height: 300px;">
            <ve-ring :data="ringData" :settings="ringSettings" height="300px" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card shadow="hover">
          <div slot="header">
            <span>结算状态汇总</span>
          </div>
          <div class="status-summary">
            <div class="item"><span class="label">待结</span><span class="value">126</span></div>
            <div class="item"><span class="label">冻结</span><span class="value">15</span></div>
            <div class="item"><span class="label">已结</span><span class="value">432</span></div>
            <div class="item"><span class="label">冲正</span><span class="value">8</span></div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import VeHistogram from 'v-charts/lib/histogram.common'
import VeRing from 'v-charts/lib/ring.common'

export default {
  name: 'SettlementOverview',
  components: { VeHistogram, VeRing },
  data() {
    return {
      trendData: {
        columns: ['date', 'amount', 'count'],
        rows: [
          { 'date': '10-01', 'amount': 12000, 'count': 120 },
          { 'date': '10-02', 'amount': 15200, 'count': 140 },
          { 'date': '10-03', 'amount': 18000, 'count': 160 },
          { 'date': '10-04', 'amount': 13400, 'count': 110 },
          { 'date': '10-05', 'amount': 21000, 'count': 180 },
          { 'date': '10-06', 'amount': 19500, 'count': 175 },
          { 'date': '10-07', 'amount': 24000, 'count': 210 }
        ]
      },
      trendSettings: {
        labelMap: {
          'amount': '结算金额',
          'count': '订单数'
        },
        axisSite: { right: ['count'] },
        yAxisType: ['normal', 'normal']
      },
      trendExtend: {
        series: {
          label: { show: true, position: 'top' }
        }
      },
      ringData: {
        columns: ['type', 'money'],
        rows: [
          { 'type': '货款支出', 'money': 500000 },
          { 'type': '平台毛利', 'money': 120000 },
          { 'type': '售后退款', 'money': 12000 },
          { 'type': '营销补贴', 'money': 8000 }
        ]
      },
      ringSettings: {
        radius: [50, 100],
        offsetY: 150
      }
    }
  }
}
</script>

<style scoped>
.amount {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 10px;
}
.desc {
  font-size: 12px;
  color: #909399;
}
.status-summary {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 80px;
}
.status-summary .item {
  text-align: center;
}
.status-summary .label {
  display: block;
  color: #909399;
  margin-bottom: 6px;
}
.status-summary .value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}
</style>
