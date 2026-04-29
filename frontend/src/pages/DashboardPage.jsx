import { useState, useCallback } from 'react';
import UrlInput from '../components/UrlInput';
import ProductTable from '../components/ProductTable';
import ProgressBar from '../components/ProgressBar';

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(null);

  const isElectron = !!window.electronAPI;

  const handleScrape = useCallback(async (urls) => {
    if (!isElectron) return;

    setIsScraping(true);
    setProducts([]);
    setSelected(new Set());
    setProgress({ current: 0, total: urls.length });

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
  }, [isElectron]);

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
    if (!isElectron) return;
    const toExport = products.filter((p) => selected.has(p.id));
    if (toExport.length === 0) return;

    const result = await window.electronAPI.exportExcel(toExport);
    if (result.success) {
      alert(`✅ 导出成功！\n文件已保存到：\n${result.filePath}`);
    } else if (result.reason !== 'cancelled') {
      alert(`❌ 导出失败：${result.reason}`);
    }
  }, [products, selected, isElectron]);

  const successCount = products.filter((p) => p.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-apple-gray-900">商品抓取</h1>
        <p className="mt-1 text-sm text-apple-gray-500">
          输入 Amazon 商品链接，批量抓取商品信息
        </p>
      </div>

      {/* Web mode notice */}
      {!isElectron && (
        <div className="rounded-2xl bg-apple-blue-light p-4 text-sm text-apple-blue">
          <p className="font-medium">网页模式</p>
          <p className="mt-0.5 text-apple-blue/80">
            商品抓取功能需要在桌面端使用。请下载桌面版应用以使用完整功能。
          </p>
        </div>
      )}

      {/* URL Input */}
      <UrlInput onScrape={handleScrape} isScraping={isScraping} disabled={!isElectron} />

      {/* Progress */}
      {progress && (
        <ProgressBar
          current={progress.current}
          total={progress.total}
          url={progress.url}
          status={progress.status}
        />
      )}

      {/* Results */}
      {products.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-apple-gray-200">
          <div className="flex items-center justify-between border-b border-apple-gray-200 bg-apple-gray-50 px-5 py-3">
            <p className="text-sm text-apple-gray-500">
              共 <span className="font-medium text-apple-gray-900">{products.length}</span> 条，
              成功 <span className="font-medium text-apple-green">{successCount}</span> 条，
              已选 <span className="font-medium text-apple-gray-900">{selected.size}</span> 条
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                disabled={successCount === 0}
                className="rounded-lg border border-apple-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50 disabled:opacity-40"
              >
                {selected.size === successCount && successCount > 0 ? '取消全选' : '全选'}
              </button>
              <button
                onClick={handleExport}
                disabled={selected.size === 0}
                className="rounded-lg bg-apple-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-apple-blue-hover disabled:opacity-40"
              >
                导出 ({selected.size}) 到 Excel
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
    </div>
  );
}
