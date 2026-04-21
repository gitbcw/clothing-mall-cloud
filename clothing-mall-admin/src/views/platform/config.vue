<template>
  <div class="app-container platform-config">
    <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
      <el-tab-pane label="用户优惠" name="promotion-rules">
        <promotion-rules v-if="loadedTabs['promotion-rules']" />
      </el-tab-pane>
      <el-tab-pane label="订单和运费" name="rule">
        <rule-config v-if="loadedTabs.rule" />
      </el-tab-pane>
      <el-tab-pane label="优惠券管理" name="promotion">
        <promotion-index v-if="loadedTabs.promotion" />
      </el-tab-pane>
      <!-- 搜索关键词：隐藏，小程序搜索用搜索历史自动生成热门词，无需手动管理 -->
      <!-- <el-tab-pane label="搜索关键词" name="keyword">
        <keyword-manage v-if="loadedTabs.keyword" />
      </el-tab-pane> -->
      <el-tab-pane label="通用问题" name="issue">
        <issue-manage v-if="loadedTabs.issue" />
      </el-tab-pane>
      <el-tab-pane label="客服设置" name="service">
        <service-config v-if="loadedTabs.service" />
      </el-tab-pane>
      <el-tab-pane label="快递公司" name="shipper">
        <shipper-manage v-if="loadedTabs.shipper" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import RuleConfig from '@/views/config/rule'
import PromotionIndex from '@/views/promotion/index'
import PromotionRules from '@/views/config/promotion-rules'
import ServiceConfig from '@/views/config/service'
import IssueManage from '@/views/mall/issue'
import KeywordManage from '@/views/mall/keyword'
import ShipperManage from '@/views/platform/shipper'

export default {
  name: 'PlatformConfig',
  components: { RuleConfig, PromotionIndex, PromotionRules, ServiceConfig, IssueManage, KeywordManage, ShipperManage },
  data() {
    return {
      activeTab: 'promotion-rules',
      loadedTabs: { rule: true, promotion: false, 'promotion-rules': true, service: false, issue: false, keyword: false, shipper: false }
    }
  },
  methods: {
    handleTabClick(tab) {
      this.$set(this.loadedTabs, tab.name, true)
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.platform-config {
  ::v-deep .el-tabs__content { padding: 0; }
  ::v-deep .app-container { padding: 20px 0 0 0; }
}
</style>
