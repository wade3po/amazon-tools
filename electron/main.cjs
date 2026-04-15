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
    const devPort = await findVitePort(5173, 5200);
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
