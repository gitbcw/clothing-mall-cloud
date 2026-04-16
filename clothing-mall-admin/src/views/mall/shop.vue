<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <div class="filter-container">
      <el-input v-model="listQuery.name" clearable style="width: 200px;" placeholder="门店名称" />
      <el-button type="primary" icon="el-icon-search" @click="handleFilter">查找</el-button>
      <el-button type="primary" icon="el-icon-plus" @click="handleCreate">添加</el-button>
    </div>

    <!-- 门店列表 -->
    <el-table v-loading="listLoading" :data="list" border fit highlight-current-row>
      <!-- 隐藏门店ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->
      <el-table-column align="center" label="门店名称" prop="name" min-width="150" />
      <el-table-column align="center" label="地址" prop="address" min-width="200" />
      <el-table-column align="center" label="电话" prop="phone" width="120" />
      <el-table-column align="center" label="营业时间" prop="businessHours" width="120" />
      <el-table-column align="center" label="状态" width="90">
        <template slot-scope="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" size="small">
            {{ scope.row.status === 1 ? '营业中' : '已关闭' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="导购数" width="80">
        <template slot-scope="scope">
          <span>{{ scope.row.guideCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="220">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button type="warning" size="mini" @click="handleGuide(scope.row)">人员</el-button>
          <el-button type="danger" size="mini" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="getList" />

    <!-- 门店编辑对话框 -->
    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" width="500">
      <el-form ref="dataForm" :model="dataForm" :rules="rules" label-position="left" label-width="100px">
        <el-form-item label="门店名称" prop="name">
          <el-input v-model="dataForm.name" placeholder="请输入门店名称" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="dataForm.address" placeholder="请输入门店地址" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="dataForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="营业时间" prop="businessHours">
          <el-input v-model="dataForm.businessHours" placeholder="例如：09:00-21:00" />
        </el-form-item>
        <el-form-item label="门店图片" prop="imageUrl">
          <el-upload
            action=""
            :http-request="cloudUpload"
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
          <span style="margin-left: 10px;">{{ dataForm.status === 1 ? '营业中' : '已关闭' }}</span>
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
import { listStore, createStore, updateStore, deleteStore } from '@/api/sku'
import { cloudUpload } from '@/utils/upload'
import Pagination from '@/components/Pagination'

export default {
  name: 'Shop',
  components: { Pagination },
  data() {
    return {
      cloudUpload,
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
      dialogTitle: '',
      dataForm: {
        id: undefined,
        name: '',
        address: '',
        phone: '',
        businessHours: '',
        imageUrl: '',
        status: 1
      },
      rules: {
        name: [{ required: true, message: '门店名称不能为空', trigger: 'blur' }],
        address: [{ required: true, message: '地址不能为空', trigger: 'blur' }]
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
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        address: '',
        phone: '',
        businessHours: '',
        imageUrl: '',
        status: 1
      }
    },
    handleCreate() {
      this.resetForm()
      this.dialogTitle = '添加门店'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.dataForm = Object.assign({}, row)
      this.dialogTitle = '编辑门店'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    confirmData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          if (this.dataForm.id) {
            updateStore(this.dataForm).then(() => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '更新门店成功' })
              this.getList()
            }).catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
          } else {
            createStore(this.dataForm).then(() => {
              this.dialogVisible = false
              this.$notify.success({ title: '成功', message: '添加门店成功' })
              this.getList()
            }).catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
          }
        }
      })
    },
    handleDelete(row) {
      this.$confirm('确定要删除该门店吗？删除后该门店的导购数据将无法关联。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteStore({ id: row.id }).then(() => {
          this.$notify.success({ title: '成功', message: '删除门店成功' })
          this.getList()
        }).catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
      }).catch(() => {})
    },
    handleGuide(row) {
      this.$router.push({ path: '/platform/shop-guide', query: { storeId: row.id, storeName: row.name }})
    },
    uploadSuccess(response) {
      if (response.errno === 0) {
        this.dataForm.imageUrl = response.data.url
      }
    }
  }
}
</script>
