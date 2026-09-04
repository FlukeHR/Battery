import { APP_CONFIG } from "../../config/environment";

Page({
  onCopyWebsite() {
    wx.setClipboardData({
      data: `${APP_CONFIG.webBaseUrl}/contact`,
      success: () => wx.showToast({ title: "网址已复制", icon: "success" }),
    });
  },
});
