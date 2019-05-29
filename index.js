const app = getApp()
var videoUtil = require("../../utils/videoUtils.js")

Page({
  data: {
    serverUrl: app.serverUrl,
    
    //用于分页的属性
    totalPage: 1,
    page: 1,
    videoList: [],

    //获取屏幕宽度
    screenWidth:0,
    screenHeight:0,
    imgWidth:0,

    //分列
    colLeft: [],
    colRight: [],

    //两列高度
    colHeightLeft :0,
    colHeightRight :0,

    //加载页面时间，实现乐观锁
    loadTime: ""
  },

  onLoad: function () {
    var me = this;
    var user = app.getGlobalUserInfo();
    if (user.isMaster == 1){
      wx.redirectTo({
        url: '../admin/admin',
      })
    }
    me.load();
  },

  load: function() {
    var me = this;
    var serverUrl = app.serverUrl;
    //设置屏幕宽度
    var screenWidth = wx.getSystemInfoSync().screenWidth;
    var screenHeight = wx.getSystemInfoSync().screenHeight;
    me.setData({
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      imgWidth: 0.495 * screenWidth,
    });
    //获取当前的分页数
    me.getAllVideoList(1);
  },

  imageLoad: function (videoInfo) {
    var me = this;
    var oImgW = videoInfo.videoWidth; //图片原始宽度
    var oImgH = videoInfo.videoHeight; //图片原始高度
    var imgWidth = this.data.imgWidth;  //图片设置的宽度
    var colHeightLeft = me.data.colHeightLeft;
    var colHeightRight = me.data.colHeightRight;

    var scale = imgWidth / oImgW;
    var imgHeight = oImgH * scale; //自适应高度

    if (colHeightLeft <= colHeightRight) {
      //放左列
      colHeightLeft = colHeightLeft + imgHeight;
      me.setData({
        colHeightLeft: colHeightLeft
      })
      return true;
    }
    else {
      //放右列
      colHeightRight = colHeightRight + imgHeight;
      me.setData({
        colHeightRight: colHeightRight
      })
      return false;
    }
  },

  getAllVideoList: function (page) {
    var me = this;
    var serverUrl = app.serverUrl;
    //加载提示
    wx.showLoading({
      title: '正在加载...',
    });
    if(page === 1){
      me.setData({
        //设置加载时间
        loadTime: videoUtil.getNowFormatDate()
      });
      //获取总页数
      wx.request({
        url: serverUrl + '/video/getVideosCounts?time=' + me.data.loadTime,
        method: "POST",
        header:{
          'content-type': 'application/json' //默认值
        },
        //回调
        success: function (res) {
          var status = res.data.status;
          if (status == 200) {
            me.setData({
              totalPage: res.data.data
            })
          }
          if (status == 500) {
            wx.showToast({
              title: '发生未知错误',
              icon: "none"
            })
            return;
          }
        },
        fail: function(){
          wx.showToast({
            title: '连接超时...',
            icon: "none"
          })
        }
      })
    }

    //请求后端
    wx.request({
      url: serverUrl + '/video/showAllVideo?page=' + page + '&time=' + me.data.loadTime,
      method: "POST",
      header: {
        'content-type': 'application/json' //默认值
      },
      //回调
      success: function (res) {
        //隐藏加载提示
        wx.hideLoading();
        wx.hideNavigationBarLoading();
        wx.stopPullDownRefresh();
        //状态判断 200-成功 500-错误 502-被拦截
        var status = res.data.status;
        if (status == 200){
          //判断当前页page是否是第一页，如果是第一页，那么设置videoList为空
          if (page === 1) {
            me.setData({
              videoList: [],
              colLeft: [],
              colRight: []
            });
          }
          var videoList = res.data.data
          var newVideoList = me.data.videoList;
          var allvideoList = newVideoList.concat(videoList)
          //判断视频放在哪一列
          var colLeft = me.data.colLeft;
          var colRight = me.data.colRight;
          for (var i = 0; i < videoList.length; i++) {
            //返回1放左列,0放右列
            var result = me.imageLoad(videoList[i])
            if (!result){
              colRight.push(videoList[i]);
            }
            else{
              colLeft.push(videoList[i]);
            }
          }
          me.setData({
            videoList: allvideoList,
            colLeft: colLeft,
            colRight: colRight,
            page: page,
          })
        }
        else if (status == 500){
          wx.showToast({
            title: res.data.msg,
            icon: 'none',
            duration: 2000
          })
        }
      },
      fail: function () {
        wx.showToast({
          title: '连接超时...',
          icon: "none"
        })
      }
    })
  },

  //下拉刷新
  onPullDownRefresh: function(){
    var me = this;
    wx.showNavigationBarLoading();
    me.setData({
      videoList: [],
      colHeightLeft: 0,
      colHeightRight: 0,
    })
    me.load();
  },

  //上拉刷新
  onReachBottom: function(){
    var me = this;
    //判断当前页数和总页数是否相等，如果相等则无需查询
    if (me.data.page === me.data.totalPage){
      wx.showToast({
        title: '已经没有视频啦...',
        icon: "none"
      })
      return;
    }
    var page = me.data.page + 1;
    me.getAllVideoList(page, 0);
  },

  showVideoInfo: function (e) {
    var me = this;
    var serverUrl = app.serverUrl;
    //获取下标
    var arrindex = e.target.dataset.arrindex;
    var videoInfo = ''
    if(e.target.id=="right"){
      wx.request({
        url: serverUrl + '/video/isVideoExist/?videoId=' + me.data.colRight[arrindex].id,
        method: "POST",
        header: {
          'content-type': 'application/json' // 默认值
        },
        //回调
        success: function (res) {
          var status = res.data.status;
          if (status == 200) {
            videoInfo = JSON.stringify(me.data.colRight[arrindex]);
            //跳转到视频展示页
            wx.navigateTo({
              url: '../videoInfo/videoInfo?videoInfo=' + videoInfo
            })
          }
          else if (status == 500) {
            wx.showToast({
              title: res.data.msg,
              icon: 'none',
              duration: 2000
            })
            return;
          }
        },
        fail: function () {
          wx.showToast({
            title: '连接超时...',
            icon: "none"
          })
        }
      });
    }
    else if (e.target.id == "left"){
      wx.request({
        url: serverUrl + '/video/isVideoExist/?videoId=' + me.data.colLeft[arrindex].id,
        method: "POST",
        header: {
          'content-type': 'application/json' // 默认值
        },
        //回调
        success: function (res) {
          var status = res.data.status;
          if (status == 200) {
            videoInfo = JSON.stringify(me.data.colLeft[arrindex]);
            //跳转到视频展示页
            wx.navigateTo({
              url: '../videoInfo/videoInfo?videoInfo=' + videoInfo
            })
          }
          else if (status == 500) {
            wx.showToast({
              title: res.data.msg,
              icon: 'none',
              duration: 2000
            })
            return;
          }
        },
        fail: function () {
          wx.showToast({
            title: '连接超时...',
            icon: "none"
          })
        }
      });
    }
  }
})

