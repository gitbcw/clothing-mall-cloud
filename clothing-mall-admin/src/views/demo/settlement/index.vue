<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="结算概览" name="overview">
        <overview />
      </el-tab-pane>
      <el-tab-pane label="结算单管理" name="statement">
        <statement-list />
      </el-tab-pane>
      <el-tab-pane label="待结算明细" name="pending">
        <pending-list />
      </el-tab-pane>
      <el-tab-pane label="打款记录" name="payment">
        <payment-records />
      </el-tab-pane>
      <el-tab-pane label="结算设置" name="settings">
        <settings />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import Overview from './components/Overview'
import StatementList from './components/StatementList'
import PendingList from './components/PendingList'
import PaymentRecords from './components/PaymentRecords'
import Settings from './components/Settings'

export default {
  name: 'SettlementCenter',
  components: {
    Overview,
    StatementList,
    PendingList,
    PaymentRecords,
    Settings
  },
  data() {
    return {
      activeTab: 'overview'
    }
  }
}
</script>
