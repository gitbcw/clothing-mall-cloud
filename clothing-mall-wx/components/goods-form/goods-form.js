const util = require('../../utils/util.js');

Component({
  options: {
    styleIsolation: 'isolated'
  },

  properties: {
    value: {
      type: Object,
      value: {}
    },
    mode: {
      type: String,
      value: 'create'
    },
    features: {
      type: Object,
      value: {}
    },
    loading: {
      type: Boolean,
      value: false
    },
    presetScenes: {
      type: Array,
      value: []
    },
    showTabBar: {
      type: Boolean,
      value: false
    },
    categoryList: {
      type: Array,
      value: []
    },
    goodsStatus: {
      type: String,
      value: ''
    },
    isOnSale: {
      type: Boolean,
      value: false
    }
  },

  data: {
    _form: {},
    _galleryList: [],
    _scenes: [],
    _sceneMap: {},
    _params: [],
    tagRecognizing: false,
    imageRecognizing: false,
    showCategoryPicker: false,
    editorCtx: null,
    formats: {}
  },

  observers: {
    'value': function(val) {
      if (!val || !Object.keys(val).length) return;
      var scenes = val.scenes || [];
      this.setData({
        _form: {
          picUrl: val.picUrl || '',
          gallery: val.gallery || [],
          name: val.name || '',
          brief: val.brief || '',
          detail: val.detail || '',
          retailPrice: val.retailPrice || '',
          specialPrice: val.specialPrice || '',
          categoryId: val.categoryId || '',
          categoryName: val.categoryName || '',
          keywords: val.keywords || ''
        },
        _galleryList: val.gallery || [],
        _scenes: scenes,
        _sceneMap: this._buildSceneMap(scenes),
        _params: val.params || []
      });

      // editor 就绪后设置已有内容
      var that = this;
      if (val.detail && this._editorReady) {
        this._editorReady.then(function() {
          var html = val.detail;
          if (html.indexOf('<') === -1) {
            html = '<p>' + html.replace(/\n/g, '</p><p>') + '</p>';
          }
          that.data.editorCtx.setContents({ html: html });
        });
      }
    }
  },

  lifetimes: {
    attached: function() {
      var that = this;
      this._editorReady = new Promise(function(resolve) {
        that._resolveEditorReady = resolve;
      });
    }
  },

  methods: {
    // ========== 富文本编辑器 ==========

    onEditorReady: function() {
      var that = this;
      this.createSelectorQuery()
        .select('#editor')
        .context(function(res) {
          if (res && res.context) {
            that.setData({ editorCtx: res.context });
            if (that._resolveEditorReady) {
              that._resolveEditorReady();
            }
          }
        })
        .exec();
    },

    onEditorStatusChange: function(e) {
      this.setData({ formats: e.detail });
    },

    formatBold: function() {
      if (this.data.editorCtx) this.data.editorCtx.format('bold');
    },

    formatItalic: function() {
      if (this.data.editorCtx) this.data.editorCtx.format('italic');
    },

    formatHeader: function(e) {
      if (!this.data.editorCtx) return;
      var level = e.currentTarget.dataset.level;
      this.data.editorCtx.format('header', level);
    },

    insertImage: function() {
      var that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function(res) {
          var tempPath = res.tempFilePaths[0];
          wx.showLoading({ title: '上传中...' });
          that.uploadImage(tempPath, function(url) {
            wx.hideLoading();
            if (url) {
              that.data.editorCtx.insertImage({
                src: url,
                width: '100%'
              });
            } else {
              wx.showToast({ title: '图片上传失败', icon: 'none' });
            }
          });
        }
      });
    },

    // ========== 图片操作 ==========

    chooseMainImage: function() {
      var that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function(res) {
          var tempPath = res.tempFilePaths[0];
          that.setData({ '_form.picUrl': tempPath });
          that.uploadImage(tempPath, function(url) {
            if (url) {
              that.setData({ '_form.picUrl': url });
              that._emitChange();
              // 自动触发主图 AI 识别（使用本地临时文件，避免重复下载）
              that.recognizeImage(tempPath);
            } else {
              wx.showToast({ title: '主图上传失败，请重试', icon: 'none' });
            }
          });
        }
      });
    },

    recognizeImage: function(localFilePath) {
      if (this.data.imageRecognizing) return;

      var that = this;
      that.setData({ imageRecognizing: true });

      // 先上传到云存储，再调用 AI 云函数识别
      util.uploadFile(localFilePath, 'ai').then(function(fileID) {
        return util.request({ func: 'wx-ai', action: 'recognizeImage' }, { fileID: fileID }, 'POST');
      }).then(function(res) {
        that.setData({ imageRecognizing: false });
        if (res.errno === 0 && res.data) {
          that._applyImageRecognition(res.data);
        } else {
          wx.showToast({ title: res.errmsg || '识别失败', icon: 'none' });
        }
      }).catch(function(err) {
        that.setData({ imageRecognizing: false });
        console.error('recognizeImage fail:', JSON.stringify(err));
        wx.showToast({ title: '识别请求失败', icon: 'none', duration: 3000 });
      });
    },

    /**
     * 应用主图识别结果到表单（仅填充空字段）
     */
    _applyImageRecognition: function(result) {
      var updates = {};
      var hasUpdate = false;

      // 名称（仅空时填充）
      if (result.name && !this.data._form.name) {
        updates['_form.name'] = result.name;
        hasUpdate = true;
      }

      // 价格（仅空时填充）
      if (result.price && !this.data._form.retailPrice) {
        updates['_form.retailPrice'] = result.price;
        hasUpdate = true;
      }

      // 简介（仅空时填充）
      if (result.brief && !this.data._form.brief) {
        updates['_form.brief'] = result.brief;
        hasUpdate = true;
      }

      // 分类（仅空时填充，需匹配 categoryList，支持模糊匹配）
      if (result.category && !this.data._form.categoryId) {
        var categoryList = this.data.categoryList || [];
        var matched = false;
        // 精确匹配
        for (var i = 0; i < categoryList.length; i++) {
          if (categoryList[i].name === result.category) {
            updates['_form.categoryId'] = categoryList[i].id;
            updates['_form.categoryName'] = categoryList[i].name;
            hasUpdate = true;
            matched = true;
            break;
          }
        }
        // 模糊匹配：AI 返回的名称包含分类名，或分类名包含 AI 返回的名称
        if (!matched) {
          for (var i = 0; i < categoryList.length; i++) {
            var catName = categoryList[i].name;
            if (catName.indexOf(result.category) > -1 || result.category.indexOf(catName) > -1) {
              updates['_form.categoryId'] = categoryList[i].id;
              updates['_form.categoryName'] = categoryList[i].name;
              hasUpdate = true;
              break;
            }
          }
        }
      }

      // 场景（追加不重复的场景，仅匹配 presetScenes）
      if (result.scenes && result.scenes.length > 0) {
        var currentScenes = (this.data._scenes || []).slice();
        var sceneMap = this.data._sceneMap || {};
        var presetScenes = this.data.presetScenes || [];
        var changed = false;
        for (var j = 0; j < result.scenes.length; j++) {
          var sceneName = result.scenes[j];
          // 匹配 presetScenes 中的场景（精确或包含）
          var matchedScene = null;
          for (var k = 0; k < presetScenes.length; k++) {
            if (presetScenes[k] === sceneName ||
                presetScenes[k].indexOf(sceneName) > -1 ||
                sceneName.indexOf(presetScenes[k]) > -1) {
              matchedScene = presetScenes[k];
              break;
            }
          }
          if (matchedScene && !sceneMap[matchedScene]) {
            currentScenes.push(matchedScene);
            sceneMap[matchedScene] = true;
            changed = true;
          }
        }
        if (changed) {
          updates['_scenes'] = currentScenes;
          updates['_sceneMap'] = sceneMap;
          hasUpdate = true;
        }
      }

      if (hasUpdate) {
        this.setData(updates);
        this._emitChange();
        wx.showToast({ title: 'AI 识别成功', icon: 'success' });
      } else {
        wx.showToast({ title: '已手动填写，未覆盖', icon: 'none' });
      }
    },

    recognizeTag: function() {
      if (this.data.tagRecognizing) return;

      var that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function(res) {
          var tempPath = res.tempFilePaths[0];
          that.setData({ tagRecognizing: true });

          // 先上传到云存储，再调用 AI 云函数识别
          util.uploadFile(tempPath, 'ai').then(function(fileID) {
            return util.request({ func: 'wx-ai', action: 'recognizeTag' }, { fileID: fileID }, 'POST');
          }).then(function(res) {
            that.setData({ tagRecognizing: false });
            if (res.errno === 0 && res.data) {
              var updates = {};
              // 吊牌识别总是覆盖（吊牌信息更准确）
              if (res.data.name) {
                updates['_form.name'] = res.data.name;
              }
              if (res.data.price) {
                updates['_form.retailPrice'] = res.data.price;
              }
              if (Object.keys(updates).length > 0) {
                that.setData(updates);
                that._emitChange();
                wx.showToast({ title: '吊牌识别成功', icon: 'success' });
              } else {
                wx.showToast({ title: '未识别到有效信息', icon: 'none' });
              }
            } else {
              wx.showToast({ title: res.errmsg || '识别失败', icon: 'none' });
            }
          }).catch(function() {
            that.setData({ tagRecognizing: false });
            wx.showToast({ title: '识别请求失败', icon: 'none' });
          });
        }
      });
    },

    chooseGalleryImage: function() {
      var remaining = 9 - this.data._galleryList.length;
      if (remaining <= 0) return;
      var that = this;
      wx.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function(res) {
          var tasks = res.tempFilePaths.map(function(path) {
            return new Promise(function(resolve) {
              that.uploadImage(path, resolve);
            });
          });
          Promise.all(tasks).then(function(urls) {
            var validUrls = urls.filter(function(u) { return u; });
            that.setData({
              _galleryList: that.data._galleryList.concat(validUrls)
            });
            that._emitChange();
          });
        }
      });
    },

    removeGallery: function(e) {
      var index = e.currentTarget.dataset.index;
      this.data._galleryList.splice(index, 1);
      this.setData({ _galleryList: this.data._galleryList });
      this._emitChange();
    },

    uploadImage: function(filePath, callback) {
      util.uploadFile(filePath).then(function(url) {
        callback(url);
      }).catch(function() {
        callback(null);
      });
    },

    // ========== 表单输入 ==========

    onNameInput: function(e) {
      this.setData({ '_form.name': e.detail.value });
      this._emitChange();
    },

    onBriefInput: function(e) {
      this.setData({ '_form.brief': e.detail.value });
      this._emitChange();
    },

    onRetailPriceInput: function(e) {
      this.setData({ '_form.retailPrice': e.detail.value });
      this._emitChange();
    },

    onSpecialPriceInput: function(e) {
      this.setData({ '_form.specialPrice': e.detail.value });
      this._emitChange();
    },

    onKeywordsInput: function(e) {
      this.setData({ '_form.keywords': e.detail.value });
      this._emitChange();
    },

    // ========== 分类选择 ==========

    onShowCategoryPicker: function() {
      var categoryId = this.data._form.categoryId;
      var categoryList = this.data.categoryList || [];
      var pendingIndex = null;

      // 找到当前选中分类对应的索引
      if (categoryId) {
        for (var i = 0; i < categoryList.length; i++) {
          if (categoryList[i].id === categoryId) {
            pendingIndex = i;
            break;
          }
        }
      }

      this.setData({
        showCategoryPicker: true,
        _pendingCategoryIndex: pendingIndex
      });
    },

    onCategoryChange: function(e) {
      this.setData({ _pendingCategoryIndex: e.detail.index });
    },

    onCategoryConfirm: function() {
      var index = this.data._pendingCategoryIndex;
      if (index != null) {
        var category = this.data.categoryList[index];
        if (category) {
          this.setData({
            '_form.categoryId': category.id,
            '_form.categoryName': category.name,
            showCategoryPicker: false
          });
          this._emitChange();
          return;
        }
      }
      this.setData({ showCategoryPicker: false });
    },

    onCategoryClose: function() {
      this.setData({ showCategoryPicker: false });
    },

    // ========== 场景标签 ==========

    _buildSceneMap: function(scenes) {
      var map = {};
      (scenes || []).forEach(function(s) { map[s] = true; });
      return map;
    },

    onSceneToggle: function(e) {
      var scene = e.currentTarget.dataset.scene;
      var scenes = (this.data._scenes || []).slice();
      var index = scenes.indexOf(scene);
      if (index > -1) {
        scenes.splice(index, 1);
      } else {
        scenes.push(scene);
      }
      this.setData({ _scenes: scenes, _sceneMap: this._buildSceneMap(scenes) });
      this._emitChange();
    },

    // ========== 商品参数 ==========

    addParam: function() {
      this.data._params.push({ key: '', value: '' });
      this.setData({ _params: this.data._params });
      this._emitChange();
    },

    removeParam: function(e) {
      var index = e.currentTarget.dataset.index;
      this.data._params.splice(index, 1);
      this.setData({ _params: this.data._params });
      this._emitChange();
    },

    onParamKeyInput: function(e) {
      var index = e.currentTarget.dataset.index;
      this.setData({ ['_params[' + index + '].key']: e.detail.value });
      this._emitChange();
    },

    onParamValueInput: function(e) {
      var index = e.currentTarget.dataset.index;
      this.setData({ ['_params[' + index + '].value']: e.detail.value });
      this._emitChange();
    },

    // ========== 验证 ==========

    validateForm: function() {
      if (!this.data._form.name || !this.data._form.name.trim()) {
        wx.showToast({ title: '请输入商品名称', icon: 'none' });
        return false;
      }
      if (this.data.mode === 'create' && !this.data._form.retailPrice) {
        wx.showToast({ title: '请输入一口价', icon: 'none' });
        return false;
      }
      return true;
    },

    // ========== 数据收集 ==========

    getFormData: function() {
      var form = this.data._form;
      var that = this;
      var data = {
        name: form.name,
        brief: form.brief || '',
        detail: form.detail || '',
        picUrl: form.picUrl || '',
        gallery: this.data._galleryList,
        retailPrice: form.retailPrice ? parseFloat(form.retailPrice) : null,
        specialPrice: form.specialPrice ? parseFloat(form.specialPrice) : null,
        categoryId: form.categoryId || null,
        keywords: form.keywords || '',
        scenes: this.data._scenes,
        params: this.data._params.filter(function(p) {
          return p.key && p.key.trim();
        })
      };

      // 从 editor 获取最新 HTML
      if (that.data.editorCtx) {
        return new Promise(function(resolve) {
          that.data.editorCtx.getContents({
            success: function(res) {
              data.detail = res.html;
              resolve(data);
            },
            fail: function() {
              resolve(data);
            }
          });
        });
      }
      return Promise.resolve(data);
    },

    // ========== 事件触发 ==========

    _emitChange: function() {
      this.triggerEvent('change', {
        formData: {
          picUrl: this.data._form.picUrl,
          gallery: this.data._galleryList,
          name: this.data._form.name,
          brief: this.data._form.brief,
          detail: this.data._form.detail,
          retailPrice: this.data._form.retailPrice,
          specialPrice: this.data._form.specialPrice,
          categoryId: this.data._form.categoryId,
          categoryName: this.data._form.categoryName,
          keywords: this.data._form.keywords,
          scenes: this.data._scenes,
          params: this.data._params
        }
      });
    },

    // ========== 底部按钮 ==========

    onPreview: function() {
      if (!this.validateForm()) return;
      var that = this;
      this.getFormData().then(function(data) {
        var previewData = {
          picUrl: data.picUrl,
          name: data.name,
          brief: data.brief,
          detail: data.detail,
          retailPrice: data.retailPrice,
          specialPrice: data.specialPrice,
          isSpecialPrice: data.specialPrice && parseFloat(data.specialPrice) > 0,
          categoryId: data.categoryId,
          categoryName: that.data._form.categoryName,
          scenes: data.scenes || [],
          gallery: data.gallery || [],
          params: data.params || []
        };
        try {
          wx.setStorageSync('previewGoodsData', previewData);
        } catch (e) {
          console.error('保存预览数据失败', e);
        }
        that.triggerEvent('preview', { formData: data });
      });
    },

    onSaveDraft: function() {
      if (!this.validateForm()) return;
      var that = this;
      this.getFormData().then(function(data) {
        that.triggerEvent('save', { formData: data });
      });
    },

    onPublish: function() {
      if (!this.validateForm()) return;
      var that = this;
      this.getFormData().then(function(data) {
        that.triggerEvent('publish', { formData: data });
      });
    },

    onUnpublish: function() {
      this.triggerEvent('unpublish', {});
    }
  }
});
