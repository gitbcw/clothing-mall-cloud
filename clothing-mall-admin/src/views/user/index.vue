<template>
  <div class="app-container member-center">
    <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
      <el-tab-pane label="会员管理" name="user">
        <user-list v-if="loadedTabs.user" />
      </el-tab-pane>
      <el-tab-pane label="商品收藏" name="collect">
        <collect-list v-if="loadedTabs.collect" />
      </el-tab-pane>
      <el-tab-pane label="浏览足迹" name="footprint">
        <footprint-list v-if="loadedTabs.footprint" />
      </el-tab-pane>
      <el-tab-pane label="搜索历史" name="history">
        <history-list v-if="loadedTabs.history" />
      </el-tab-pane>
      <el-tab-pane label="收货地址" name="address">
        <address-list v-if="loadedTabs.address" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import UserList from './user'
import CollectList from './collect'
import FootprintList from './footprint'
import HistoryList from './history'
import AddressList from './address'

export default {
  name: 'MemberCenter',
  components: { UserList, CollectList, FootprintList, HistoryList, AddressList },
  data() {
    return {
      activeTab: 'user',
      loadedTabs: { user: true, collect: false, footprint: false, history: false, address: false }
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
.member-center {
  ::v-deep .el-tabs__content { padding: 0; }
  ::v-deep .app-container { padding: 20px 0 0 0; }
}
</style>
