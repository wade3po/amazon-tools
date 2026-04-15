const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 抓取商品
  scrapeProducts: (urls) => ipcRenderer.invoke('scrape-products', urls),

  // 监听抓取进度
  onScrapeProgress: (callback) => {
    ipcRenderer.on('scrape-progress', (event, data) => callback(data));
  },

  // 移除进度监听
  removeScrapeProgressListener: () => {
    ipcRenderer.removeAllListeners('scrape-progress');
  },

  // 导出 Excel
  exportExcel: (products) => ipcRenderer.invoke('export-excel', products),
});
