const HOME_REFRESH_KEY = 'homeRefreshNeeded';

function markHomeRefreshNeeded() {
  wx.setStorageSync(HOME_REFRESH_KEY, {
    needed: true,
    markedAt: Date.now()
  });
}

function consumeHomeRefreshNeeded() {
  const flag = wx.getStorageSync(HOME_REFRESH_KEY);
  if (flag && flag.needed) {
    wx.removeStorageSync(HOME_REFRESH_KEY);
    return true;
  }
  return false;
}

module.exports = {
  markHomeRefreshNeeded,
  consumeHomeRefreshNeeded
};
