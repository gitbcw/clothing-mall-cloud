<template>
  <div class="settlement-statement-list">
    <div class="filter-container">
      <el-input v-model="listQuery.orderSn" placeholder="结算单号" style="width: 200px;" class="filter-item" />
      <el-select v-model="listQuery.status" placeholder="状态" clearable class="filter-item" style="width: 130px">
        <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-date-picker v-model="listQuery.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="filter-item" />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">搜索</el-button>
    </div>

    <el-table :data="list" border fit highlight-current-row style="width: 100%">
      <el-table-column align="center" label="结算单号" prop="id" width="180" />
      <el-table-column align="center" label="供应商" prop="supplier" />
      <el-table-column align="center" label="结算周期" prop="period" width="200" />
      <el-table-column align="center" label="订单数" prop="orderCount" width="100" />
      <el-table-column align="center" label="结算状态" prop="settlementStatus" width="120">
        <template slot-scope="scope">
          <el-tag size="mini">{{ scope.row.settlementStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="总金额" prop="totalAmount" width="120">
        <template slot-scope="scope">¥{{ scope.row.totalAmount }}</template>
      </el-table-column>
      <el-table-column align="center" label="应付金额" prop="payableAmount" width="120">
        <template slot-scope="scope">
          <span style="color: #f56c6c; font-weight: bold;">¥{{ scope.row.payableAmount }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="流程状态" prop="status" width="100">
        <template slot-scope="scope">
          <el-tag :type="statusTag(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="230" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleDetail(scope.row)">详情</el-button>
          <el-button v-if="scope.row.status === '待审核'" size="mini" type="success" @click="handleAudit(scope.row)">审核</el-button>
          <el-button v-if="scope.row.status === '待打款'" size="mini" type="warning" @click="handlePay(scope.row)">打款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Detail Dialog -->
    <el-dialog title="结算单详情" :visible.sync="dialogVisible" width="70%">
      <div v-if="currentDetail">
        <el-descriptions title="基本信息" border>
          <el-descriptions-item label="结算单号">{{ currentDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ currentDetail.supplier }}</el-descriptions-item>
          <el-descriptions-item label="流程状态">{{ currentDetail.status }}</el-descriptions-item>
          <el-descriptions-item label="结算状态">{{ currentDetail.settlementStatus }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">2023-10-01 12:00:00</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">入账规则</el-divider>
        <el-descriptions border>
          <el-descriptions-item label="结算模式">{{ currentDetail.rule.modeName }}</el-descriptions-item>
          <el-descriptions-item label="结算周期">{{ currentDetail.rule.cycleName }}</el-descriptions-item>
          <el-descriptions-item label="售后冻结期">{{ currentDetail.rule.frozenDays }}天</el-descriptions-item>
          <el-descriptions-item label="口径说明">{{ currentDetail.rule.ruleDesc }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">状态时间线</el-divider>
        <el-steps :active="currentDetail.timeline.length" finish-status="success" align-center>
          <el-step v-for="(t, idx) in currentDetail.timeline" :key="idx" :title="t.title" :description="t.time" :status="t.status" />
        </el-steps>

        <el-divider content-position="left">费用明细</el-divider>
        <el-row :gutter="20">
          <el-col :span="6"><div class="stat-box">销售总额: ¥{{ currentDetail.totalAmount }}</div></el-col>
          <el-col :span="6"><div class="stat-box">供货价总额: ¥{{ currentDetail.supplyCostTotal }}</div></el-col>
          <el-col :span="6"><div class="stat-box">售后退款: -¥{{ currentDetail.refund }}</div></el-col>
          <el-col :span="6"><div class="stat-box final">应付金额(货款): ¥{{ currentDetail.payableAmount }}</div></el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top: 10px;">
          <el-col :span="6"><div class="stat-box">平台毛利: ¥{{ currentDetail.platformProfit }}</div></el-col>
        </el-row>

        <el-divider content-position="left">包含订单</el-divider>
        <div class="filter-container" style="margin-bottom: 10px;">
          <el-input v-model="orderFilterText" placeholder="按订单编号筛选" style="width: 200px;" class="filter-item" />
          <el-button class="filter-item" type="primary" @click="applyOrderFilter">筛选</el-button>
        </div>
        <el-table :data="pagedOrders" border size="small">
          <el-table-column prop="orderSn" label="订单编号" />
          <el-table-column prop="amount" label="销售额" />
          <el-table-column prop="supplyCost" label="供货价" />
          <el-table-column prop="settleAmount" label="结算金额(货款)" />
          <el-table-column prop="profit" label="平台毛利" />
          <el-table-column prop="judgeReason" label="入账判定" />
          <el-table-column prop="time" label="成交时间" />
        </el-table>
        <div style="text-align: right; margin-top: 10px;">
          <el-pagination
            background
            layout="prev, pager, next, sizes, total"
            :total="filteredOrders.length"
            :page-sizes="[5, 10, 20, 50]"
            :page-size="ordersPageSize"
            :current-page="ordersPage"
            @current-change="ordersPage = $event"
            @size-change="ordersPageSize = $event"
          />
        </div>

        <el-divider content-position="left">打款批次</el-divider>
        <el-table :data="currentDetail.paymentBatches" border size="small">
          <el-table-column prop="batchNo" label="批次号" />
          <el-table-column prop="channel" label="渠道" />
          <el-table-column prop="amount" label="金额" />
          <el-table-column prop="status" label="状态" />
          <el-table-column prop="failureReason" label="失败原因" />
          <el-table-column prop="time" label="时间" />
        </el-table>

        <el-divider content-position="left">调整记录</el-divider>
        <el-table :data="currentDetail.adjustments" border size="small">
          <el-table-column prop="type" label="类型" />
          <el-table-column prop="orderSn" label="来源订单" />
          <el-table-column prop="reason" label="原因" />
          <el-table-column prop="amount" label="金额" />
          <el-table-column prop="time" label="时间" />
        </el-table>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportCsv">下载对账单</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'StatementList',
  data() {
    return {
      list: [],
      listQuery: {
        orderSn: '',
        status: '',
        dateRange: []
      },
      statusOptions: [
        { label: '草稿', value: '草稿' },
        { label: '待审核', value: '待审核' },
        { label: '待打款', value: '待打款' },
        { label: '已完成', value: '已完成' }
      ],
      dialogVisible: false,
      currentDetail: null,
      orderFilterText: '',
      ordersPage: 1,
      ordersPageSize: 5
    }
  },
  computed: {
    filteredOrders() {
      if (!this.currentDetail) return []
      const list = this.currentDetail.orders || []
      const q = (this.orderFilterText || '').trim()
      if (!q) return list
      return list.filter(o => String(o.orderSn).includes(q))
    },
    pagedOrders() {
      const start = (this.ordersPage - 1) * this.ordersPageSize
      return this.filteredOrders.slice(start, start + this.ordersPageSize)
    }
  },
  created() {
    this.generateMockData()
  },
  methods: {
    generateMockData() {
      const data = []
      const statuses = ['草稿', '待审核', '待打款', '已完成', '已作废']
      const settleStatuses = ['待结', '冻结', '已结', '冲正']
      let settings = { mode: 'consignment', cycle: 'month', commissionRate: 5, frozenDays: 7 }
      const raw = localStorage.getItem('demo_settlement_settings')
      if (raw) {
        try {
          const s = JSON.parse(raw)
          settings = Object.assign(settings, { mode: s.mode, cycle: s.cycle, commissionRate: s.commissionRate, frozenDays: s.frozenDays })
        } catch (e) {}
      }
      const cycleNameMap = { month: '月结', week: '周结', t1: 'T+1' }
      for (let i = 1; i <= 10; i++) {
        const orders = []
        for (let k = 0; k < 25; k++) {
          const amt = (Math.random() * 1500 + 50).toFixed(2)
          const supply = (amt * 0.75).toFixed(2)
          const profit = (amt - supply).toFixed(2)
          const settle = supply
          const reasonIdx = k % 3
          const reason = reasonIdx === 0 ? '订单完成入账' : reasonIdx === 1 ? '售后中冻结' : '订单完成超冻结期入账'
          orders.push({
            orderSn: 'ORD' + (8000 + i * 100 + k),
            amount: amt,
            supplyCost: supply,
            settleAmount: settle,
            profit,
            judgeReason: reason,
            time: '2023-09-' + String(10 + (k % 20)).padStart(2, '0')
          })
        }
        const supplyTotal = orders.reduce((sum, o) => sum + Number(o.supplyCost), 0).toFixed(2)
        const salesTotal = orders.reduce((sum, o) => sum + Number(o.amount), 0).toFixed(2)
        const profitTotal = (Number(salesTotal) - Number(supplyTotal)).toFixed(2)
        const statement = {
          id: 'SET' + (20231000 + i),
          supplier: '供应商 ' + String.fromCharCode(65 + i),
          period: '2023-09-01 ~ 2023-09-30',
          orderCount: orders.length,
          totalAmount: salesTotal,
          supplyCostTotal: supplyTotal,
          platformProfit: profitTotal,
          refund: (Math.random() * 2000).toFixed(2),
          payableAmount: (Number(supplyTotal) - Number(this.randomRefundAdjust())).toFixed(2),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          settlementStatus: settleStatuses[Math.floor(Math.random() * settleStatuses.length)],
          orders,
          rule: {
            modeName: settings.mode === 'consignment' ? '平台代销（按供货价结算）' : '佣金分成',
            cycleName: cycleNameMap[settings.cycle],
            frozenDays: settings.frozenDays,
            ruleDesc: settings.mode === 'consignment'
              ? '平台代销：按订单供货价入账为货款，订单完成后进入冻结期，超期未售后入账；售后退款冲减货款'
              : '订单完成后进入冻结期，超期未售后入账；按佣金比例扣除后结算'
          },
          timeline: [
            { title: '待结', time: '2023-10-01 09:00', status: 'finish' },
            { title: '冻结', time: '2023-10-02 12:00', status: 'finish' },
            { title: '已结', time: '2023-10-08 10:00', status: 'process' }
          ],
          paymentBatches: [
            { batchNo: 'PAY20231015' + i, channel: '银行转账', amount: (Math.random() * 10000).toFixed(2), status: i % 2 === 0 ? '成功' : '失败', failureReason: i % 2 === 0 ? '' : '账户信息校验失败', time: '2023-10-15 10:00:00' }
          ],
          adjustments: [
            { type: '退款', orderSn: 'ORD' + (8002 + i), reason: '用户申请退款', amount: '-' + (Math.random() * 200).toFixed(2), time: '2023-10-06 11:00' },
            { type: '冲正', orderSn: 'ORD' + (8002 + i), reason: '退款冲正入账', amount: (Math.random() * 200).toFixed(2), time: '2023-10-07 11:30' }
          ]
        }
        data.push(statement)
      }
      this.list = data
    },
    randomRefundAdjust() {
      return (Math.random() * 2000).toFixed(2)
    },
    applyOrderFilter() {
      this.ordersPage = 1
    },
    statusTag(status) {
      const map = {
        '已完成': 'success',
        '待打款': 'warning',
        '待审核': 'primary',
        '草稿': 'info',
        '已作废': 'danger'
      }
      return map[status]
    },
    handleFilter() {
      this.$message('模拟搜索...')
    },
    handleDetail(row) {
      this.currentDetail = row
      this.dialogVisible = true
    },
    handleAudit(row) {
      this.$confirm('确认审核通过?', '提示').then(() => {
        row.status = '待打款'
        this.$message.success('审核通过')
      })
    },
    handlePay(row) {
      this.$confirm('确认打款?', '提示').then(() => {
        row.status = '已完成'
        this.$message.success('打款成功')
      })
    },
    exportCsv() {
      if (!this.currentDetail) return
      const s = this.currentDetail
      const rows = []
      rows.push(['结算单号', s.id])
      rows.push(['供应商', s.supplier])
      rows.push(['结算周期', s.period])
      rows.push(['结算状态', s.settlementStatus])
      rows.push(['流程状态', s.status])
      rows.push(['销售总额', s.totalAmount])
      rows.push(['供货价总额', s.supplyCostTotal])
      rows.push(['平台毛利', s.platformProfit])
      rows.push(['售后退款', s.refund])
      rows.push(['应付金额', s.payableAmount])
      rows.push([])
      rows.push(['入账规则'])
      rows.push(['结算模式', s.rule.modeName])
      rows.push(['结算周期', s.rule.cycleName])
      rows.push(['售后冻结期(天)', s.rule.frozenDays])
      rows.push(['口径说明', s.rule.ruleDesc])
      rows.push([])
      rows.push(['订单编号', '销售额', '供货价', '结算金额(货款)', '平台毛利', '入账判定', '成交时间'])
      s.orders.forEach(o => {
        rows.push([o.orderSn, o.amount, o.supplyCost, o.settleAmount, o.profit, o.judgeReason, o.time])
      })
      rows.push([])
      rows.push(['打款批次', '渠道', '金额', '状态', '失败原因', '时间'])
      s.paymentBatches.forEach(p => {
        rows.push([p.batchNo, p.channel, p.amount, p.status, p.failureReason, p.time])
      })
      rows.push([])
      rows.push(['调整类型', '来源订单', '原因', '金额', '时间'])
      s.adjustments.forEach(a => {
        rows.push([a.type, a.orderSn, a.reason, a.amount, a.time])
      })
      const csvContent = rows.map(r => r.map(x => `"${String(x || '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', s.id + '.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
</script>

<style scoped>
.stat-box {
  padding: 15px;
  background: #f0f2f5;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
}
.final {
  background: #e1f3d8;
  color: #67c23a;
}
</style>
