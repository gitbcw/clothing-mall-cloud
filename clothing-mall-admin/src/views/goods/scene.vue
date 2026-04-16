<template>
  <div class="app-container">
    <!-- 查询和其他操作 -->
    <div class="filter-container">
      <el-button class="filter-item" type="primary" icon="el-icon-edit" @click="handleCreate">添加场景</el-button>
    </div>

    <!-- 查询结果 -->
    <el-table v-loading="listLoading" :data="list" element-loading-text="正在查询中。。。" border fit highlight-current-row>
      <!-- 隐藏场景ID列 -->
      <!-- <el-table-column align="center" label="ID" prop="id" width="80" /> -->
      <el-table-column align="center" label="海报图" width="100">
        <template slot-scope="scope">
          <el-image v-if="scope.row.posterUrl" :src="imageUrl(scope.row.posterUrl)" style="width: 60px; height: 40px;" fit="cover" :preview-src-list="[imageUrl(scope.row.posterUrl)]" />
          <span v-else style="color: #ccc;">-</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="场景名称" prop="name" />
      <el-table-column align="center" label="描述" prop="description" />
      <el-table-column align="center" label="商品数" width="80">
        <template slot-scope="scope">
          <span>{{ scope.row.goodsCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column align="center" label="排序" prop="sortOrder" width="80" />
      <el-table-column align="center" label="状态" width="100">
        <template slot-scope="scope">
          <el-tag :type="scope.row.enabled ? 'success' : 'info'" size="mini">
            {{ scope.row.enabled ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="操作" width="300" class-name="small-padding fixed-width">
        <template slot-scope="scope">
          <el-button type="primary" size="mini" @click="handleGoods(scope.row)">绑定商品</el-button>
          <el-button type="primary" size="mini" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button
            :type="scope.row.enabled ? 'warning' : 'success'"
            size="mini"
            @click="handleEnable(scope.row)"
          >
            {{ scope.row.enabled ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" size="mini" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加或修改对话框 -->
    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" width="500">
      <el-form ref="dataForm" :model="dataForm" :rules="rules" label-position="left" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="dataForm.name" placeholder="场景名称" />
        </el-form-item>
        <el-form-item label="海报图" prop="posterUrl">
          <el-upload
            :http-request="cloudUpload"
            :show-file-list="false"
            :on-success="posterUploadSuccess"
            :on-error="posterUploadError"
            class="avatar-uploader"
            accept=".jpg,.jpeg,.png,.gif"
          >
            <img v-if="dataForm.posterUrl" :src="imageUrl(dataForm.posterUrl)" class="avatar">
            <i v-else class="el-icon-plus avatar-uploader-icon" />
          </el-upload>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="dataForm.description" type="textarea" :rows="2" placeholder="场景描述" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="dataForm.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="enabled">
          <el-switch v-model="dataForm.enabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmData">确定</el-button>
      </div>
    </el-dialog>

    <!-- 绑定商品对话框 -->
    <el-dialog :visible.sync="goodsDialogVisible" :title="currentSceneName + ' - 绑定商品'" width="800">
      <div class="bind-goods-panel">
        <!-- 左栏：待选择 -->
        <div class="panel-left">
          <div class="panel-header">
            <span>待选择商品</span>
            <el-input v-model="goodsSearchName" placeholder="搜索商品" size="mini" prefix-icon="el-icon-search" clearable style="width: 160px;" />
          </div>
          <div v-loading="goodsLoading" class="panel-body">
            <div v-for="item in availableGoods" :key="item.id" class="goods-item" @click="addGoods(item)">
              <el-image v-if="item.picUrl" :src="imageUrl(item.picUrl)" style="width: 40px; height: 40px; flex-shrink: 0;" fit="cover" />
              <div class="goods-info">
                <span class="goods-name">{{ item.name }}</span>
                <span class="goods-price">¥{{ item.retailPrice }}</span>
              </div>
              <i class="el-icon-circle-plus-outline add-icon" />
            </div>
            <div v-if="!goodsLoading && availableGoods.length === 0" class="empty-tip">暂无商品</div>
          </div>
        </div>
        <!-- 右栏：已绑定 -->
        <div class="panel-right">
          <div class="panel-header">
            <span>已绑定 ({{ boundGoods.length }})</span>
          </div>
          <div class="panel-body">
            <div v-for="item in boundGoods" :key="'bound-' + item.id" class="goods-item bound">
              <el-image v-if="item.picUrl" :src="imageUrl(item.picUrl)" style="width: 40px; height: 40px; flex-shrink: 0;" fit="cover" />
              <div class="goods-info">
                <span class="goods-name">{{ item.name }}</span>
                <span class="goods-price">¥{{ item.retailPrice }}</span>
              </div>
              <i class="el-icon-circle-close remove-icon" @click="removeGoods(item)" />
            </div>
            <div v-if="boundGoods.length === 0" class="empty-tip">暂未绑定商品</div>
          </div>
        </div>
      </div>
      <div slot="footer">
        <el-button @click="goodsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSceneGoods">确定</el-button>
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
.bind-goods-panel {
  display: flex;
  gap: 16px;
}
.panel-left,
.panel-right {
  flex: 1;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 500;
  font-size: 14px;
}
.panel-body {
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}
.goods-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.goods-item:hover {
  background: #f5f7fa;
}
.goods-info {
  flex: 1;
  margin-left: 10px;
  overflow: hidden;
}
.goods-name {
  display: block;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-price {
  display: block;
  font-size: 12px;
  color: #f56c6c;
  margin-top: 2px;
}
.add-icon {
  font-size: 20px;
  color: #409eff;
  flex-shrink: 0;
}
.remove-icon {
  font-size: 20px;
  color: #f56c6c;
  cursor: pointer;
  flex-shrink: 0;
}
.empty-tip {
  text-align: center;
  color: #909399;
  padding: 40px 0;
  font-size: 13px;
}
</style>

<script>
import { listScene, createScene, updateScene, deleteScene, enableScene, listSceneGoods, updateSceneGoods } from '@/api/scene'
import { listGoods } from '@/api/goods'
import { cloudUpload } from '@/utils/upload'

export default {
  name: 'Scene',
  data() {
    return {
      cloudUpload,
      list: [],
      listLoading: true,
      dialogVisible: false,
      dialogStatus: '',
      dialogTitle: '',
      dataForm: {
        id: undefined,
        name: '',
        posterUrl: '',
        description: '',
        sortOrder: 0,
        enabled: true
      },
      rules: {
        name: [{ required: true, message: '场景名称不能为空', trigger: 'blur' }]
      },
      goodsDialogVisible: false,
      currentSceneId: null,
      currentSceneName: '',
      allGoods: [],
      boundGoods: [],
      goodsSearchName: '',
      goodsLoading: false
    }
  },
  computed: {
    availableGoods() {
      const keyword = this.goodsSearchName.toLowerCase().trim()
      const boundIds = new Set(this.boundGoods.map(g => g.id))
      return this.allGoods.filter(g => {
        if (boundIds.has(g.id)) return false
        if (keyword && !g.name.toLowerCase().includes(keyword)) return false
        return true
      })
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.listLoading = true
      listScene().then(response => {
        this.list = response.data.data.list
        this.listLoading = false
      }).catch(() => {
        this.list = []
        this.listLoading = false
      })
    },
    resetForm() {
      this.dataForm = {
        id: undefined,
        name: '',
        posterUrl: '',
        description: '',
        sortOrder: 0,
        enabled: true
      }
    },
    handleCreate() {
      this.resetForm()
      this.dialogStatus = 'create'
      this.dialogTitle = '添加场景'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    handleUpdate(row) {
      this.dataForm = Object.assign({}, row)
      this.dialogStatus = 'update'
      this.dialogTitle = '编辑场景'
      this.dialogVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    confirmData() {
      this.$refs['dataForm'].validate((valid) => {
        if (valid) {
          if (this.dialogStatus === 'create') {
            createScene(this.dataForm).then(response => {
              this.dialogVisible = false
              this.$notify.success({
                title: '成功',
                message: '添加场景成功'
              })
              this.getList()
            }).catch(response => {
              this.$notify.error({
                title: '失败',
                message: response.data.errmsg
              })
            })
          } else {
            updateScene(this.dataForm).then(response => {
              this.dialogVisible = false
              this.$notify.success({
                title: '成功',
                message: '更新场景成功'
              })
              this.getList()
            }).catch(response => {
              this.$notify.error({
                title: '失败',
                message: response.data.errmsg
              })
            })
          }
        }
      })
    },
    handleEnable(row) {
      const newEnabled = !row.enabled
      const action = newEnabled ? '启用' : '禁用'
      this.$confirm(`确定要${action}该场景吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        enableScene({ id: row.id, enabled: newEnabled }).then(response => {
          this.$notify.success({
            title: '成功',
            message: `${action}成功`
          })
          this.getList()
        }).catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
      }).catch(() => {})
    },
    handleDelete(row) {
      this.$confirm('确定要删除该场景吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteScene({ id: row.id }).then(response => {
          this.$notify.success({
            title: '成功',
            message: '删除场景成功'
          })
          this.getList()
        }).catch(response => {
          this.$notify.error({
            title: '失败',
            message: response.data.errmsg
          })
        })
      }).catch(() => {})
    },
    posterUploadSuccess(response) {
      if (response.errno === 0) {
        this.dataForm.posterUrl = response.data.url
      }
    },
    posterUploadError() {
      this.$notify.error({ title: '失败', message: '海报图上传失败，请重试' })
    },
    handleGoods(row) {
      this.currentSceneId = row.id
      this.currentSceneName = row.name
      this.boundGoods = []
      this.allGoods = []
      this.goodsSearchName = ''
      this.goodsDialogVisible = true
      this.goodsLoading = true
      Promise.all([
        listSceneGoods(row.id),
        listGoods({ limit: 1000, status: 'published' })
      ]).then(([boundRes, allRes]) => {
        const boundList = boundRes.data.data || []
        const allList = allRes.data.data.list || []
        this.allGoods = allList
        this.boundGoods = boundList
        this.goodsLoading = false
      }).catch(() => {
        this.allGoods = []
        this.boundGoods = []
        this.goodsLoading = false
      })
    },
    addGoods(goods) {
      this.boundGoods.push(goods)
    },
    removeGoods(goods) {
      this.boundGoods = this.boundGoods.filter(g => g.id !== goods.id)
    },
    confirmSceneGoods() {
      const goodsIds = this.boundGoods.map(g => g.id)
      updateSceneGoods({ sceneId: this.currentSceneId, goodsIds }).then(() => {
        this.goodsDialogVisible = false
        this.$notify.success({ title: '成功', message: '绑定商品成功' })
      }).catch(res => {
        this.$notify.error({ title: '失败', message: res.data.errmsg || '绑定失败' })
      })
    }
  }
}
</script>
