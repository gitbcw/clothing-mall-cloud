<template>
  <div class="app-container">
    <!-- 返回和标题 -->
    <div class="header-bar">
      <el-button type="text" icon="el-icon-back" @click="goBack">返回门店列表</el-button>
      <span class="title">{{ storeName }} - 门店人员</span>
    </div>

    <!-- 搜索栏 -->
    <div class="filter-container">
      <el-input v-model="listQuery.name" clearable style="width: 160px;" placeholder="导购姓名" />
      <el-input v-model="listQuery.phone" clearable style="width: 160px;" placeholder="手机号" />
      <el-select v-model="listQuery.status" clearable style="width: 120px;" placeholder="状态">
        <el-option label="在职" :value="1" />
        <el-option label="离职" :value="0" />
      </el-select>
      <el-button type="primary" icon="el-icon-search" @click="handleFilter">查找</el-button>
      <el-button type="primary" icon="el-icon-plus" @click="handleCreate">添加导购</el-button>
    </div>

    <!-- 导购列表 -->
    <el-table v-loading="listLoading" :data="list" border fit highlight-current-row>
      <!-- 隐藏导购ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->
      <el-table-column align="center" label="头像" width="70">
        <template slot-scope="scope">
          <el-avatar :src="imageUrl(scope.row.avatar)" size="small" />
        </template>
      </el-table-column>
      <el-table-column align="center" label="姓名" prop="name" />
      <el-table-column align="center" label="手机号" prop="phone" width="120" />
      <el-table-column align="center" label="状态" width="80">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
            {{ scope.row.status === 1 ? '在职' : '离职' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="添加时间" width="160">
        <template slot-scope="scope">
          {{ scope.row.addTime | parseTime }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="150">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button type="danger" size="mini" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <!-- 导购编辑对话框 -->
    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" width="450">
      <el-form ref="dataForm" :model="dataForm" :rules="rules" label-position="left" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="dataForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="dataForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="提成比例" prop="commissionRate">
          <el-slider v-model="dataForm.commissionRate" :min="0" :max="0.5" :step="0.01" :format-tooltip="formatPercent" style="width: 200px;" />
          <span style="margin-left: 15px;">{{ (dataForm.commissionRate * 100).toFixed(0) }}%</span>
        </el-form-item>
        <el-form-item label="头像" prop="avatar">
          <el-upload
            :http-request="cloudUpload"
            :show-file-list="false"
            :on-success="uploadSuccess"
            class="avatar-uploader"
            accept=".jpg,.jpeg,.png,.gif"
          >
            <img v-if="dataForm.avatar" :src="imageUrl(dataForm.avatar)" class="avatar">
            <i v-else class="el-icon-plus avatar-uploader-icon" />
          </el-upload>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="dataForm.status">
            <el-radio :label="1">在职</el-radio>
            <el-radio :label="0">离职</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmData">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.header-bar {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}
.header-bar .title {
  font-size: 16px;
  font-weight: 500;
  margin-left: 20px;
  color: #303133;
}
.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.avatar-uploader .el-upload:hover {
  border-color: #409EFF;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 80px;
  height: 80px;
  line-height: 80px;
  text-align: center;
}
.avatar {
  width: 80px;
  height: 80px;
  display: block;
}
</style>

<script>
import { listGuide, createGuide, updateGuide, deleteGuide } from '@/api/sku'
import { cloudUpload } from '@/utils/upload'
import Pagination from '@/components/Pagination'

export default {
  name: 'ShopGuide',
  components: { Pagination },
  data() {
    return {
      cloudUpload,
      storeId: null,
      storeName: '',
      list: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        name: undefined,
        phone: undefined,
        status: undefined,
        storeId: undefined
      },
      dialogVisible: false,
      dialogTitle: '',
      dataForm: {
        id: undefined,
        name: '',
        phone: '',
        storeId: undefined,
        commissionRate: 0.01,
        avatar: '',
        status: 1
      },
      rules: {
        name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
        phone: [{ required: true, message: '手机号不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.storeId = parseInt(this.$route.query.storeId)
    this.storeName = this.$route.query.storeName || '门店'
    this.listQuery.storeId = this.storeId
    this.getList()
  },
  methods: {
    getList() {
      if (!this.storeId) {
        this.$message.error('缺少门店ID')
        this.goBack()
        return
      }
      this.listLoading = true
      listGuide(this.listQuery).then(response => {
        this.list = response.data.data.list || []
        this.total = response.data.data.total || 0
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
    goBack() {
      this.$router.push({ path: '/platform/shop' })
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        phone: '',
        storeId: this.storeId,
        commissionRate: 0.01,
        avatar: '',
        status: 1
      }
    },
    handleCreate() {
      this.resetForm()
      this.dialogTitle = '添加导购'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.dataForm = Object.assign({}, row)
      this.dialogTitle = '编辑导购'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    confirmData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          this.dataForm.storeId = this.storeId
          if (this.dataForm.id) {
            updateGuide(this.dataForm).then(() => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '更新导购成功' })
              this.getList()
            }).catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
          } else {
            createGuide(this.dataForm).then(() => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '添加导购成功' })
              this.getList()
            }).catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
          }
        }
      })
    },
    handleDelete(row) {
      this.$confirm('确定要删除该导购吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteGuide({ id: row.id }).then(() => {
          this.$notify.success({ title: '成功', message: '删除导购成功' })
          this.getList()
        }).catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
      }).catch(() => {})
    },
    uploadSuccess(response) {
      if (response.errno === 0) {
        this.dataForm.avatar = response.data.url
      }
    },
    formatPercent(val) {
      return (val * 100).toFixed(0) + '%'
    }
  }
}
</script>
