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

  // 批量合并标签（中文×1 + 英文×N）
  batchMergeLabels: (options) => ipcRenderer.invoke('batch-merge-labels', options),
  onBatchMergeProgress: (callback) => {
    ipcRenderer.on('batch-merge-progress', (event, data) => callback(data));
  },
  removeBatchMergeProgressListener: () => {
    ipcRenderer.removeAllListeners('batch-merge-progress');
  },

  // 解析 Excel 获取产品列表（标签打印用）
  parseExcelForLabels: (options) => ipcRenderer.invoke('parse-excel-for-labels', options),

  // 用系统默认程序打开文件
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),

  // 图片转换（PNG → JPG）
  convertImages: (options) => ipcRenderer.invoke('convert-images', options),

  // 选择图片文件
  selectImageFiles: () => ipcRenderer.invoke('select-image-files'),

  // 批量转换：扫描大文件夹两级子目录
  scanImageFolder: () => ipcRenderer.invoke('scan-image-folder'),
  convertImagesInPlace: (options) => ipcRenderer.invoke('convert-images-in-place', options),

  // 图片重命名
  scanImageFolderForRename: () => ipcRenderer.invoke('scan-image-folder-for-rename'),
  renameImages: (options) => ipcRenderer.invoke('rename-images', options),
  readImageAsBase64: (filePath) => ipcRenderer.invoke('read-image-as-base64', filePath),

  // 图片重命名
  scanImagesForRename: () => ipcRenderer.invoke('scan-images-for-rename'),
  renameImages: (options) => ipcRenderer.invoke('rename-images', options),

  // AI 标记写入
  selectImageFilesForTag: () => ipcRenderer.invoke('select-image-files-for-tag'),
  selectImageFolderForTag: () => ipcRenderer.invoke('select-image-folder-for-tag'),
  writeXmpAiTags: (options) => ipcRenderer.invoke('write-xmp-ai-tags', options),
  readXmpAiTags: (files) => ipcRenderer.invoke('read-xmp-ai-tags', files),

  // 历史中文标签重排
  selectChineseLabelFolder: () => ipcRenderer.invoke('select-chinese-label-folder'),
  shiftChineseLabelText: (options) => ipcRenderer.invoke('shift-chinese-label-text', options),
  regenerateChineseLabels: (options) => ipcRenderer.invoke('regenerate-chinese-labels', options),
});
