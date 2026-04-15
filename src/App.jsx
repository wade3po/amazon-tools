import { useState, useCallback } from 'react';
import UrlInput from './components/UrlInput';
import ProductTable from './components/ProductTable';
import ProgressBar from './components/ProgressBar';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isScaping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleScrape = useCallback(async (urls) => {
    setIsScraping(true);
    setProducts([]);
    setSelected(new Set());
    setProgress({ current: 0, total: urls.length });

    // 注册进度监听
    window.electronAPI.removeScrapeProgressListener();
    window.electronAPI.onScrapeProgress((data) => {
      setProgress({ current: data.current, total: data.total, url: data.url, status: data.status });

      if (data.status === 'done' && data.product) {
        setProducts((prev) => [
          ...prev,
          { ...data.product, url: data.url, status: 'success', id: Date.now() + Math.random() },
        ]);
      } else if (data.status === 'error') {
        setProducts((prev) => [
          ...prev,
          { url: data.url, status: 'error', error: data.error, id: Date.now() + Math.random() },
        ]);
      }
    });

    try {
      await window.electronAPI.scrapeProducts(urls);
    } finally {
      setIsScraping(false);
      setProgress(null);
      window.electronAPI.removeScrapeProgressListener();
    }
  }, []);

  const handleToggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const successProducts = products.filter((p) => p.status === 'success');
    if (selected.size === successProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(successProducts.map((p) => p.id)));
    }
  }, [products, selected]);

  const handleExport = useCallback(async () => {
    const toExport = products.filter((p) => selected.has(p.id));
    if (toExport.length === 0) return;

    const result = await window.electronAPI.exportExcel(toExport);
    if (result.success) {
      alert(`✅ 导出成功！\n文件已保存到：\n${result.filePath}`);
    } else if (result.reason !== 'cancelled') {
      alert(`❌ 导出失败：${result.reason}`);
    }
  }, [products, selected]);

  const successCount = products.filter((p) => p.status === 'success').length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🛒</span>
            <span className="logo-text">Amazon 商品抓取工具</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <UrlInput onScrape={handleScrape} isScaping={isScaping} />

        {progress && (
          <ProgressBar
            current={progress.current}
            total={progress.total}
            url={progress.url}
            status={progress.status}
          />
        )}

        {products.length > 0 && (
          <div className="results-section">
            <div className="results-toolbar">
              <div className="results-info">
                共抓取 <strong>{products.length}</strong> 条，成功{' '}
                <strong>{successCount}</strong> 条，已选{' '}
                <strong>{selected.size}</strong> 条
              </div>
              <div className="toolbar-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleSelectAll}
                  disabled={successCount === 0}
                >
                  {selected.size === successCount && successCount > 0
                    ? '取消全选'
                    : '全选'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleExport}
                  disabled={selected.size === 0}
                >
                  导出选中 ({selected.size}) 到 Excel
                </button>
              </div>
            </div>

            <ProductTable
              products={products}
              selected={selected}
              onToggleSelect={handleToggleSelect}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
