import { useState } from 'react';
import { PrinterIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function LabelPrintPage() {
  const [excelFile, setExcelFile] = useState('');
  const [products, setProducts] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [progress, setProgress] = useState(null);

  const isElectron = !!window.electronAPI;

  const totalLabels = products.reduce((sum, r) => sum + r.purchaseQty + 1, 0);

  // 选择并解析 Excel
  const handleSelectExcel = async () => {
    const result = await window.electronAPI.selectExcelFile();
    if (!result) return;

    setExcelFile(result.filePath);
    setParsing(true);
    setProducts([]);

    try {
      const parseResult = await window.electronAPI.parseExcelForLabels({ filePath: result.filePath });
      if (parseResult.success) {
        setProducts(parseResult.products);
        if (parseResult.products.length === 0) {
          toast.error('未找到采购件数大于 0 的产品');
        } else {
          toast.success(`已解析 ${parseResult.products.length} 个待打印产品`);
        }
      } else {
        toast.error(parseResult.error);
      }
    } catch (err) {
      toast.error('解析失败：' + err.message);
    } finally {
      setParsing(false);
    }
  };

  // 批量生成并打印
  const handlePrint = async () => {
    if (!window.electronAPI?.batchMergeLabels) {
      toast.error('此功能仅在桌面端可用');
      return;
    }
    if (!excelFile) {
      toast.error('请先选择 Excel 文件');
      return;
    }
    if (products.length === 0) {
      toast.error('没有需要打印的产品');
      return;
    }

    // 使用 Excel 文件所在目录作为标签文件夹
    const labelFolder = excelFile.replace(/[/\\][^/\\]+$/, '');

    setPrinting(true);
    setProgress({ current: 0, total: products.length });

    window.electronAPI.onBatchMergeProgress?.((data) => {
      setProgress(data);
    });

    try {
      const result = await window.electronAPI.batchMergeLabels({ products, labelFolder });

      if (result.success) {
        let msg = `已生成 ${result.totalPages} 页标签，共 ${result.productCount} 个产品`;
        if (result.errors && result.errors.length > 0) {
          toast.success(msg);
          alert('以下产品处理失败：\n' + result.errors.join('\n'));
        } else {
          toast.success(msg);
        }
      } else {
        toast.error(result.error || '生成失败');
      }
    } catch (err) {
      toast.error('生成失败：' + err.message);
    } finally {
      setPrinting(false);
      setProgress(null);
      window.electronAPI.removeBatchMergeProgressListener?.();
    }
  };

  if (!isElectron) {
    return (
      <div className="rounded-2xl bg-apple-blue-light p-6 text-center text-sm text-apple-blue">
        <p className="font-medium">标签打印功能需要在桌面端使用</p>
        <p className="mt-1 text-apple-blue/80">请下载桌面版应用以使用完整功能。</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-gray-900">标签打印</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">
            上传 Excel 表格，自动筛选有采购件数的产品，批量生成打印文件
          </p>
        </div>
        <button
          onClick={handlePrint}
          disabled={printing || products.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-apple-blue px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-50"
        >
          {printing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {progress ? `处理中 ${progress.current}/${progress.total}` : '处理中...'}
            </span>
          ) : (
            <>
              <PrinterIcon className="h-4 w-4" />
              生成打印文件
            </>
          )}
        </button>
      </div>

      {/* 上传 Excel */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
        <h3 className="text-sm font-semibold text-apple-gray-900">① 上传 Excel 表格</h3>
        <p className="mt-1 text-xs text-apple-gray-500">表格需包含"SKU编码"和"采购件数"列，系统会自动识别并筛选出采购件数 &gt; 0 的产品</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSelectExcel}
            disabled={parsing}
            className="inline-flex items-center gap-2 rounded-xl border border-apple-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50 disabled:opacity-50"
          >
            <DocumentArrowUpIcon className="h-4 w-4" />
            {parsing ? '解析中...' : excelFile ? '重新选择 Excel' : '选择 Excel 文件'}
          </button>
          {excelFile && <span className="truncate text-xs text-apple-gray-500">{excelFile.split(/[/\\]/).pop()}</span>}
        </div>
      </section>

      {/* 统计卡片 */}
      {products.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-apple-gray-200">
            <p className="text-xs text-apple-gray-500">待打印产品</p>
            <p className="mt-1 text-2xl font-semibold text-apple-gray-900">{products.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-apple-gray-200">
            <p className="text-xs text-apple-gray-500">总标签数（含中文分隔）</p>
            <p className="mt-1 text-2xl font-semibold text-apple-blue">{totalLabels}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-apple-gray-200">
            <p className="text-xs text-apple-gray-500">标签文件夹（Excel 同目录）</p>
            <p className="mt-1 text-sm font-medium text-apple-gray-700 truncate" title={excelFile.replace(/[/\\][^/\\]+$/, '')}>
              {excelFile.replace(/[/\\][^/\\]+$/, '').split(/[/\\]/).pop()}
            </p>
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="rounded-xl bg-apple-gray-50 p-4 text-xs text-apple-gray-600 space-y-1">
        <p className="font-medium text-apple-gray-700">打印逻辑说明：</p>
        <p>• 每个产品生成：<span className="font-medium">中文标签×1</span>（分隔识别用） + <span className="font-medium">英文标签×采购件数</span>（实际使用）</p>
        <p>• 中文标签文件名规则：<code className="bg-white px-1 rounded">SKU-品名-中文标签.pdf</code></p>
        <p>• 英文标签文件名规则：<code className="bg-white px-1 rounded">SKU-品名.pdf</code></p>
        <p>• 生成后会自动打开合并的 PDF，直接发送到标签打印机打印即可</p>
      </div>

      {/* 产品列表 */}
      {products.length > 0 && (
        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-apple-gray-200">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-apple-gray-200 bg-apple-gray-50">
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400 w-8">#</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">SKU</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">品名</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">FNSKU</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">采购件数</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">标签数</th>
                </tr>
              </thead>
              <tbody>
                {products.map((r, idx) => (
                  <tr key={idx} className="border-b border-apple-gray-100 hover:bg-apple-gray-50/50">
                    <td className="px-3 py-2.5 text-apple-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-apple-gray-900">{r.sku}</td>
                    <td className="px-3 py-2.5 text-apple-gray-700 max-w-[250px] truncate" title={r.name}>{r.name || '—'}</td>
                    <td className="px-3 py-2.5 text-apple-gray-500">{r.fnsku || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-apple-gray-900">{r.purchaseQty}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-apple-blue">{r.purchaseQty + 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
