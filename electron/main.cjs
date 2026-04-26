const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'Amazon 商品抓取工具',
    show: false,
  });

  if (isDev) {
    // 自动探测 Vite 端口，从 5173 开始往上找
    const devPort = await findVitePort(5178, 5200);
    if (!devPort) {
      mainWindow.loadURL('data:text/html,<h2>未找到 Vite 开发服务器，请先运行 npx vite</h2>');
    } else {
      mainWindow.loadURL(`http://localhost:${devPort}`);
    }
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ========== IPC: 抓取商品 ==========
ipcMain.handle('scrape-products', async (event, urls) => {
  const { chromium } = require('playwright');

  const results = [];
  let browser;

  try {
    // 查找浏览器路径（打包后从 extraResources 读取）
    const browserPath = app.isPackaged
      ? path.join(process.resourcesPath, 'playwright-browsers')
      : undefined;

    browser = await chromium.launch({
      headless: true,
      executablePath: browserPath ? findChromiumExecutable(browserPath) : undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      // 通知前端进度
      event.sender.send('scrape-progress', {
        current: i + 1,
        total: urls.length,
        url,
        status: 'scraping',
      });

      try {
        const product = await scrapeAmazonProduct(browser, url);
        results.push({ ...product, url, status: 'success' });
        event.sender.send('scrape-progress', {
          current: i + 1,
          total: urls.length,
          url,
          status: 'done',
          product,
        });
      } catch (err) {
        results.push({ url, status: 'error', error: err.message });
        event.sender.send('scrape-progress', {
          current: i + 1,
          total: urls.length,
          url,
          status: 'error',
          error: err.message,
        });
      }

      // 随机延迟 1-3 秒，避免被封
      if (i < urls.length - 1) {
        await sleep(1000 + Math.random() * 2000);
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  return results;
});

// ========== IPC: 导出 Excel ==========
ipcMain.handle('export-excel', async (event, products) => {
  const { saveDialog } = dialog;

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '保存 Excel 文件',
    defaultPath: `amazon_products_${Date.now()}.xlsx`,
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
  });

  if (!filePath) return { success: false, reason: 'cancelled' };

  try {
    const XLSX = require('xlsx');

    // 先算出所有商品中最多有几条 bullet
    const maxBullets = products.reduce((max, p) => Math.max(max, (p.bullets || []).length), 0);

    const data = products.map((p, index) => {
      const row = {
        '序号': index + 1,
        '类目': p.category || '',
        '商品标题': p.title || '',
        '价格': p.price || '',
        '评分': p.rating || '',
        '评论数': p.reviewCount || '',
        'ASIN': p.asin || '',
        '品牌': p.brand || '',
        '是否有货': p.availability || '',
        '商品链接': p.url || '',
        '图片链接': p.imageUrl || '',
      };
      // 动态添加 bullet 列
      for (let i = 0; i < maxBullets; i++) {
        row[`描述${i + 1}`] = (p.bullets && p.bullets[i]) ? p.bullets[i] : '';
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // 设置列宽
    const colWidths = [
      { wch: 6 },   // 序号
      { wch: 30 },  // 类目
      { wch: 60 },  // 标题
      { wch: 15 },  // 价格
      { wch: 8 },   // 评分
      { wch: 10 },  // 评论数
      { wch: 15 },  // ASIN
      { wch: 20 },  // 品牌
      { wch: 10 },  // 是否有货
      { wch: 60 },  // 链接
      { wch: 60 },  // 图片链接
    ];
    for (let i = 0; i < maxBullets; i++) {
      colWidths.push({ wch: 80 });
    }
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品数据');
    XLSX.writeFile(wb, filePath);

    return { success: true, filePath };
  } catch (err) {
    return { success: false, reason: err.message };
  }
});

// ========== IPC: 选择 PDF 文件 ==========
ipcMain.handle('select-pdf-files', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '选择 PDF 文件',
    filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    properties: ['openFile', 'multiSelections'],
  });
  return filePaths || [];
});

// ========== IPC: 选择输出文件夹 ==========
ipcMain.handle('select-output-folder', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '选择输出文件夹',
    properties: ['openDirectory', 'createDirectory'],
  });
  return filePaths?.[0] || null;
});

// ========== IPC: 选择 Excel 文件并读取列名 ==========
ipcMain.handle('select-excel-file', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '选择 SKU 对照表',
    filters: [{ name: 'Excel 文件', extensions: ['xlsx', 'xls', 'csv'] }],
    properties: ['openFile'],
  });
  if (!filePaths || filePaths.length === 0) return null;

  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePaths[0]);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // 自动查找表头行：找包含 "SKU" 或 "FNSKU" 的行
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = (allRows[i] || []).map((c) => String(c).toUpperCase());
    if (row.some((c) => c.includes('SKU') || c.includes('FNSKU'))) {
      headerRowIdx = i;
      break;
    }
  }

  const columns = (allRows[headerRowIdx] || []).map((c) => String(c).trim()).filter(Boolean);
  return { filePath: filePaths[0], columns, headerRowIdx };
});

// ========== IPC: 构建 FNSKU → SKU 映射 ==========
ipcMain.handle('build-sku-map', async (event, options) => {
  const XLSX = require('xlsx');
  const { filePath, skuColumn, fnskuColumn, nameColumn } = options;

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // 找到表头行
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = (allRows[i] || []).map((c) => String(c).toUpperCase());
    if (row.some((c) => c.includes('SKU') || c.includes('FNSKU'))) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = (allRows[headerRowIdx] || []).map((c) => String(c).trim());
  const skuIdx = headers.indexOf(skuColumn);
  const fnskuIdx = headers.indexOf(fnskuColumn);
  const nameIdx = nameColumn ? headers.indexOf(nameColumn) : -1;

  const map = {};
  const preview = [];

  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i] || [];
    const fnsku = String(row[fnskuIdx] || '').trim();
    const sku = String(row[skuIdx] || '').trim();
    const name = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
    if (fnsku && sku) {
      map[fnsku] = { sku, name };
      if (preview.length < 5) {
        preview.push({ fnsku, sku, name });
      }
    }
  }

  return { map, preview };
});

// ========== IPC: 批量处理 PDF ==========
ipcMain.handle('process-pdf-files', async (event, options) => {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
  const files = options?.files || [];
  const skuMap = options?.skuMap || {};
  const rightText = String(options?.rightText || '');
  const fontSize = Number(options?.fontSize) || 8;
  const marginBottom = Number(options?.marginBottom) || 8;
  const marginSide = Number(options?.marginSide) || 18;
  const outputFolder = options?.outputFolder || '';

  const results = [];
  const hasSKUMap = Object.keys(skuMap).length > 0;

  // skuMap 格式: { fnsku: { sku, name } } 或旧格式 { fnsku: sku }
  // 统一处理：获取 sku 值
  const getSkuFromMap = (fnsku) => {
    const val = skuMap[fnsku];
    if (!val) return '';
    return typeof val === 'object' ? (val.sku || '') : String(val);
  };

  for (const filePath of files) {
    try {
      const fileBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(fileBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // 提取每页中所有标签的位置信息（每个标签的 FNSKU 及其边界）
      const pageLabelInfos = hasSKUMap
        ? await extractPageLabels(filePath, Object.keys(skuMap))
        : [];

      const matchedPairs = []; // 记录所有匹配到的 FNSKU → SKU

      const pages = pdfDoc.getPages();
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        const { width, height } = page.getSize();
        const pageLabels = pageLabelInfos[pageIdx] || [];

        if (pageLabels.length > 0) {
          // 多标签模式：每个标签区域独立添加文字
          for (const label of pageLabels) {
            const sku = getSkuFromMap(label.fnsku);
            if (sku && !matchedPairs.find((p) => p.fnsku === label.fnsku)) {
              matchedPairs.push({ fnsku: label.fnsku, sku });
            }

            // lowestTextY 是标签内最底部文本的基线 y
            // 新文字紧贴在最底部文本下方，间距由 marginBottom 控制
            const y = label.lowestTextY - marginBottom - 2;

            // 左侧：SKU，从标签左边界开始 +4pt
            if (sku.length > 0) {
              page.drawText(sku, {
                x: label.labelLeft + 4,
                y,
                size: fontSize,
                font,
                color: rgb(0.2, 0.2, 0.2),
              });
            }

            // 右侧文字，对齐到标签右边界
            if (rightText.length > 0) {
              const rightWidth = font.widthOfTextAtSize(rightText, fontSize);
              page.drawText(rightText, {
                x: label.labelRight - rightWidth,
                y,
                size: fontSize,
                font,
                color: rgb(0.2, 0.2, 0.2),
              });
            }
          }
        } else {
          // 回退：没有检测到标签区域，使用整页模式（兼容旧的单条码 PDF）
          const y = marginBottom;

          // 尝试从整页文本匹配一个 FNSKU
          let pageSku = '';
          let pageFnsku = '';
          if (hasSKUMap) {
            const pageText = await extractSinglePageText(filePath, pageIdx + 1);
            for (const fnsku of Object.keys(skuMap)) {
              if (pageText.includes(fnsku)) {
                pageFnsku = fnsku;
                pageSku = getSkuFromMap(fnsku);
                if (!matchedPairs.find((p) => p.fnsku === fnsku)) {
                  matchedPairs.push({ fnsku, sku: pageSku });
                }
                break;
              }
            }
          }

          if (pageSku.length > 0) {
            page.drawText(pageSku, {
              x: marginSide,
              y,
              size: fontSize,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
          }

          if (rightText.length > 0) {
            const rightWidth = font.widthOfTextAtSize(rightText, fontSize);
            page.drawText(rightText, {
              x: width - marginSide - rightWidth,
              y,
              size: fontSize,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
          }
        }
      }

      // 生成输出文件名
      const fileName = path.basename(filePath);
      let outputPath;
      if (outputFolder) {
        outputPath = path.join(outputFolder, fileName);
      } else {
        const ext = path.extname(filePath);
        const base = filePath.slice(0, -ext.length);
        outputPath = `${base}_modified${ext}`;
      }

      const modifiedBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, modifiedBytes);

      results.push({
        file: filePath,
        output: outputPath,
        success: true,
        matchedFnsku: matchedPairs.map((p) => p.fnsku).join(', '),
        matchedSku: matchedPairs.map((p) => p.sku).join(', '),
        matchedCount: matchedPairs.length,
      });
    } catch (err) {
      results.push({ file: filePath, success: false, error: err.message });
    }
  }

  return results;
});

// ========== IPC: 拆分 PDF 标签为独立文件 ==========
ipcMain.handle('split-pdf-labels', async (event, options) => {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
  const files = options?.files || [];
  const skuMap = options?.skuMap || {};
  const rightText = String(options?.rightText || '');
  const fontSize = Number(options?.fontSize) || 8;
  const marginBottom = Number(options?.marginBottom) || 8;
  const marginSide = Number(options?.marginSide) || 18;
  const outputFolder = options?.outputFolder || '';

  if (!outputFolder) {
    return [{ file: '', success: false, error: '请先选择输出文件夹' }];
  }

  const results = [];
  const fnskuList = Object.keys(skuMap);

  if (fnskuList.length === 0) {
    return [{ file: '', success: false, error: '请先导入 Excel 并确认映射' }];
  }

  const getSkuFromMap = (fnsku) => {
    const val = skuMap[fnsku];
    if (!val) return '';
    return typeof val === 'object' ? (val.sku || '') : String(val);
  };

  for (const filePath of files) {
    try {
      const fileBytes = fs.readFileSync(filePath);

      // 第一步：处理 PDF（加 SKU + 右侧文字），和 process-pdf-files 逻辑一致
      const pdfDoc = await PDFDocument.load(fileBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const pageLabelInfos = await extractPageLabels(filePath, fnskuList);

      const pages = pdfDoc.getPages();
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        const { width } = page.getSize();
        const pageLabels = pageLabelInfos[pageIdx] || [];

        if (pageLabels.length > 0) {
          for (const label of pageLabels) {
            const sku = getSkuFromMap(label.fnsku);
            const y = label.lowestTextY - marginBottom - 2;

            if (sku.length > 0) {
              page.drawText(sku, {
                x: label.labelLeft + 4,
                y,
                size: fontSize,
                font,
                color: rgb(0.2, 0.2, 0.2),
              });
            }

            if (rightText.length > 0) {
              const rightWidth = font.widthOfTextAtSize(rightText, fontSize);
              page.drawText(rightText, {
                x: label.labelRight - rightWidth,
                y,
                size: fontSize,
                font,
                color: rgb(0.2, 0.2, 0.2),
              });
            }
          }
        } else {
          const y = marginBottom;
          let pageSku = '';
          const pageText = await extractSinglePageText(filePath, pageIdx + 1);
          for (const fnsku of fnskuList) {
            if (pageText.includes(fnsku)) {
              pageSku = getSkuFromMap(fnsku);
              break;
            }
          }

          if (pageSku.length > 0) {
            page.drawText(pageSku, { x: marginSide, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
          }
          if (rightText.length > 0) {
            const rightWidth = font.widthOfTextAtSize(rightText, fontSize);
            page.drawText(rightText, { x: width - marginSide - rightWidth, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
          }
        }
      }

      // 保存处理后的 PDF 到内存
      const processedBytes = await pdfDoc.save();

      // 第二步：拆分处理后的 PDF
      const pageBounds = await extractPageLabelsWithBounds(filePath, fnskuList);

      let splitCount = 0;

      for (let pageIdx = 0; pageIdx < pageBounds.length; pageIdx++) {
        const pageLabels = pageBounds[pageIdx] || [];

        for (const label of pageLabels) {
          const mapVal = skuMap[label.fnsku];
          if (!mapVal) continue;

          const sku = typeof mapVal === 'object' ? (mapVal.sku || '') : String(mapVal);
          const name = typeof mapVal === 'object' ? (mapVal.name || '') : '';

          // 构建文件名：SKU-品名.pdf
          let fileName = sku;
          if (name) fileName += '-' + name;
          fileName = fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim();
          if (!fileName) fileName = label.fnsku;
          if (fileName.length > 80) {
            fileName = fileName.substring(0, 80).trim();
          }
          fileName += '.pdf';

          const outputPath = path.join(outputFolder, fileName);

          // 从处理后的 PDF 复制页面并裁剪
          const srcDoc = await PDFDocument.load(processedBytes);
          const newDoc = await PDFDocument.create();
          const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIdx]);

          const cropPadding = 5;
          copiedPage.setCropBox(
            label.cropLeft - cropPadding,
            label.cropBottom - cropPadding,
            (label.cropRight - label.cropLeft) + cropPadding * 2,
            (label.cropTop - label.cropBottom) + cropPadding * 2
          );
          copiedPage.setMediaBox(
            label.cropLeft - cropPadding,
            label.cropBottom - cropPadding,
            (label.cropRight - label.cropLeft) + cropPadding * 2,
            (label.cropTop - label.cropBottom) + cropPadding * 2
          );

          newDoc.addPage(copiedPage);

          const newBytes = await newDoc.save();
          fs.writeFileSync(outputPath, newBytes);
          splitCount++;
        }
      }

      results.push({
        file: filePath,
        success: true,
        splitCount,
        output: outputFolder,
      });
    } catch (err) {
      results.push({ file: filePath, success: false, error: err.message });
    }
  }

  return results;
});

// ========== 抓取逻辑 ==========
async function scrapeAmazonProduct(browser, url) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 等待商品标题出现
    await page.waitForSelector('#productTitle', { timeout: 15000 }).catch(() => {});

    const product = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };

      const getAttr = (selector, attr) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute(attr) : '';
      };

      // 标题
      const title = getText('#productTitle');

      // 价格（多种可能的选择器）
      let price =
        getText('.a-price .a-offscreen') ||
        getText('#priceblock_ourprice') ||
        getText('#priceblock_dealprice') ||
        getText('.a-price-whole') ||
        getText('#price_inside_buybox') ||
        getText('.apexPriceToPay .a-offscreen');

      // 评分
      const ratingEl = document.querySelector('#acrPopover');
      const rating = ratingEl
        ? ratingEl.getAttribute('title') || getText('#acrPopover .a-icon-alt')
        : getText('.a-icon-star .a-icon-alt');

      // 评论数
      const reviewCount =
        getText('#acrCustomerReviewText') ||
        getText('#acrCustomerReviewLink');

      // ASIN
      let asin = '';
      const asinEl = document.querySelector('[data-asin]');
      if (asinEl) asin = asinEl.getAttribute('data-asin');
      if (!asin) {
        const match = window.location.href.match(/\/dp\/([A-Z0-9]{10})/);
        if (match) asin = match[1];
      }

      // 品牌
      const brand =
        getText('#bylineInfo') ||
        getText('.po-brand .a-span9') ||
        getText('#brand');

      // 库存状态
      const availability =
        getText('#availability span') ||
        getText('#outOfStock') ||
        'Unknown';

      // 主图
      const imageUrl =
        getAttr('#landingImage', 'src') ||
        getAttr('#imgBlkFront', 'src') ||
        getAttr('.a-dynamic-image', 'src');

      // 类目（面包屑导航）
      const categoryParts = Array.from(
        document.querySelectorAll('#wayfinding-breadcrumbs_feature_div li:not(.a-breadcrumb-divider) .a-link-normal, #wayfinding-breadcrumbs_feature_div li:not(.a-breadcrumb-divider) span.a-color-tertiary')
      ).map((el) => el.textContent.trim()).filter(Boolean);
      const category = categoryParts.join(' > ');

      // 五点描述（Feature bullets），动态条数
      const bullets = Array.from(
        document.querySelectorAll('#feature-bullets li span.a-list-item')
      )
        .map((el) => el.textContent.trim())
        .filter((t) => t.length > 10); // 过滤掉"See more"之类的短文本

      return {
        title,
        price,
        rating,
        reviewCount,
        asin,
        brand,
        availability,
        imageUrl,
        category,
        bullets, // 数组，动态长度
      };
    });

    return product;
  } finally {
    await context.close();
  }
}

function findChromiumExecutable(browsersPath) {
  // 在打包后的资源目录中查找 chromium 可执行文件
  try {
    const entries = fs.readdirSync(browsersPath);
    for (const entry of entries) {
      if (entry.startsWith('chromium')) {
        const chromePath = path.join(browsersPath, entry, 'chrome-win', 'chrome.exe');
        if (fs.existsSync(chromePath)) return chromePath;
      }
    }
  } catch (e) {}
  return undefined;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 自动探测 Vite 端口：检查响应内容包含项目特征
async function findVitePort(start, end) {
  const http = require('http');
  for (let port = start; port <= end; port++) {
    const found = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          resolve(body.includes('amazon-scraper-v1'));
        });
      });
      req.on('error', () => resolve(false));
      req.setTimeout(800, () => { req.destroy(); resolve(false); });
    });
    if (found) return port;
  }
  return null;
}

// ========== 从 PDF 提取单页文字 ==========
async function extractSinglePageText(filePath, pageNum) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const texts = [];
  if (pageNum <= doc.numPages) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (item.str) texts.push(item.str);
    }
  }

  return texts.join(' ');
}

// ========== 提取每页中所有标签的位置信息 ==========
// 返回格式: [ [{ fnsku, labelLeft, labelRight, labelTop, labelBottom }, ...], ... ]
// 每个外层数组元素对应一页，内层数组是该页中检测到的标签
async function extractPageLabels(filePath, fnskuList) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const allPageLabels = [];

  for (let pageIdx = 1; pageIdx <= doc.numPages; pageIdx++) {
    const page = await doc.getPage(pageIdx);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    // 收集所有文本项及其位置（转换为 pdf-lib 坐标系，y 从底部算起）
    const textItems = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      // pdfjs transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const tx = item.transform;
      const x = tx[4];
      const yPdfjs = tx[5]; // pdfjs 的 y 是从底部算起的
      const itemHeight = Math.abs(tx[3]) || item.height || 10;
      const itemWidth = item.width || 0;

      textItems.push({
        str: item.str.trim(),
        x,
        y: yPdfjs, // 已经是从底部算起
        width: itemWidth,
        height: itemHeight,
      });
    }

    // 找到所有匹配 FNSKU 的文本项
    const matchedItems = [];
    for (const item of textItems) {
      for (const fnsku of fnskuList) {
        if (item.str.includes(fnsku)) {
          matchedItems.push({ ...item, fnsku });
          break;
        }
      }
    }

    if (matchedItems.length === 0) {
      allPageLabels.push([]);
      continue;
    }

    // 对每个匹配到的 FNSKU，推算其所在标签的边界
    // 策略：根据 FNSKU 文本位置，找到同一标签区域内的所有文本，推算标签边界
    const labels = [];
    for (const matched of matchedItems) {
      // 收集与该 FNSKU 在同一标签区域的文本项
      // 标签通常是一个矩形区域，FNSKU 文本附近的文本属于同一标签
      // 使用聚类：找到 x 坐标接近且 y 坐标在 FNSKU 下方（或同行）的文本项
      const nearbyItems = textItems.filter((item) => {
        const dx = Math.abs(item.x - matched.x);
        const dy = matched.y - item.y; // FNSKU 的 y 减去 item 的 y，正值表示 item 在 FNSKU 下方
        // 同一标签内：x 方向接近，y 方向在 FNSKU 上方不超过 80pt（条形码区域），下方不超过 80pt
        return dx < 200 && dy > -80 && dy < 80;
      });

      // 计算标签边界
      let labelLeft = Infinity, labelRight = -Infinity;
      let labelTop = -Infinity;
      // 找到最底部那行文本的 y 坐标（最小的 y 值）
      let lowestTextY = Infinity;

      for (const item of nearbyItems) {
        labelLeft = Math.min(labelLeft, item.x);
        labelRight = Math.max(labelRight, item.x + item.width);
        labelTop = Math.max(labelTop, item.y + item.height);
        if (item.y < lowestTextY) {
          lowestTextY = item.y;
        }
      }

      // 给标签边界加一些 padding
      labelLeft = Math.max(0, labelLeft - 5);
      labelRight = labelRight + 5;

      labels.push({
        fnsku: matched.fnsku,
        labelLeft,
        labelRight,
        labelTop,
        lowestTextY, // 标签内最底部文本的基线 y
        fnskuX: matched.x,
        fnskuY: matched.y,
      });
    }

    // 去重：如果同一个 FNSKU 在同一位置出现多次，只保留一个
    const uniqueLabels = [];
    for (const label of labels) {
      const isDuplicate = uniqueLabels.some(
        (existing) =>
          existing.fnsku === label.fnsku &&
          Math.abs(existing.fnskuX - label.fnskuX) < 20 &&
          Math.abs(existing.fnskuY - label.fnskuY) < 20
      );
      if (!isDuplicate) {
        uniqueLabels.push(label);
      }
    }

    allPageLabels.push(uniqueLabels);
  }

  return allPageLabels;
}

// ========== 提取每页中所有标签的裁剪边界（用于拆分导出） ==========
// 通过分析页面中标签的网格布局来确定每个标签的精确裁剪区域
async function extractPageLabelsWithBounds(filePath, fnskuList) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
  const { PDFDocument } = require('pdf-lib');

  const fileBytes = fs.readFileSync(filePath);
  const data = new Uint8Array(fileBytes);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  // 同时用 pdf-lib 获取页面尺寸
  const pdfLibDoc = await PDFDocument.load(fileBytes);

  const allPageLabels = [];

  for (let pageIdx = 1; pageIdx <= doc.numPages; pageIdx++) {
    const page = await doc.getPage(pageIdx);
    const content = await page.getTextContent();
    const pdfLibPage = pdfLibDoc.getPages()[pageIdx - 1];
    const { width: pageWidth, height: pageHeight } = pdfLibPage.getSize();

    // 收集所有文本项
    const textItems = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const tx = item.transform;
      textItems.push({
        str: item.str.trim(),
        x: tx[4],
        y: tx[5],
        width: item.width || 0,
        height: Math.abs(tx[3]) || item.height || 10,
      });
    }

    // 找到所有匹配 FNSKU 的文本项
    const matchedItems = [];
    for (const item of textItems) {
      for (const fnsku of fnskuList) {
        if (item.str.includes(fnsku)) {
          matchedItems.push({ ...item, fnsku });
          break;
        }
      }
    }

    if (matchedItems.length === 0) {
      allPageLabels.push([]);
      continue;
    }

    // 去重
    const uniqueMatched = [];
    for (const item of matchedItems) {
      const isDup = uniqueMatched.some(
        (e) => e.fnsku === item.fnsku && Math.abs(e.x - item.x) < 20 && Math.abs(e.y - item.y) < 20
      );
      if (!isDup) uniqueMatched.push(item);
    }

    // 分析标签网格布局
    // 收集所有 FNSKU 的 x 和 y 坐标，推断列数和行数
    const xs = uniqueMatched.map((m) => m.x).sort((a, b) => a - b);
    const ys = uniqueMatched.map((m) => m.y).sort((a, b) => b - a); // y 从大到小（从上到下）

    // 聚类 x 坐标确定列
    const colXs = clusterValues(xs, 50);
    const numCols = colXs.length;

    // 聚类 y 坐标确定行
    const rowYs = clusterValues(ys, 50);
    const numRows = rowYs.length;

    // 计算每个标签的裁剪区域
    const labels = [];
    for (const matched of uniqueMatched) {
      // 确定该标签在哪一列和哪一行
      const colIdx = findClosestCluster(matched.x, colXs);
      const rowIdx = findClosestCluster(matched.y, rowYs);

      // 计算裁剪边界
      let cropLeft, cropRight, cropTop, cropBottom;

      if (numCols === 1) {
        // 单列：使用整个页面宽度
        cropLeft = 0;
        cropRight = pageWidth;
      } else {
        // 多列：在相邻列之间取中点作为分界
        if (colIdx === 0) {
          cropLeft = 0;
          cropRight = (colXs[0] + colXs[1]) / 2;
        } else if (colIdx === numCols - 1) {
          cropLeft = (colXs[colIdx - 1] + colXs[colIdx]) / 2;
          cropRight = pageWidth;
        } else {
          cropLeft = (colXs[colIdx - 1] + colXs[colIdx]) / 2;
          cropRight = (colXs[colIdx] + colXs[colIdx + 1]) / 2;
        }
      }

      if (numRows === 1) {
        // 单行：使用整个页面高度
        cropBottom = 0;
        cropTop = pageHeight;
      } else {
        // 多行：在相邻行之间取中点作为分界（注意 y 从大到小）
        if (rowIdx === 0) {
          cropTop = pageHeight;
          cropBottom = (rowYs[0] + rowYs[1]) / 2;
        } else if (rowIdx === numRows - 1) {
          cropTop = (rowYs[rowIdx - 1] + rowYs[rowIdx]) / 2;
          cropBottom = 0;
        } else {
          cropTop = (rowYs[rowIdx - 1] + rowYs[rowIdx]) / 2;
          cropBottom = (rowYs[rowIdx] + rowYs[rowIdx + 1]) / 2;
        }
      }

      labels.push({
        fnsku: matched.fnsku,
        cropLeft,
        cropRight,
        cropTop,
        cropBottom,
      });
    }

    allPageLabels.push(labels);
  }

  return allPageLabels;
}

// 将一组数值聚类（相差小于 threshold 的归为一组），返回每组的平均值
function clusterValues(sortedValues, threshold) {
  if (sortedValues.length === 0) return [];
  const clusters = [[sortedValues[0]]];
  for (let i = 1; i < sortedValues.length; i++) {
    const lastCluster = clusters[clusters.length - 1];
    const lastAvg = lastCluster.reduce((a, b) => a + b, 0) / lastCluster.length;
    if (Math.abs(sortedValues[i] - lastAvg) < threshold) {
      lastCluster.push(sortedValues[i]);
    } else {
      clusters.push([sortedValues[i]]);
    }
  }
  return clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
}

// 找到最接近的聚类索引
function findClosestCluster(value, clusterCenters) {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < clusterCenters.length; i++) {
    const dist = Math.abs(value - clusterCenters[i]);
    if (dist < minDist) {
      minDist = dist;
      idx = i;
    }
  }
  return idx;
}
