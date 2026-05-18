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

  // PDF 相关
  selectPdfFiles: () => ipcRenderer.invoke('select-pdf-files'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  selectExcelFile: () => ipcRenderer.invoke('select-excel-file'),
  buildSkuMap: (options) => ipcRenderer.invoke('build-sku-map', options),
  processPdfFiles: (options) => ipcRenderer.invoke('process-pdf-files', options),
  splitPdfLabels: (options) => ipcRenderer.invoke('split-pdf-labels', options),
  writeExcelLinks: (options) => ipcRenderer.invoke('write-excel-links', options),
  generateChineseLabelPdf: (options) => ipcRenderer.invoke('generate-chinese-label-pdf', options),

  // FBA 标签清理（去除发货地信息和目的地公司名称）
  cleanFbaLabels: (options) => ipcRenderer.invoke('clean-fba-labels', options),

  // 生成单个中文标签 PDF 并用系统默认程序打开
  generateAndOpenChineseLabel: (options) => ipcRenderer.invoke('generate-and-open-chinese-label', options),

  // 用系统默认程序打开文件
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
});
