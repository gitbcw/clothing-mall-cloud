<template>
  <div class="app-container goods-create-page">

    <!-- 草稿恢复提示 -->
    <el-alert
      v-if="draftInfo.hasDraft"
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 16px;"
    >
      <template slot="title">
        有未完成的草稿（{{ draftInfo.savedAt }}）
        <el-button type="text" size="mini" @click="restoreDraft">恢复草稿</el-button>
        <el-button type="text" size="mini" style="color: #f56c6c;" @click="clearDraft">清除</el-button>
      </template>
    </el-alert>

    <!-- 商品信息 -->
    <el-card class="box-card">
      <h3>商品信息</h3>
      <el-form ref="goodsForm" :rules="rules" :model="goods" label-width="150px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="goods.name" style="width: 400px" placeholder="请输入商品名称" @change="autoSaveDraft" />
        </el-form-item>

        <el-form-item label="一口价" prop="retailPrice">
          <el-input-number v-model="goods.retailPrice" :min="0" :precision="2" style="width: 300px" @change="autoSaveDraft" />
          <span class="form-tip">元（实际售价）</span>
        </el-form-item>

        <!-- 特价设置 -->
        <el-form-item label="设置特价">
          <el-switch v-model="goods.isSpecialPrice" active-text="特价" inactive-text="普通" @change="autoSaveDraft" />
        </el-form-item>
        <el-form-item v-if="goods.isSpecialPrice" label="特价金额">
          <el-input-number v-model="goods.specialPrice" :min="0" :precision="2" style="width: 300px" @change="autoSaveDraft" />
          <span class="form-tip">元</span>
        </el-form-item>

        <!-- 主图 -->
        <el-form-item label="商品主图">
          <div class="upload-area">
            <el-upload
              :http-request="cloudUpload"
              :show-file-list="false"
              :auto-upload="false"
              :on-change="handlePicChange"
              accept=".jpg,.jpeg,.png"
              class="avatar-uploader"
            >
              <img v-if="goods.picUrl" :src="imageUrl(goods.picUrl)" class="avatar">
              <i v-else class="el-icon-plus avatar-uploader-icon" />
            </el-upload>
            <el-button
              v-if="goods.picUrl"
              type="text"
              icon="el-icon-camera"
              :loading="aiLoading"
              style="margin-left: 12px;"
              @click="handleRecognizeImage"
            >AI 识别主图</el-button>
          </div>
          <div v-if="aiLoading" class="ai-loading-tip">
            <i class="el-icon-loading" /> AI 正在识别商品信息...
          </div>
        </el-form-item>

        <!-- 吊牌识别 -->
        <el-form-item label="吊牌识别">
          <el-upload
            :http-request="handleTagUpload"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png"
          >
            <el-button type="text" icon="el-icon-camera" :loading="tagLoading">拍摄/上传吊牌</el-button>
          </el-upload>
          <span class="form-tip">识别吊牌上的名称和价格</span>
        </el-form-item>

        <!-- 轮播图 -->
        <el-form-item label="商品轮播图">
          <el-upload
            :http-request="cloudUpload"
            :limit="9"
            :file-list="galleryFileList"
            :on-exceed="uploadOverrun"
            :on-success="handleGalleryUrl"
            :on-remove="handleRemove"
            multiple
            accept=".jpg,.jpeg,.png,.gif"
            list-type="picture-card"
          >
            <i class="el-icon-plus" />
          </el-upload>
        </el-form-item>

        <!-- 分类 -->
        <el-form-item label="商品分类">
          <el-select v-model="goods.categoryId" clearable placeholder="请选择分类" style="width: 300px;" @change="autoSaveDraft">
            <el-option v-for="item in categoryList" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <!-- 关键词 -->
        <el-form-item label="搜索关键词">
          <el-tag v-for="tag in keywords" :key="tag" closable type="primary" @close="removeKeyword(tag)">{{ tag }}</el-tag>
          <el-input
            v-if="keywordInputVisible"
            ref="keywordInput"
            v-model="keywordInput"
            class="input-new-keyword"
            @keyup.enter.native="addKeyword"
            @blur="addKeyword"
          />
          <el-button v-else class="button-new-keyword" type="primary" @click="showKeywordInput">添加</el-button>
        </el-form-item>

        <!-- 场景标签 -->
        <el-form-item label="场景标签">
          <el-select
            v-model="selectedSceneIds"
            multiple
            collapse-tags
            clearable
            placeholder="请选择场景（可多选）"
            style="width: 400px;"
            @change="autoSaveDraft"
          >
            <el-option v-for="item in sceneList" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <!-- 简介 -->
        <el-form-item label="商品简介">
          <el-input v-model="goods.brief" type="textarea" :rows="2" style="width: 400px;" @change="autoSaveDraft" />
        </el-form-item>

        <!-- 商品参数 -->
        <el-form-item label="商品参数">
          <div class="params-list">
            <div v-for="(param, index) in goodsParams" :key="index" class="param-row">
              <el-input v-model="param.key" placeholder="参数名" style="width: 150px;" @change="autoSaveDraft" />
              <el-input v-model="param.value" placeholder="参数值" style="width: 200px; margin-left: 8px;" @change="autoSaveDraft" />
              <el-button type="text" icon="el-icon-delete" style="color: #f56c6c; margin-left: 4px;" @click="removeParam(index)" />
            </div>
            <el-button type="text" icon="el-icon-plus" @click="addParam">添加参数</el-button>
          </div>
        </el-form-item>

        <!-- 详情 -->
        <el-form-item label="商品详情">
          <editor v-model="goods.detail" :init="editorInit" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮 -->
    <div class="op-container">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="info" :loading="submitting" @click="handleSaveDraft">暂存草稿</el-button>
      <el-button type="primary" :loading="submitting" @click="handlePublish">上架</el-button>
    </div>

  </div>
</template>

<style scoped>
.goods-create-page { padding: 20px; }
.box-card { margin-bottom: 12px; }
.upload-area { display: flex; align-items: center; }
.avatar-uploader .el-upload {
  width: 145px; height: 145px;
  border: 1px dashed #d9d9d9; border-radius: 6px;
  cursor: pointer; overflow: hidden;
}
.avatar-uploader .el-upload:hover { border-color: #409eff; }
.avatar-uploader-icon { font-size: 28px; color: #8c939d; width: 120px; height: 120px; line-height: 120px; text-align: center; }
.avatar { width: 145px; height: 145px; display: block; object-fit: cover; }
.form-tip { margin-left: 12px; color: #909399; font-size: 12px; }
.ai-loading-tip { margin-top: 8px; color: #409eff; font-size: 12px; }
.op-container { display: flex; justify-content: center; padding: 20px 0; }
.el-tag + .el-tag { margin-left: 8px; }
.input-new-keyword { width: 90px; margin-left: 8px; vertical-align: bottom; }
.params-list { display: flex; flex-direction: column; gap: 8px; }
.param-row { display: flex; align-items: center; }
</style>

<script>
import { publishGoods, recognizeImage, recognizeTag, listCatAndBrand } from '@/api/goods'
import { listScene } from '@/api/scene'
import { cloudUpload, cloudUploadFile } from '@/utils/upload'
import Editor from '@tinymce/tinymce-vue'
import { MessageBox } from 'element-ui'

const DRAFT_KEY = 'goodsCreateDraft'

export default {
  name: 'GoodsCreate',
  components: { Editor },
  data() {
    return {
      cloudUpload,
      submitting: false,
      aiLoading: false,
      tagLoading: false,
      // 商品数据
      goods: {
        name: '',
        retailPrice: null,
        specialPrice: null,
        isSpecialPrice: false,
        picUrl: '',
        gallery: [],
        categoryId: null,
        keywords: '',
        brief: '',
        detail: '',
      },
      picFile: null,
      galleryFileList: [],
      keywords: [],
      keywordInputVisible: false,
      keywordInput: '',
      // 场景
      sceneList: [],
      selectedSceneIds: [],
      // 分类
      categoryList: [],
      // 商品参数
      goodsParams: [],
      // 草稿
      draftInfo: { hasDraft: false, savedAt: '' },
      // 验证
      rules: {
        name: [{ required: true, message: '商品名称不能为空', trigger: 'blur' }],
        retailPrice: [{ required: true, message: '一口价不能为空', trigger: 'change' }],
      },
      // 富文本
      editorInit: {
        language: 'zh_CN',
        height: 500,
        convert_urls: false,
        plugins: ['advlist anchor autolink autosave code codesample colorpicker contextmenu directionality emoticons fullscreen hr image imagetools importcss insertdatetime link lists media nonbreaking pagebreak paste preview print save searchreplace table template textcolor textpattern visualblocks visualchars wordcount'],
        toolbar: ['searchreplace bold italic underline strikethrough alignleft aligncenter alignright outdent indent blockquote undo redo removeformat subscript superscript code codesample', 'hr bullist numlist link image charmap preview anchor pagebreak insertdatetime media table emoticons forecolor backcolor fullscreen'],
        images_upload_handler: function(blobInfo, success, failure) {
          const file = blobInfo.blob()
          file.name = blobInfo.filename()
          cloudUploadFile(file).then(url => success(url)).catch(() => failure('上传失败'))
        }
      },
      // 防抖定时器
      _draftTimer: null,
    }
  },
  created() {
    this.init()
  },
  methods: {
    init() {
      listCatAndBrand().then(response => {
        this.categoryList = response.data.data.categoryList
      })
      listScene({ page: 1, limit: 100 }).then(response => {
        const list = response.data.data.list || response.data.data || []
        this.sceneList = list.map(item => ({ value: item.id, label: item.name }))
      }).catch(() => {})
      this.checkDraft()
    },

    // ==================== AI 识别 ====================

    async handleRecognizeImage() {
      if (!this.goods.picUrl) {
        this.$message.warning('请先上传商品主图')
        return
      }
      this.aiLoading = true
      try {
        const res = await recognizeImage({ fileID: this.goods.picUrl })
        const data = res.data.data
        if (!data) { this.$message.info('AI 未能识别到信息'); return }

        // 仅填充空字段，不覆盖已有内容
        if (!this.goods.name && data.name) this.goods.name = data.name
        if (!this.goods.retailPrice && data.price) this.goods.retailPrice = data.price
        if (!this.goods.brief && data.brief) this.goods.brief = data.brief
        if (data.category) {
          const matched = this.categoryList.find(c => c.label === data.category || c.label.includes(data.category))
          if (matched && !this.goods.categoryId) this.goods.categoryId = matched.value
        }
        if (data.scenes && Array.isArray(data.scenes) && this.selectedSceneIds.length === 0) {
          const sceneIds = data.scenes.map(name => {
            const s = this.sceneList.find(item => item.label === name || (name && item.label.includes(name)))
            return s ? s.value : null
          }).filter(Boolean)
          if (sceneIds.length > 0) this.selectedSceneIds = sceneIds
        }
        this.$notify.success({ title: 'AI 识别完成', message: '已自动填充商品信息' })
      } catch (e) {
        console.warn('AI 识别失败:', e)
        this.$message.warning('AI 识别失败，请手动填写')
      } finally {
        this.aiLoading = false
      }
    },

    async handleTagUpload(options) {
      const file = options.file
      this.tagLoading = true
      try {
        const cloudPath = await cloudUploadFile(file)
        const res = await recognizeTag({ fileID: cloudPath })
        const data = res.data.data
        if (data) {
          // 吊牌信息更准确，总是覆盖
          if (data.name) this.goods.name = data.name
          if (data.price) this.goods.retailPrice = data.price
          this.$notify.success({ title: '吊牌识别完成', message: '已更新商品名称和价格' })
        }
      } catch (e) {
        console.warn('吊牌识别失败:', e)
        this.$message.warning('吊牌识别失败')
      } finally {
        this.tagLoading = false
      }
    },

    // ==================== 图片上传 ====================

    async handlePicChange(file) {
      if (!file.raw) return
      this.picFile = file.raw
      // 先本地预览
      this.goods.picUrl = URL.createObjectURL(file.raw)
      // 上传到云存储
      try {
        const cloudPath = await cloudUploadFile(file.raw)
        this.goods.picUrl = cloudPath
        this.picFile = null
        this.autoSaveDraft()
        // 上传成功后自动触发 AI 识别
        this.handleRecognizeImage()
      } catch (e) {
        console.warn('主图上传失败:', e)
        this.$message.error('图片上传失败')
      }
    },

    uploadOverrun() {
      this.$message.error('最多上传9张轮播图')
    },
    handleGalleryUrl(response) {
      if (response && response.errno === 0 && response.data && response.data.url) {
        this.goods.gallery.push(response.data.url)
        this.autoSaveDraft()
      }
    },
    handleRemove(file) {
      const url = file.response ? file.response.data.url : file.url
      const idx = this.goods.gallery.indexOf(url)
      if (idx > -1) this.goods.gallery.splice(idx, 1)
      this.autoSaveDraft()
    },

    // ==================== 关键词 ====================

    removeKeyword(tag) {
      this.keywords.splice(this.keywords.indexOf(tag), 1)
      this.goods.keywords = this.keywords.toString()
      this.autoSaveDraft()
    },
    showKeywordInput() {
      this.keywordInputVisible = true
      this.$nextTick(() => this.$refs.keywordInput.$refs.input.focus())
    },
    addKeyword() {
      if (this.keywordInput) {
        this.keywords.push(this.keywordInput)
        this.goods.keywords = this.keywords.toString()
        this.autoSaveDraft()
      }
      this.keywordInputVisible = false
      this.keywordInput = ''
    },

    // ==================== 商品参数 ====================

    addParam() {
      this.goodsParams.push({ key: '', value: '' })
    },
    removeParam(index) {
      this.goodsParams.splice(index, 1)
    },

    // ==================== 草稿 ====================

    autoSaveDraft() {
      clearTimeout(this._draftTimer)
      this._draftTimer = setTimeout(() => {
        const draft = {
          goods: { ...this.goods },
          selectedSceneIds: [...this.selectedSceneIds],
          keywords: [...this.keywords],
          goodsParams: [...this.goodsParams],
          savedAt: new Date().toLocaleString(),
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        this.draftInfo = { hasDraft: true, savedAt: draft.savedAt }
      }, 500)
    },

    checkDraft() {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return
        const draft = JSON.parse(raw)
        this.draftInfo = { hasDraft: true, savedAt: draft.savedAt }
      } catch (e) { /* ignore */ }
    },

    restoreDraft() {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return
        const draft = JSON.parse(raw)
        this.goods = { ...this.goods, ...draft.goods }
        this.selectedSceneIds = draft.selectedSceneIds || []
        this.keywords = draft.keywords || []
        this.goodsParams = draft.goodsParams || []
        this.galleryFileList = (this.goods.gallery || []).map(url => ({ url, name: url }))
        this.$message.success('已恢复草稿')
      } catch (e) {
        this.$message.error('草稿恢复失败')
      }
    },

    clearDraft() {
      localStorage.removeItem(DRAFT_KEY)
      this.draftInfo = { hasDraft: false, savedAt: '' }
    },

    // ==================== 提交 ====================

    collectData(status) {
      if (!this.goods.isSpecialPrice) {
        this.goods.specialPrice = null
      }

      const sceneNames = this.selectedSceneIds.map(id => {
        const s = this.sceneList.find(item => item.value === id)
        return s ? s.label : null
      }).filter(Boolean)

      const params = this.goodsParams.filter(p => p.key.trim())

      return {
        goods: {
          ...this.goods,
          status,
          scene_tags: sceneNames,
          goods_params: params,
          cat_id: this.goods.categoryId || 0,
        },
        specifications: [],
        products: [],
        attributes: [],
      }
    },

    async handleSaveDraft() {
      this.$refs.goodsForm.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        try {
          await publishGoods(this.collectData('draft'))
          this.$notify.success({ title: '成功', message: '草稿保存成功' })
          this.clearDraft()
          this.$store.dispatch('tagsView/delView', this.$route)
          this.$router.push('/goods/list')
        } catch (error) {
          const errMsg = error?.response?.data?.errmsg || error?.data?.errmsg || error?.message || '未知错误'
          MessageBox.alert('操作失败：' + errMsg, '警告', { confirmButtonText: '确定', type: 'error' })
        } finally {
          this.submitting = false
        }
      })
    },

    async handlePublish() {
      this.$refs.goodsForm.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        try {
          await publishGoods(this.collectData('published'))
          this.$notify.success({ title: '成功', message: '上架成功' })
          this.clearDraft()
          this.$store.dispatch('tagsView/delView', this.$route)
          this.$router.push('/goods/list')
        } catch (error) {
          const errMsg = error?.response?.data?.errmsg || error?.data?.errmsg || error?.message || '未知错误'
          MessageBox.alert('操作失败：' + errMsg, '警告', { confirmButtonText: '确定', type: 'error' })
        } finally {
          this.submitting = false
        }
      })
    },

    handleCancel() {
      this.$store.dispatch('tagsView/delView', this.$route)
      this.$router.push({ path: '/goods/list' })
    },
  }
}
</script>
