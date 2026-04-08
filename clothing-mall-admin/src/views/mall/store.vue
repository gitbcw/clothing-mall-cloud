<template>
  <div class="app-container">
    <!-- 查询和其他操作 -->
    <div class="filter-container">
      <el-input v-model="listQuery.name" clearable class="filter-item" style="width: 200px;" placeholder="门店名称" />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">查找</el-button>
      <el-button class="filter-item" type="primary" icon="el-icon-edit" @click="handleCreate">添加</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="list" element-loading-text="正在查询中。。。" border fit highlight-current-row>
      <!-- 隐藏门店ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->
      <el-table-column align="center" label="门店名称" prop="name" />
      <el-table-column align="center" label="地址" prop="address" min-width="200" />
      <el-table-column align="center" label="电话" prop="phone" width="120" />
      <el-table-column align="center" label="营业时间" prop="businessHours" width="120" />
      <el-table-column align="center" label="状态" prop="status" width="80">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
            {{ scope.row.status === 1 ? '营业中' : '已关闭' }}
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
    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" width="600">
      <el-form ref="dataForm" :model="dataForm" :rules="rules" label-position="left" label-width="100px">
        <el-form-item label="门店名称" prop="name">
          <el-input v-model="dataForm.name" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="dataForm.address" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="dataForm.phone" />
        </el-form-item>
        <el-form-item label="营业时间" prop="businessHours">
          <el-input v-model="dataForm.businessHours" placeholder="例如：09:00-21:00" />
        </el-form-item>
        <el-form-item label="经度" prop="longitude">
          <el-input-number v-model="dataForm.longitude" :precision="6" />
        </el-form-item>
        <el-form-item label="纬度" prop="latitude">
          <el-input-number v-model="dataForm.latitude" :precision="6" />
        </el-form-item>
        <el-form-item label="门店图片" prop="imageUrl">
          <el-upload
            :headers="headers"
            :action="uploadPath"
            :show-file-list="false"
            :on-success="uploadSuccess"
            class="avatar-uploader"
            accept=".jpg,.jpeg,.png,.gif"
          >
            <img v-if="dataForm.imageUrl" :src="imageUrl(dataForm.imageUrl)" class="avatar">
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
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
}
.avatar {
  width: 120px;
  height: 120px;
  display: block;
}
</style>

<script>
import { listStore, createStore, updateStore, deleteStore } from '@/api/sku'
import { uploadPath } from '@/api/storage'
import { getToken } from '@/utils/auth'
import Pagination from '@/components/Pagination'

export default {
  name: 'Store',
  components: { Pagination },
  data() {
    return {
      uploadPath,
      list: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        limit: 20,
        name: undefined,
        sort: 'add_time',
        order: 'desc'
      },
      dialogVisible: false,
      dialogStatus: '',
      dialogTitle: '',
      dataForm: {
        id: undefined,
        name: '',
        address: '',
        phone: '',
        businessHours: '',
        longitude: 0,
        latitude: 0,
        imageUrl: '',
        status: 1
      },
      rules: {
        name: [{ required: true, message: '门店名称不能为空', trigger: 'blur' }],
        address: [{ required: true, message: '地址不能为空', trigger: 'blur' }]
      }
    }
  },
  computed: {
    headers() {
      return {
        'X-Litemall-Admin-Token': getToken()
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true
      listStore(this.listQuery).then(response => {
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
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        address: '',
        phone: '',
        businessHours: '',
        longitude: 0,
        latitude: 0,
        imageUrl: '',
        status: 1
      }
    },
    handleCreate() {
      this.resetForm()
      this.dialogStatus = 'create'
      this.dialogTitle = '添加门店'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.dataForm = Object.assign({}, row)
      this.dialogStatus = 'update'
      this.dialogTitle = '编辑门店'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    confirmData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          if (this.dialogStatus === 'create') {
            createStore(this.dataForm).then(response => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '添加门店成功' })
              this.getList()
            }).catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
          } else {
            updateStore(this.dataForm).then(response => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '更新门店成功' })
              this.getList()
            }).catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
          }
        }
      })
    },
    handleDelete(row) {
      this.$confirm('确定要删除该门店吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteStore({ id: row.id }).then(response => {
          this.$notify.success({ title: '成功', message: '删除门店成功' })
          this.getList()
        }).catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
      }).catch(() => {})
    },
    uploadSuccess(response) {
      if (response.errno === 0) {
        this.dataForm.imageUrl = response.data.url
      }
    }
  }
}
</script>
