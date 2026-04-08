<template>
  <div class="app-container promotion-index">
    <coupon />
  </div>
</template>

<script>
import Coupon from './coupon.vue'

export default {
  name: 'PromotionIndex',
  components: {
    Coupon
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.promotion-index {
  // 子页面样式覆盖
  ::v-deep .app-container {
    padding: 20px 0 0 0;
  }
}
</style>
