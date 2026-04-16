<template>
  <div class="app-container">

    <!-- 查询和其他操作 -->
    <div class="filter-container">
      <el-input v-model="listQuery.username" clearable class="filter-item" style="width: 200px;" :placeholder="$t('user_user.placeholder.filter_username')" />
      <el-input v-model="listQuery.mobile" clearable class="filter-item" style="width: 200px;" :placeholder="$t('user_user.placeholder.filter_mobile')" />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">{{ $t('app.button.search') }}</el-button>
      <el-button :loading="downloadLoading" class="filter-item" type="primary" icon="el-icon-download" @click="handleDownload">{{ $t('app.button.download') }}</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="list" :element-loading-text="$t('app.message.list_loading')" border fit highlight-current-row>
      <!-- 隐藏用户ID列 -->
      <!-- <el-table-column align="center" width="100px" :label="$t('user_user.table.id')" prop="id" sortable /> -->

      <el-table-column align="center" :label="$t('user_user.table.nickname')" prop="nickname" />

      <el-table-column align="center" :label="$t('user_user.table.avatar')" width="80">
        <template slot-scope="scope">
          <el-avatar :src="imageUrl(scope.row.avatar)" />
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('user_user.table.mobile')" prop="mobile" />

      <el-table-column align="center" :label="$t('user_user.table.gender')" prop="gender">
        <template slot-scope="scope">
          <el-tag>{{ genderDic[scope.row.gender] }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('user_user.table.birthday')" prop="birthday">
        <template slot-scope="scope">
          <span>{{ scope.row.birthday ? scope.row.birthday.substring(0, 10) : '' }}</span>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('user_user.table.status')" prop="status">
        <template slot-scope="scope">
          <el-tag>{{ statusDic[scope.row.status] }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="角色" prop="role">
        <template slot-scope="scope">
          <span>{{ roleMap[scope.row.role] || '普通用户' }}</span>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('user_user.table.actions')" width="250" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleDetail(scope.row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />
    <!-- 用户编辑对话框 -->
    <el-dialog :visible.sync="userDialogVisible" :title="$t('user_user.dialog.edit')">
      <el-form ref="userDetail" :model="userDetail" status-icon label-position="left" label-width="100px" style="width: 400px; margin-left:50px;">
        <el-form-item :label="$t('user_user.form.username')" prop="username">
          <el-input v-model="userDetail.username" :disabled="true" />
        </el-form-item>
        <el-form-item :label="$t('user_user.form.nickname')" prop="nickname">
          <el-input v-model="userDetail.nickname" />
        </el-form-item>
        <el-form-item :label="$t('user_user.form.mobile')" prop="mobile">
          <el-input v-model="userDetail.mobile" />
        </el-form-item>
        <el-form-item :label="$t('user_user.form.gender')" prop="gender">
          <el-select v-model="userDetail.gender" :placeholder="$t('user_user.placeholder.gender')"><el-option v-for="(item, index) in genderDic" :key="index" :label="item" :value="index" /></el-select>
        </el-form-item>
        <el-form-item :label="$t('user_user.form.status')" prop="status">
          <el-select v-model="userDetail.status" :placeholder="$t('user_user.placeholder.status')"><el-option v-for="(item, index) in statusDic" :key="index" :label="item" :value="index" /></el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userDetail.role" placeholder="请选择角色" style="width: 100%;">
            <el-option v-for="(label, value) in roleMap" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="userDialogVisible = false">{{ $t('app.button.cancel') }}</el-button>
        <el-button type="primary" @click="handleUserUpdate">{{ $t('app.button.confirm') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { fetchList, userDetail, updateUser } from '@/api/user'
import Pagination from '@/components/Pagination' // Secondary package based on el-pagination

export default {
  name: 'User',
  components: { Pagination },
  data() {
    return {
      list: null,
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        username: undefined,
        mobile: undefined,
        sort: 'add_time',
        order: 'desc'
      },
      downloadLoading: false,
      genderDic: ['未知', '男', '女'],
      statusDic: ['可用', '禁用', '注销'],
      roleMap: { user: '普通用户', owner: '店主', guide: '导购' },
      userDialogVisible: false,
      userDetail: {
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true
      fetchList(this.listQuery).then(response => {
        this.list = response.data.data.list
        this.total = response.data.data.total
        this.listLoading = false
      }).catch(() => {
        this.list = []
        this.total = 0
        this.listLoading = false
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    handleDownload() {
      this.downloadLoading = true
      import('@/vendor/Export2Excel').then(excel => {
        const tHeader = ['会员名称', '手机号码', '性别', '生日', '状态']
        const filterVal = ['nickname', 'mobile', 'gender', 'birthday', 'status']
        excel.export_json_to_excel2(tHeader, this.list, filterVal, '会员信息')
        this.downloadLoading = false
      })
    },
    handleDetail(row) {
      this.userDetail = { ...row }
      this.userDialogVisible = true
    },
    handleUserUpdate() {
      const data = { ...this.userDetail }
      updateUser(data)
        .then((response) => {
          this.userDialogVisible = false
          this.$notify.success({
            title: '成功',
            message: '更新用户成功'
          })
          this.getList()
        })
        .catch(response => {
          this.$notify.error({
            title: '失败',
            message: response?.data?.errmsg || '操作失败'
          })
        })
    }
  }
}
</script>
