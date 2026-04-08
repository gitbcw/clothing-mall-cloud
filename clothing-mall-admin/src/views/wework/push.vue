<template>
  <div class="app-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>消息推送</span>
      </div>

      <el-form ref="pushForm" :model="pushForm" :rules="rules" label-width="120px">
        <!-- 推送目标 -->
        <el-form-item label="推送目标" prop="targetGroupIds">
          <el-checkbox-group v-model="pushForm.targetGroupIds">
            <el-checkbox v-for="group in pushGroups" :key="group.id" :label="group.id">
              {{ group.name }}
              <el-tag size="mini" :type="getGroupTagType(group.type)" style="margin-left: 4px;">{{ group.memberCount }}人</el-tag>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 推送内容 -->
        <el-form-item label="推送内容" prop="contentType">
          <el-radio-group v-model="pushForm.contentType" @change="onContentTypeChange">
            <el-radio-button label="card">小程序卡片</el-radio-button>
            <el-radio-button label="text">纯文本简文</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 小程序卡片内容 -->
        <template v-if="pushForm.contentType === 'card'">
          <el-form-item label="卡片标题" prop="title">
            <el-input v-model="pushForm.title" placeholder="如：新品上市、限时特卖" class="input-width" maxlength="20" show-word-limit />
          </el-form-item>
          <el-form-item label="封面图片" prop="mediaId">
            <el-upload
              class="cover-uploader"
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <img v-if="pushForm.coverUrl" :src="imageUrl(pushForm.coverUrl)" class="cover-image">
              <i v-else class="el-icon-plus cover-uploader-icon" />
            </el-upload>
            <div v-if="pushForm.mediaId" class="upload-success">
              <i class="el-icon-success" /> 封面已上传
            </div>
            <div class="form-tip">建议尺寸：520x416px，支持 JPG/PNG，不超过 20MB</div>
          </el-form-item>
          <el-form-item label="跳转页面" prop="page">
            <el-select v-model="pushForm.page" placeholder="选择跳转页面" class="input-width" filterable allow-create>
              <el-option v-for="item in pageList" :key="item.path" :label="item.name" :value="item.path" />
            </el-select>
            <div class="form-tip">客户点击卡片后跳转的小程序页面</div>
          </el-form-item>
        </template>

        <!-- 纯文本内容 -->
        <template v-if="pushForm.contentType === 'text'">
          <el-form-item label="文本内容" prop="content">
            <el-input v-model="pushForm.content" type="textarea" :rows="4" placeholder="请输入推送的文本内容" class="input-width" maxlength="500" show-word-limit />
          </el-form-item>
        </template>

        <!-- 发送设置 -->
        <el-form-item label="定时发送">
          <el-date-picker
            v-model="pushForm.scheduledAt"
            type="datetime"
            placeholder="留空则立即发送"
            class="input-width"
            value-format="yyyy-MM-dd HH:mm:ss"
            :picker-options="pickerOptions"
          />
          <div class="form-tip">设置后将按计划时间自动推送</div>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="sending" @click="handleSend">
            立即发送
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 使用说明 -->
    <el-card class="box-card help-card">
      <div slot="header">
        <span>使用说明</span>
      </div>
      <el-collapse>
        <el-collapse-item title="前提条件" name="1">
          <ol>
            <li>在「配置管理 → 促销配置」中配置企业微信企业ID、Secret、发送者账号</li>
            <li>将小程序关联到企业微信（小程序需已发布上线）</li>
          </ol>
        </el-collapse-item>
        <el-collapse-item title="推送流程" name="2">
          <ol>
            <li>选择要发送的推送组</li>
            <li>选择内容类型：小程序卡片 或 纯文本</li>
            <li>填写内容信息</li>
            <li>选择立即发送或定时发送</li>
          </ol>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script>
import { getPages, sendMessage, getPushGroups } from '@/api/wework'
import { getToken } from '@/utils/auth'

export default {
  name: 'WeWorkPush',
  data() {
    return {
      pushForm: {
        targetType: 'group',
        targetGroupIds: [],
        targetTagId: '',
        contentType: 'card',
        title: '',
        content: '',
        mediaId: '',
        coverUrl: '',
        page: '',
        scheduledAt: ''
      },
      rules: {
        targetGroupIds: [{ required: true, type: 'array', min: 1, message: '请选择推送组', trigger: 'change' }],
        title: [{ required: true, message: '请输入卡片标题', trigger: 'blur' }],
        mediaId: [{ required: true, message: '请上传封面图片', trigger: 'change' }],
        page: [{ required: true, message: '请选择跳转页面', trigger: 'change' }],
        content: [{ required: true, message: '请输入文本内容', trigger: 'blur' }]
      },
      pushGroups: [],
      pageList: [],
      sending: false,
      uploadUrl: process.env.VUE_APP_BASE_API + '/admin/wework/uploadMedia',
      pickerOptions: {
        disabledDate(time) {
          return time.getTime() < Date.now() - 86400000
        }
      }
    }
  },
  computed: {
    uploadHeaders() {
      return { 'X-Litemall-Admin-Token': getToken() }
    }
  },
  created() {
    this.loadPushGroups()
    this.loadPages()
  },
  methods: {
    loadPushGroups() {
      getPushGroups().then(res => {
        if (res.data.errno === 0) {
          this.pushGroups = res.data.data.list || []
        }
      })
    },
    async loadPages() {
      try {
        const res = await getPages()
        if (res.data.errno === 0) {
          this.pageList = res.data.data.list || []
        }
      } catch (e) {
        console.error('获取页面列表失败', e)
      }
    },
    getGroupTagType(type) {
      const map = { test: 'info', active: 'success', dormant: 'warning', salvage: 'danger' }
      return map[type] || ''
    },
    onContentTypeChange() {
      // 切换内容类型时清空相关字段
      this.pushForm.title = ''
      this.pushForm.mediaId = ''
      this.pushForm.coverUrl = ''
      this.pushForm.page = ''
      this.pushForm.content = ''
      this.$nextTick(() => {
        this.$refs.pushForm.clearValidate()
      })
    },
    beforeUpload(file) {
      const isImage = file.type.startsWith('image/')
      const isLt20M = file.size / 1024 / 1024 < 20
      if (!isImage) {
        this.$message.error('只能上传图片文件')
        return false
      }
      if (!isLt20M) {
        this.$message.error('图片大小不能超过 20MB')
        return false
      }
      return true
    },
    handleUploadSuccess(response, file) {
      if (response.errno === 0) {
        this.pushForm.mediaId = response.data.mediaId
        this.pushForm.coverUrl = URL.createObjectURL(file.raw)
        this.$message.success('封面上传成功')
      } else {
        this.$message.error(response.errmsg || '上传失败')
      }
    },
    handleUploadError() {
      this.$message.error('上传失败，请重试')
    },
    getFormData() {
      return {
        targetType: this.pushForm.targetType,
        targetGroupIds: this.pushForm.targetGroupIds,
        targetTagId: this.pushForm.targetTagId,
        contentType: this.pushForm.contentType,
        title: this.pushForm.title,
        content: this.pushForm.content,
        mediaId: this.pushForm.mediaId,
        page: this.pushForm.page,
        scheduledAt: this.pushForm.scheduledAt
      }
    },
    handleSend() {
      this.$refs.pushForm.validate(async valid => {
        if (!valid) return
        await this.doSend(this.getFormData())
      })
    },
    async doSend(data) {
      this.sending = true
      try {
        const res = await sendMessage(data)
        if (res.data.errno === 0) {
          this.$notify.success({ title: '成功', message: res.data.errmsg || '消息发送成功' })
        } else {
          this.$notify.error({ title: '失败', message: res.data.errmsg || '发送失败' })
        }
      } catch (e) {
        this.$notify.error({ title: '失败', message: '发送失败，请检查配置' })
      } finally {
        this.sending = false
      }
    },
    resetForm() {
      this.pushForm = {
        targetType: 'group',
        targetGroupIds: [],
        targetTagId: '',
        contentType: 'card',
        title: '',
        content: '',
        mediaId: '',
        coverUrl: '',
        page: '',
        scheduledAt: ''
      }
      this.$refs.pushForm.resetFields()
    }
  }
}
</script>

<style scoped>
.input-width {
  width: 350px;
}
.form-tip {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
}
.error-tip {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 5px;
}
.cover-uploader {
  display: inline-block;
}
.cover-uploader >>> .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
}
.cover-uploader >>> .el-upload:hover {
  border-color: #409EFF;
}
.cover-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 180px;
  height: 144px;
  line-height: 144px;
  text-align: center;
}
.cover-image {
  width: 180px;
  height: 144px;
  display: block;
  object-fit: cover;
}
.upload-success {
  margin-top: 8px;
  color: #67c23a;
  font-size: 13px;
}
.help-card {
  margin-top: 20px;
}
.help-card ol,
.help-card ul {
  padding-left: 20px;
  line-height: 1.8;
}
</style>
