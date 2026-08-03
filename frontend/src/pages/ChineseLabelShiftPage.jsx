import { useState } from 'react';
import { FolderOpenIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function getFileName(p) {
  return p.split(/[\\/]/).pop();
}

function statusColor(status) {
  if (status === 'done') return 'text-green-500';
  if (status === 'error') return 'text-red-500';
  if (status === 'processing') return 'text-yellow-500';
  return 'text-apple-gray-400';
}

function statusLabel(status, error) {
  if (status === 'processing') return '生成中…';
  if (status === 'done') return '完成';
  if (status === 'error') return error || '失败';
  return '等待';
}

export default function ChineseLabelShiftPage() {
  // Excel 映射
  const [excelFile, setExcelFile] = useState('');
  const [columns, setColumns] = useState([]);
  const [skuColumn, setSkuColumn] = useState('');
  const [fnskuColumn, setFnskuColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [packageTypeColumn, setPackageTypeColumn] = useState('');
  const [skuMap, setSkuMap] = useState(null);
  const [matchPreview, setMatchPreview] = useState([]);

  // 文件夹
  const [folder, setFolder] = useState('');
  const [fileItems, setFileItems] = useState([]);

  // 设置
  const [textOffsetY, setTextOffsetY] = useState(-10);

  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const isElectron = !!window.electronAPI;

  const selectCls = 'w-full rounded-lg border border-apple-gray-200 bg-white px-3 py-2 text-sm text-apple-gray-900 focus:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue/20';

  // ── 选 Excel ──
  const handleSelectExcel = async () => {
    if (!isElectron) return;
    const result = await window.electronAPI.selectExcelFile();
    if (!result) return;
    setExcelFile(result.filePath);
    setColumns(result.columns);
    setSkuMap(null);
    setMatchPreview([]);

    // 自动识别列
    const cols = result.columns.map(c => c.toLowerCase());
    const fnskuIdx = cols.findIndex(c => c.includes('fnsku'));
    const skuIdx = cols.findIndex(c => c.includes('sku') && !c.includes('fnsku'));
    const nameIdx = cols.findIndex(c => c.includes('品名') || c.includes('名称'));
    const pkgIdx = cols.findIndex(c => c.includes('包装袋类型') || c.includes('包装类型'));
    if (fnskuIdx >= 0) setFnskuColumn(result.columns[fnskuIdx]);
    if (skuIdx >= 0) setSkuColumn(result.columns[skuIdx]);
    if (nameIdx >= 0) setNameColumn(result.columns[nameIdx]);
    if (pkgIdx >= 0) setPackageTypeColumn(result.columns[pkgIdx]);
  };

  // ── 确认映射 ──
  const handleBuildMap = async () => {
    if (!excelFile || !skuColumn || !fnskuColumn) return;
    const result = await window.electronAPI.buildSkuMap({
      filePath: excelFile,
      skuColumn,
      fnskuColumn,
      nameColumn,
      packageTypeColumn,
    });
    if (result) {
      setSkuMap(result.map);
      setMatchPreview(result.preview);
      toast.success(`已加载 ${Object.keys(result.map).length} 条映射`);
    }
  };

  // ── 选文件夹 ──
  const handleSelectFolder = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    const res = await window.electronAPI.selectChineseLabelFolder();
    if (!res) return;
    if (res.files.length === 0) {
      toast.error('该文件夹内没有包含"中文标签"的 PDF 文件');
      return;
    }
    setFolder(res.folder);
    setFileItems(res.files.map(p => ({ path: p, status: 'idle', error: '' })));
    setSummary(null);
    toast.success(`找到 ${res.files.length} 个中文标签 PDF`);
  };

  // ── 重新生成 ──
  const handleRegenerate = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    if (!skuMap) { toast.error('请先导入 Excel 并确认映射'); return; }
    if (fileItems.length === 0) { toast.error('请先选择文件夹'); return; }

    setProcessing(true);
    setSummary(null);
    setFileItems(prev => prev.map(f => ({ ...f, status: 'processing', error: '' })));

    try {
      const results = await window.electronAPI.regenerateChineseLabels({
        files: fileItems.map(f => f.path),
        skuMap,
        textOffsetY,
      });

      let done = 0, failed = 0;
      const nextItems = fileItems.map(f => {
        const r = results.find(x => x.file === f.path);
        if (!r) return f;
        if (r.success) { done++; return { ...f, status: 'done' }; }
        failed++;
        return { ...f, status: 'error', error: r.error || '生成失败' };
      });
      setFileItems(nextItems);
      setSummary({ done, failed });

      if (failed === 0) {
        toast.success(`全部完成，${done} 个文件已重新生成`);
      } else {
        toast.error(`完成：${done} 成功，${failed} 失败`);
      }
    } catch (err) {
      toast.error('生成失败：' + err.message);
      setFileItems(prev => prev.map(f => ({ ...f, status: 'idle' })));
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setFolder('');
    setFileItems([]);
    setSummary(null);
  };

  const doneCount = fileItems.filter(f => f.status === 'done').length;
  const errorCount = fileItems.filter(f => f.status === 'error').length;
  const folderName = folder.split(/[\\/]/).filter(Boolean).pop() || '';
  const mapSize = skuMap ? Object.keys(skuMap).length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-apple-gray-900">历史中文标签重新生成</h1>
        <p className="mt-0.5 text-sm text-apple-gray-500">
          读取 Excel 映射，根据文件名匹配数据，重新生成中文标签 PDF 覆盖原文件
        </p>
      </div>

      {/* Step 1: Excel */}
      <section className="rounded-xl border border-apple-gray-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold text-apple-gray-900">① 导入 Excel 映射表</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectExcel}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-lg border border-apple-gray-200 bg-white px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50 disabled:opacity-50"
          >
            📊 {excelFile ? '重新选择' : '选择 Excel'}
          </button>
          {excelFile && (
            <span className="truncate text-xs text-apple-gray-500">{excelFile.split(/[/\\]/).pop()}</span>
          )}
        </div>

        {columns.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'FNSKU 列', value: fnskuColumn, set: setFnskuColumn, required: true },
              { label: 'SKU 编码列', value: skuColumn, set: setSkuColumn, required: true },
              { label: '品名列', value: nameColumn, set: setNameColumn },
              { label: '包装袋类型列', value: packageTypeColumn, set: setPackageTypeColumn },
            ].map(({ label, value, set, required }) => (
              <div key={label}>
                <label className="mb-1 block text-xs font-medium text-apple-gray-600">{label}</label>
                <select value={value} onChange={e => set(e.target.value)} className={selectCls}>
                  <option value="">{required ? '请选择' : '不选择'}</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-end">
              <button
                onClick={handleBuildMap}
                disabled={!skuColumn || !fnskuColumn}
                className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-40"
              >
                确认映射
              </button>
            </div>
          </div>
        )}

        {skuMap && (
          <div className="space-y-2">
            <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
              ✅ 已加载 {mapSize} 条映射
            </span>
            {matchPreview.length > 0 && (
              <div className="rounded-lg bg-apple-gray-50 p-3 text-xs space-y-1">
                <p className="text-apple-gray-500 mb-1">预览（前 5 条）：</p>
                {matchPreview.map((item, i) => (
                  <p key={i} className="text-apple-gray-700">
                    <code className="rounded bg-apple-gray-200 px-1">{item.fnsku}</code> → <strong>{item.sku}</strong>
                    {item.name && <span className="text-apple-gray-400"> ({item.name})</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: 文件夹 + 偏移 */}
      <section className="rounded-xl border border-apple-gray-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold text-apple-gray-900">② 选择文件夹 & 设置偏移</h3>
        <div className="flex flex-wrap items-end gap-4">
          <button
            onClick={handleSelectFolder}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-lg border border-apple-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50 disabled:opacity-50"
          >
            <FolderOpenIcon className="h-4 w-4" />
            选择中文标签文件夹
          </button>

          <div>
            <label className="mb-1 block text-xs font-medium text-apple-gray-600">
              垂直偏移 (pt)
              <span className="ml-1 font-normal text-apple-gray-400">负数向下 / 正数向上</span>
            </label>
            <input
              type="number"
              value={textOffsetY}
              onChange={e => setTextOffsetY(Number(e.target.value))}
              min={-100}
              max={100}
              disabled={processing}
              className="w-32 rounded-lg border border-apple-gray-200 bg-white px-3 py-2 text-sm text-apple-gray-900 focus:border-apple-blue focus:outline-none disabled:opacity-50"
            />
          </div>

          {folder && !processing && (
            <button onClick={handleClear} className="text-xs text-apple-gray-400 hover:text-red-500 self-end pb-2">
              清空
            </button>
          )}
        </div>

        {folder && (
          <div className="rounded-lg border border-apple-gray-100 bg-apple-gray-50 px-4 py-2.5 flex items-center gap-3">
            <FolderOpenIcon className="h-4 w-4 text-apple-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-apple-gray-900">{folderName}</span>
              <span className="text-xs text-apple-gray-400 ml-2">{folder}</span>
            </div>
            <span className="text-xs text-apple-gray-500 flex-shrink-0">{fileItems.length} 个文件</span>
          </div>
        )}
      </section>

      {/* 文件列表 */}
      {fileItems.length > 0 && (
        <div className="rounded-xl border border-apple-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 border-b border-apple-gray-100 px-4 py-2 bg-apple-gray-50">
            <span className="w-6 text-xs text-apple-gray-400 text-right">#</span>
            <span className="flex-1 text-xs font-medium text-apple-gray-500">文件名</span>
            <span className="w-20 text-xs font-medium text-apple-gray-500 text-right">状态</span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-apple-gray-100">
            {fileItems.map((item, idx) => (
              <div key={item.path} className="flex items-center gap-3 px-4 py-2">
                <span className="w-6 text-xs text-apple-gray-400 text-right flex-shrink-0">{idx + 1}</span>
                <span className="flex-1 text-sm text-apple-gray-700 truncate" title={item.path}>
                  {getFileName(item.path)}
                </span>
                <span
                  className={`w-20 text-right text-xs font-medium flex-shrink-0 ${statusColor(item.status)}`}
                  title={item.error}
                >
                  {statusLabel(item.status, item.error)}
                </span>
              </div>
            ))}
          </div>
          {(doneCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-4 border-t border-apple-gray-100 bg-apple-gray-50 px-4 py-2">
              {doneCount > 0 && <span className="text-xs text-green-500">{doneCount} 成功</span>}
              {errorCount > 0 && <span className="text-xs text-red-500">{errorCount} 失败</span>}
              <span className="text-xs text-apple-gray-400 ml-auto">{doneCount + errorCount} / {fileItems.length}</span>
            </div>
          )}
        </div>
      )}

      {/* 执行按钮 */}
      {fileItems.length > 0 && (
        <button
          onClick={handleRegenerate}
          disabled={processing || !skuMap}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-apple-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-apple-blue-hover active:scale-[0.98] disabled:opacity-50"
        >
          {processing ? (
            <>
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              生成中…
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              重新生成 · {fileItems.length} 个文件
            </>
          )}
        </button>
      )}

      {/* 结果 */}
      {summary && (
        <div className="rounded-xl border border-apple-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-apple-gray-800 mb-3">处理结果</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-500">{summary.done}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">生成成功</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">失败</div>
            </div>
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="rounded-xl border border-apple-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-apple-gray-800 mb-2">说明</h3>
        <ul className="space-y-1.5 text-xs text-apple-gray-500">
          <li>• 只处理文件夹内文件名含「中文标签」的 PDF</li>
          <li>• 从文件名提取 SKU，去 Excel 映射表查品名 / FNSKU / 包装袋类型</li>
          <li>• 完全重新生成 PDF，不依赖原文件内容，彻底解决文字重叠问题</li>
          <li>• 直接覆盖原文件，建议先备份</li>
          <li>• 垂直偏移：负数向下，正数向上，默认 <code className="rounded bg-apple-gray-100 px-1 font-mono">-10</code></li>
        </ul>
      </div>
    </div>
  );
}
