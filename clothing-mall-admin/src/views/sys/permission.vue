<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="card">
      <!-- 管理员管理 Tab -->
      <el-tab-pane label="管理员" name="admin">
        <div class="filter-container">
          <el-input v-model="adminQuery.username" clearable class="filter-item" style="width: 200px;" placeholder="请输入管理员名称" />
          <el-button v-permission="['GET /admin/admin/list']" class="filter-item" type="primary" icon="el-icon-search" @click="handleAdminFilter">查找</el-button>
          <el-button v-permission="['POST /admin/admin/create']" class="filter-item" type="primary" icon="el-icon-edit" @click="handleAdminCreate">添加</el-button>
        </div>

        <el-table v-loading="adminLoading" :data="adminList" element-loading-text="正在查询中。。。" border fit highlight-current-row>
          <!-- 隐藏管理员ID列 -->
          <!-- <el-table-column align="center" label="管理员ID" prop="id" sortable /> -->
          <el-table-column align="center" label="管理员名称" prop="username" />
          <el-table-column align="center" label="管理员头像" prop="avatar">
            <template slot-scope="scope">
              <img v-if="scope.row.avatar" :src="imageUrl(scope.row.avatar)" width="40">
            </template>
          </el-table-column>
          <el-table-column align="center" label="管理员角色" prop="roleIds">
            <template slot-scope="scope">
              <el-tag v-for="roleId in scope.row.roleIds" :key="roleId" type="primary" style="margin-right: 10px;"> {{ formatRole(roleId) }} </el-tag>
            </template>
          </el-table-column>
          <el-table-column align="center" label="操作" class-name="small-padding fixed-width">
            <template slot-scope="scope">
              <el-button v-permission="['POST /admin/admin/update']" type="primary" size="mini" @click="handleAdminUpdate(scope.row)">编辑</el-button>
              <el-button v-permission="['POST /admin/admin/delete']" type="danger" size="mini" @click="handleAdminDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="adminTotal>0" :total="adminTotal" :page.sync="adminQuery.page" :limit.sync="adminQuery.limit" @pagination="getAdminList" />
      </el-tab-pane>

      <!-- 角色管理 Tab -->
      <el-tab-pane label="角色管理" name="role">
        <div class="filter-container">
          <el-input v-model="roleQuery.name" clearable class="filter-item" style="width: 200px;" placeholder="请输入角色名称" />
          <el-button v-permission="['GET /admin/role/list']" class="filter-item" type="primary" icon="el-icon-search" @click="handleRoleFilter">查找</el-button>
          <el-button v-permission="['POST /admin/role/create']" class="filter-item" type="primary" icon="el-icon-edit" @click="handleRoleCreate">添加</el-button>
        </div>

        <el-table v-loading="roleLoading" :data="roleList" element-loading-text="正在查询中。。。" border fit highlight-current-row>
          <el-table-column align="center" label="角色名称" prop="name" sortable />
          <el-table-column align="center" label="说明" prop="desc" />
          <el-table-column align="center" label="手机号" prop="mobile" />
          <el-table-column align="center" label="操作" class-name="small-padding fixed-width">
            <template slot-scope="scope">
              <el-button v-permission="['POST /admin/role/update']" type="primary" size="mini" @click="handleRoleUpdate(scope.row)">编辑</el-button>
              <el-button v-permission="['POST /admin/role/delete']" type="danger" size="mini" @click="handleRoleDelete(scope.row)">删除</el-button>
              <el-button v-permission="['GET /admin/role/permissions']" type="primary" size="mini" @click="handlePermission(scope.row)">授权</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="roleTotal>0" :total="roleTotal" :page.sync="roleQuery.page" :limit.sync="roleQuery.limit" @pagination="getRoleList" />
      </el-tab-pane>
    </el-tabs>

    <!-- 管理员编辑对话框 -->
    <el-dialog :title="adminDialogTitle" :visible.sync="adminDialogVisible">
      <el-form ref="adminForm" :rules="adminRules" :model="adminForm" status-icon label-position="left" label-width="100px" style="width: 400px; margin-left:50px;">
        <el-form-item label="管理员名称" prop="username">
          <el-input v-model="adminForm.username" />
        </el-form-item>
        <el-form-item label="管理员密码" prop="password">
          <el-input v-model="adminForm.password" type="password" auto-complete="off" />
        </el-form-item>
        <el-form-item label="管理员头像" prop="avatar">
          <el-upload
            :headers="headers"
            :action="uploadPath"
            :show-file-list="false"
            :on-success="uploadAvatar"
            class="avatar-uploader"
            accept=".jpg,.jpeg,.png,.gif"
          >
            <img v-if="adminForm.avatar" :src="imageUrl(adminForm.avatar)" class="avatar">
            <i v-else class="el-icon-plus avatar-uploader-icon" />
          </el-upload>
        </el-form-item>
        <el-form-item label="管理员角色" prop="roleIds">
          <el-select v-model="adminForm.roleIds" multiple placeholder="请选择">
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="adminDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdminForm">确定</el-button>
      </div>
    </el-dialog>

    <!-- 角色编辑对话框 -->
    <el-dialog :title="roleDialogTitle" :visible.sync="roleDialogVisible">
      <el-form ref="roleForm" :rules="roleRules" :model="roleForm" status-icon label-position="left" label-width="100px" style="width: 400px; margin-left:50px;">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" />
        </el-form-item>
        <el-form-item label="说明" prop="desc">
          <el-input v-model="roleForm.desc" />
        </el-form-item>
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="roleForm.mobile" placeholder="用于接收运营通知的手机号" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRoleForm">确定</el-button>
      </div>
    </el-dialog>

    <!-- 权限配置对话框 -->
    <el-dialog :visible.sync="permissionDialogVisible" title="权限配置">
      <el-tree
        ref="tree"
        :data="systemPermissions"
        :default-checked-keys="assignedPermissions"
        show-checkbox
        node-key="id"
        highlight-current
      >
        <span slot-scope="{ node, data }" class="custom-tree-node">
          <span>{{ data.label }}</span>
          <el-tag v-if="data.api" type="success" size="mini">{{ data.api }}</el-tag>
        </span>
      </el-tree>
      <div slot="footer" class="dialog-footer">
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updatePermission">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listAdmin, createAdmin, updateAdmin, deleteAdmin } from '@/api/admin'
import { listRole, createRole, updateRole, deleteRole, roleOptions, getPermission, updatePermission } from '@/api/role'
const uploadPath = process.env.VUE_APP_BASE_API + '/storage/create'
import { getToken } from '@/utils/auth'
import Pagination from '@/components/Pagination'

export default {
  name: 'Permission',
  components: { Pagination },
  data() {
    return {
      activeTab: 'admin',
      uploadPath,

      // 管理员相关
      adminList: [],
      adminTotal: 0,
      adminLoading: false,
      adminQuery: {
        page: 1,
        limit: 20,
        username: undefined,
        sort: 'add_time',
        order: 'desc'
      },
      adminForm: {
        id: undefined,
        username: undefined,
        password: undefined,
        avatar: undefined,
        roleIds: []
      },
      adminDialogVisible: false,
      adminDialogTitle: '',
      adminRules: {
        username: [
          { required: true, message: '管理员名称不能为空', trigger: 'blur' }
        ],
        password: [{ required: true, message: '密码不能为空', trigger: 'blur' }]
      },

      // 角色相关
      roleList: [],
      roleTotal: 0,
      roleLoading: false,
      roleQuery: {
        page: 1,
        limit: 20,
        name: undefined,
        sort: 'add_time',
        order: 'desc'
      },
      roleForm: {
        id: undefined,
        name: undefined,
        desc: undefined,
        mobile: ''
      },
      roleDialogVisible: false,
      roleDialogTitle: '',
      roleRules: {
        name: [
          { required: true, message: '角色名称不能为空', trigger: 'blur' }
        ],
        mobile: [
          { pattern: /^\d{6,20}$/, message: '手机号格式不正确', trigger: 'blur' }
        ]
      },
      roleOptions: [],

      // 权限配置
      permissionDialogVisible: false,
      systemPermissions: null,
      assignedPermissions: null,
      permissionForm: {
        roleId: undefined,
        permissions: []
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
  watch: {
    activeTab(val) {
      if (val === 'role' && this.roleList.length === 0) {
        this.getRoleList()
      }
    }
  },
  created() {
    this.getAdminList()
    this.getRoleOptions()
  },
  methods: {
    // ========== 管理员相关 ==========
    formatRole(roleId) {
      for (let i = 0; i < this.roleOptions.length; i++) {
        if (roleId === this.roleOptions[i].value) {
          return this.roleOptions[i].label
        }
      }
      return ''
    },
    getAdminList() {
      this.adminLoading = true
      listAdmin(this.adminQuery)
        .then(response => {
          this.adminList = response.data.data.list
          this.adminTotal = response.data.data.total
          this.adminLoading = false
        })
        .catch(() => {
          this.adminList = []
          this.adminTotal = 0
          this.adminLoading = false
        })
    },
    handleAdminFilter() {
      this.adminQuery.page = 1
      this.getAdminList()
    },
    resetAdminForm() {
      this.adminForm = {
        id: undefined,
        username: undefined,
        password: undefined,
        avatar: undefined,
        roleIds: []
      }
    },
    uploadAvatar(response) {
      this.adminForm.avatar = response.data.url
    },
    handleAdminCreate() {
      this.resetAdminForm()
      this.adminDialogTitle = '创建管理员'
      this.adminDialogVisible = true
      this.$nextTick(() => {
        this.$refs['adminForm'].clearValidate()
      })
    },
    handleAdminUpdate(row) {
      this.adminForm = Object.assign({}, row)
      this.adminDialogTitle = '编辑管理员'
      this.adminDialogVisible = true
      this.$nextTick(() => {
        this.$refs['adminForm'].clearValidate()
      })
    },
    handleAdminDelete(row) {
      deleteAdmin(row)
        .then(() => {
          this.$notify.success({ title: '成功', message: '删除管理员成功' })
          this.getAdminList()
        })
        .catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
    },
    submitAdminForm() {
      this.$refs['adminForm'].validate(valid => {
        if (!valid) return

        if (this.adminForm.id) {
          updateAdmin(this.adminForm)
            .then(() => {
              for (const v of this.adminList) {
                if (v.id === this.adminForm.id) {
                  const index = this.adminList.indexOf(v)
                  this.adminList.splice(index, 1, this.adminForm)
                  break
                }
              }
              this.adminDialogVisible = false
              this.$notify.success({ title: '成功', message: '更新管理员成功' })
            })
            .catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
        } else {
          createAdmin(this.adminForm)
            .then(response => {
              this.adminList.unshift(response.data.data)
              this.adminDialogVisible = false
              this.$notify.success({ title: '成功', message: '添加管理员成功' })
            })
            .catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
        }
      })
    },

    // ========== 角色相关 ==========
    getRoleOptions() {
      roleOptions().then(response => {
        this.roleOptions = response.data.data || []
      })
    },
    getRoleList() {
      this.roleLoading = true
      listRole(this.roleQuery)
        .then(response => {
          this.roleList = response.data.data.list
          this.roleTotal = response.data.data.total
          this.roleLoading = false
        })
        .catch(() => {
          this.roleList = []
          this.roleTotal = 0
          this.roleLoading = false
        })
    },
    handleRoleFilter() {
      this.roleQuery.page = 1
      this.getRoleList()
    },
    resetRoleForm() {
      this.roleForm = {
        id: undefined,
        name: undefined,
        desc: undefined,
        mobile: ''
      }
    },
    handleRoleCreate() {
      this.resetRoleForm()
      this.roleDialogTitle = '创建角色'
      this.roleDialogVisible = true
      this.$nextTick(() => {
        this.$refs['roleForm'].clearValidate()
      })
    },
    handleRoleUpdate(row) {
      this.roleForm = Object.assign({}, row)
      this.roleDialogTitle = '编辑角色'
      this.roleDialogVisible = true
      this.$nextTick(() => {
        this.$refs['roleForm'].clearValidate()
      })
    },
    handleRoleDelete(row) {
      deleteRole(row)
        .then(() => {
          this.$notify.success({ title: '成功', message: '删除角色成功' })
          this.getRoleList()
        })
        .catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
    },
    submitRoleForm() {
      this.$refs['roleForm'].validate(valid => {
        if (!valid) return

        if (this.roleForm.id) {
          updateRole(this.roleForm)
            .then(() => {
              for (const v of this.roleList) {
                if (v.id === this.roleForm.id) {
                  const index = this.roleList.indexOf(v)
                  this.roleList.splice(index, 1, this.roleForm)
                  break
                }
              }
              this.roleDialogVisible = false
              this.$notify.success({ title: '成功', message: '更新角色成功' })
            })
            .catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
        } else {
          createRole(this.roleForm)
            .then(response => {
              this.roleList.unshift(response.data.data)
              this.roleDialogVisible = false
              this.$notify.success({ title: '成功', message: '添加角色成功' })
            })
            .catch(response => {
              this.$notify.error({ title: '失败', message: response.data.errmsg })
            })
        }
      })
    },

    // ========== 权限配置 ==========
    handlePermission(row) {
      this.permissionDialogVisible = true
      this.permissionForm.roleId = row.id
      getPermission({ roleId: row.id })
        .then(response => {
          this.systemPermissions = response.data.data.systemPermissions
          this.assignedPermissions = response.data.data.assignedPermissions
          const _curPermissions = response.data.data.curPermissions
          if (_curPermissions) {
            const _map = {}
            _curPermissions.forEach(r => {
              _map[r] = true
            })
            this.systemPermissions.forEach(i => {
              i.children.forEach(j => {
                j.children.forEach(k => {
                  k.disabled = !_map[k.id]
                })
              })
            })
          }
        })
    },
    updatePermission() {
      this.permissionForm.permissions = this.$refs.tree.getCheckedKeys(true)
      updatePermission(this.permissionForm)
        .then(() => {
          this.permissionDialogVisible = false
          this.$notify.success({ title: '成功', message: '授权成功' })
        })
        .catch(response => {
          this.$notify.error({ title: '失败', message: response.data.errmsg })
        })
    }
  }
}
</script>

<style scoped>
.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.avatar-uploader .el-upload:hover {
  border-color: #20a0ff;
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
  width: 145px;
  height: 145px;
  display: block;
}
.filter-container {
  margin-bottom: 15px;
}
</style>
