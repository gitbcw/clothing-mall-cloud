<template>
  <div class="app-container">
    <!-- 查询和其他操作 -->
    <div class="filter-container">
      <el-input v-model="listQuery.name" clearable class="filter-item" style="width: 160px;" placeholder="导购姓名" />
      <el-input v-model="listQuery.phone" clearable class="filter-item" style="width: 160px;" placeholder="手机号" />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">查找</el-button>
      <el-button class="filter-item" type="primary" icon="el-icon-edit" @click="handleCreate">添加</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="list" element-loading-text="正在查询中。。。" border fit highlight-current-row>
      <!-- 隐藏导购ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->
      <el-table-column align="center" label="头像" prop="avatar" width="80">
        <template slot-scope="scope">
          <el-avatar :src="imageUrl(scope.row.avatar)" />
        </template>
      </el-table-column>
      <el-table-column align="center" label="姓名" prop="name" />
      <el-table-column align="center" label="手机号" prop="phone" width="120" />
      <el-table-column align="center" label="门店" prop="storeId" width="100">
        <template slot-scope="scope">
          <span>{{ getStoreName(scope.row.storeId) }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="提成比例" prop="commissionRate" width="100">
        <template slot-scope="scope">
          {{ (scope.row.commissionRate * 100).toFixed(1) }}%
        </template>
      </el-table-column>
      <el-table-column align="center" label="状态" prop="status" width="80">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
            {{ scope.row.status === 1 ? '在职' : '离职' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="150">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button type="danger" size="mini" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <!-- 添加或修改对话框 -->
    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" width="500">
      <el-form ref="dataForm" :model="dataForm" :rules="rules" label-position="left" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="dataForm.name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="dataForm.phone" />
        </el-form-item>
        <el-form-item label="所属门店" prop="storeId">
          <el-select v-model="dataForm.storeId" placeholder="请选择门店" style="width: 100%;">
            <el-option v-for="store in storeList" :key="store.id" :label="store.name" :value="store.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="提成比例" prop="commissionRate">
          <el-input-number v-model="dataForm.commissionRate" :precision="2" :min="0" :max="1" :step="0.01" />
          <span style="margin-left: 10px;">{{ (dataForm.commissionRate * 100).toFixed(0) }}%</span>
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
          <el-switch v-model="dataForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmData">确定</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<style>
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
  width: 100px;
  height: 100px;
  line-height: 100px;
  text-align: center;
}
.avatar {
  width: 100px;
  height: 100px;
  display: block;
}
</style>

<script>
import { listGuide, createGuide, updateGuide, deleteGuide, listStore } from '@/api/sku'
import { cloudUpload } from '@/utils/upload'
import Pagination from '@/components/Pagination'

export default {
  name: 'Guide',
  components: { Pagination },
  data() {
    return {
      cloudUpload,
      list: [],
      storeList: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        name: undefined,
        phone: undefined,
        sort: 'add_time',
        order: 'desc'
      },
      dialogVisible: false,
      dialogStatus: '',
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
    this.getList()
    this.getStoreList()
  },
  methods: {
    getList() {
      this.listLoading = true
      listGuide(this.listQuery).then(response => {
        this.list = response.data.data.list
        this.total = response.data.data.total
        this.listLoading = false
      }).catch(() => {
        this.list = []
        this.total = 0
        this.listLoading = false
      })
    },
    getStoreList() {
      listStore({ page: 1, limit: 100 }).then(response => {
        this.storeList = response.data.data.list || []
      })
    },
    getStoreName(storeId) {
      const store = this.storeList.find(s => s.id === storeId)
      return store ? store.name : '-'
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        phone: '',
        storeId: undefined,
        commissionRate: 0.01,
        avatar: '',
        status: 1
      }
    },
    handleCreate() {
      this.resetForm()
      this.dialogStatus = 'create'
      this.dialogTitle = '添加导购'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.dataForm = Object.assign({}, row)
      this.dialogStatus = 'update'
      this.dialogTitle = '编辑导购'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    confirmData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          if (this.dialogStatus === 'create') {
            createGuide(this.dataForm).then(response => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '添加导购成功' })
              this.getList()
            }).catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
          } else {
            updateGuide(this.dataForm).then(response => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '更新导购成功' })
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
        deleteGuide({ id: row.id }).then(response => {
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
    }
  }
}
</script>
