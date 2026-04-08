var util = require('../../../utils/util.js');
var api = require('../../../config/api.js');

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    isEdit: false,
    issueId: null,
    form: {
      question: '',
      answer: ''
    },
    saving: false
  },

  onLoad: function(options) {
    var system = wx.getDeviceInfo().system || '';
    var statusBarHeight = wx.getWindowInfo().statusBarHeight;
    var isIOS = system.indexOf('iOS') > -1;
    this.setData({
      statusBarHeight: statusBarHeight,
      navBarHeight: isIOS ? 44 : 48
    });

    if (options.id) {
      this.setData({ isEdit: true, issueId: parseInt(options.id) });
      this.loadIssue(parseInt(options.id));
    }
  },

  loadIssue: function(id) {
    var that = this;
    util.request(api.ManagerIssueList, { question: '', page: 1, limit: 1, sort: 'id', order: 'asc' }, 'GET').then(function(res) {
      var list = (res.data && res.data.list) || [];
      var issue = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          issue = list[i];
          break;
        }
      }
      if (issue) {
        that.setData({
          form: {
            question: issue.question || '',
            answer: issue.answer || ''
          }
        });
      }
    });
  },

  onInputQuestion: function(e) {
    this.setData({ 'form.question': e.detail.value });
  },

  onInputAnswer: function(e) {
    this.setData({ 'form.answer': e.detail.value });
  },

  onSave: function() {
    var that = this;
    var form = this.data.form;

    if (!form.question || !form.question.trim()) {
      wx.showToast({ title: '请输入问题', icon: 'none' });
      return;
    }

    if (!form.answer || !form.answer.trim()) {
      wx.showToast({ title: '请输入回答', icon: 'none' });
      return;
    }

    that.setData({ saving: true });

    var requestData = {
      question: form.question.trim(),
      answer: form.answer.trim()
    };

    var requestUrl;
    if (that.data.isEdit) {
      requestData.id = that.data.issueId;
      requestUrl = api.ManagerIssueUpdate;
    } else {
      requestUrl = api.ManagerIssueCreate;
    }

    util.request(requestUrl, requestData, 'POST').then(function(res) {
      that.setData({ saving: false });
      if (res.errno === 0) {
        wx.showToast({ title: that.data.isEdit ? '保存成功' : '创建成功', icon: 'success' });
        setTimeout(function() {
          wx.navigateBack();
        }, 800);
      } else {
        wx.showToast({ title: res.errmsg || '操作失败', icon: 'none' });
      }
    }).catch(function() {
      that.setData({ saving: false });
    });
  },

  onBack: function() {
    wx.navigateBack();
  }
});
