import { useState } from 'react';

export default function PdfEditor() {
  const [files, setFiles] = useState([]);
  const [skuMap, setSkuMap] = useState(null);
  const [excelFile, setExcelFile] = useState('');
  const [skuColumn, setSkuColumn] = useState('');
  const [fnskuColumn, setFnskuColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [linkColumn, setLinkColumn] = useState('');
  const [columns, setColumns] = useState([]);
  const [rightText, setRightText] = useState('Made in China');
  const [fontSize, setFontSize] = useState(8);
  const [marginBottom, setMarginBottom] = useState(8);
  const [marginSide, setMarginSide] = useState(18);
  const [processing, setProcessing] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [results, setResults] = useState([]);
  const [matchPreview, setMatchPreview] = useState([]);
  const [outputFolder, setOutputFolder] = useState('');

  const isElectron = !!window.electronAPI;

  const handleSelectOutputFolder = async () => {
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) setOutputFolder(folder);
  };

  const handleSelectExcel = async () => {
    const result = await window.electronAPI.selectExcelFile();
    if (!result) return;
    setExcelFile(result.filePath);
    setColumns(result.columns);
    setSkuMap(null);
    setSkuColumn('');
    setFnskuColumn('');
    setNameColumn('');
    setLinkColumn('');
    setMatchPreview([]);

    const cols = result.columns.map((c) => c.toLowerCase());
    const fnskuIdx = cols.findIndex((c) => c.includes('fnsku'));
    const skuIdx = cols.findIndex((c) => c.includes('sku') && !c.includes('fnsku'));
    const nameIdx = cols.findIndex((c) => c.includes('品名') || c.includes('名称') || c.includes('product'));
    const linkIdx = cols.findIndex((c) => c.includes('标签') || c.includes('label'));
    if (fnskuIdx >= 0) setFnskuColumn(result.columns[fnskuIdx]);
    if (skuIdx >= 0) setSkuColumn(result.columns[skuIdx]);
    if (nameIdx >= 0) setNameColumn(result.columns[nameIdx]);
    if (linkIdx >= 0) setLinkColumn(result.columns[linkIdx]);
  };

  const handleBuildMap = async () => {
    if (!excelFile || !skuColumn || !fnskuColumn) return;
    const result = await window.electronAPI.buildSkuMap({ filePath: excelFile, skuColumn, fnskuColumn, nameColumn });
    if (result) {
      setSkuMap(result.map);
      setMatchPreview(result.preview);
    }
  };

  const handleSelectFiles = async () => {
    const result = await window.electronAPI.selectPdfFiles();
    if (result && result.length > 0) { setFiles(result); setResults([]); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      .map((f) => f.path).filter(Boolean);
    if (droppedFiles.length > 0) { setFiles((prev) => [...new Set([...prev, ...droppedFiles])]); setResults([]); }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true); setResults([]);
    try {
      const result = await window.electronAPI.processPdfFiles({ files, skuMap: skuMap || {}, rightText: rightText.trim(), fontSize, marginBottom, marginSide, outputFolder });
      setResults(result);
    } catch (err) { alert('处理失败：' + err.message); }
    finally { setProcessing(false); }
  };

  const handleSplit = async () => {
    if (files.length === 0 || !skuMap) return;
    if (!outputFolder) { alert('拆分导出需要先选择输出文件夹'); return; }
    setSplitting(true); setResults([]);
    try {
      const result = await window.electronAPI.splitPdfLabels({ files, skuMap, rightText: rightText.trim(), fontSize, marginBottom, marginSide, outputFolder });
      setResults(result);
    } catch (err) { alert('拆分失败：' + err.message); }
    finally { setSplitting(false); }
  };

  const handleWriteLinks = async () => {
    if (!excelFile || !linkColumn || !skuMap || !outputFolder) { alert('请先导入 Excel、确认映射、选择标签列和输出文件夹'); return; }
    try {
      const r = await window.electronAPI.writeExcelLinks({ excelFile, fnskuColumn, linkColumn, outputFolder, skuMap });
      if (r.success) alert(`已写入 ${r.linkCount} 个文件名`);
      else alert('写入失败：' + r.error);
    } catch (err) { alert('写入失败：' + err.message); }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const mapSize = skuMap ? Object.keys(skuMap).length : 0;

  if (!isElectron) {
    return (
      <div className="rounded-2xl bg-apple-blue-light p-6 text-center text-sm text-apple-blue">
        <p className="font-medium">PDF 编辑功能需要在桌面端使用</p>
        <p className="mt-1 text-apple-blue/80">请下载桌面版应用以使用完整功能。</p>
      </div>
    );
  }

  const selectCls = "w-full rounded-xl border border-apple-gray-300 bg-apple-gray-50 px-3 py-2 text-sm text-apple-gray-900 transition-colors focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20";
  const inputCls = selectCls;

  return (
    <div className="space-y-6">
      {/* Step 1: Excel */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
        <h3 className="text-sm font-semibold text-apple-gray-900">① 导入 SKU 对照表（Excel）</h3>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSelectExcel} className="rounded-xl border border-apple-gray-300 bg-white px-4 py-2 text-sm font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50">
            📊 {excelFile ? '重新选择' : '选择 Excel'}
          </button>
          {excelFile && <span className="truncate text-xs text-apple-gray-500">{excelFile.split(/[/\\]/).pop()}</span>}
        </div>

        {columns.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'FNSKU 列', value: fnskuColumn, set: setFnskuColumn, required: true },
              { label: 'SKU 编码列', value: skuColumn, set: setSkuColumn, required: true },
              { label: '品名列（可选）', value: nameColumn, set: setNameColumn },
              { label: '标签列（可选）', value: linkColumn, set: setLinkColumn },
            ].map(({ label, value, set, required }) => (
              <div key={label}>
                <label className="mb-1 block text-xs font-medium text-apple-gray-600">{label}</label>
                <select value={value} onChange={(e) => set(e.target.value)} className={selectCls}>
                  <option value="">{required ? '请选择' : '不选择'}</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-end">
              <button onClick={handleBuildMap} disabled={!skuColumn || !fnskuColumn} className="rounded-xl bg-apple-blue px-4 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover disabled:opacity-40">
                确认映射
              </button>
            </div>
          </div>
        )}

        {skuMap && (
          <div className="mt-4">
            <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-apple-green">
              ✅ 已加载 {mapSize} 条映射
            </span>
            {matchPreview.length > 0 && (
              <div className="mt-2 rounded-xl bg-apple-gray-50 p-3 text-xs">
                <p className="mb-1 text-apple-gray-500">预览（前 5 条）：</p>
                {matchPreview.map((item, i) => (
                  <p key={i} className="text-apple-gray-700">
                    <code className="rounded bg-apple-gray-200 px-1">{item.fnsku}</code> → <strong>{item.sku}</strong>
                    {item.name && <span className="text-apple-gray-500"> ({item.name})</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: PDF Files */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
        <h3 className="text-sm font-semibold text-apple-gray-900">② 选择 PDF 文件</h3>
        <div
          className="mt-4 cursor-pointer rounded-2xl border-2 border-dashed border-apple-gray-300 p-8 text-center transition-colors hover:border-apple-blue hover:bg-apple-blue-light/30"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleSelectFiles}
        >
          <p className="text-3xl">📄</p>
          <p className="mt-2 text-sm font-medium text-apple-gray-900">点击选择或拖拽 PDF 文件</p>
          <p className="mt-0.5 text-xs text-apple-gray-500">支持批量选择多个文件</p>
        </div>

        {files.length > 0 && (
          <div className="mt-3 rounded-xl border border-apple-gray-200 overflow-hidden">
            <div className="flex items-center justify-between bg-apple-gray-50 px-4 py-2 text-xs text-apple-gray-500">
              <span>已选择 <strong className="text-apple-gray-900">{files.length}</strong> 个文件</span>
              <button onClick={() => { setFiles([]); setResults([]); }} className="text-apple-gray-500 hover:text-apple-red">清空</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-apple-gray-100">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="truncate text-apple-gray-700" title={f}>📄 {(f || '').split(/[/\\]/).pop()}</span>
                  <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2 text-apple-gray-400 hover:text-apple-red">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Step 3: Settings */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
        <h3 className="text-sm font-semibold text-apple-gray-900">③ 设置</h3>

        {/* Preview */}
        <div className="mt-4 rounded-xl bg-apple-gray-50 p-4 text-center">
          <p className="text-xs tracking-widest text-apple-gray-400">▐▐▐▐ 条形码区域 ▐▐▐▐</p>
          <div className="mx-auto mt-2 flex max-w-xs items-center justify-between rounded-lg border border-dashed border-apple-blue px-3 py-1.5 text-sm">
            <span className="text-apple-gray-700">{skuMap ? '← 自动匹配 SKU' : '（导入 Excel 后匹配）'}</span>
            <span className="text-apple-gray-700">{rightText || 'Made in China'}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-apple-gray-600">右侧文字</label>
            <input type="text" value={rightText} onChange={(e) => setRightText(e.target.value)} placeholder="Made in China" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-apple-gray-600">字号 (pt)</label>
            <input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} min={6} max={72} className={inputCls + " max-w-[120px]"} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-apple-gray-600">距底部 (pt)</label>
            <input type="number" value={marginBottom} onChange={(e) => setMarginBottom(Number(e.target.value))} min={0} max={500} className={inputCls + " max-w-[120px]"} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-apple-gray-600">左右边距 (pt)</label>
            <input type="number" value={marginSide} onChange={(e) => setMarginSide(Number(e.target.value))} min={0} max={200} className={inputCls + " max-w-[120px]"} />
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleSelectOutputFolder} className="rounded-xl border border-apple-gray-300 bg-white px-4 py-2 text-sm font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50">
            📁 {outputFolder ? '更换文件夹' : '选择输出文件夹'}
          </button>
          {outputFolder ? (
            <span className="truncate font-mono text-xs text-apple-gray-500" title={outputFolder}>{outputFolder}</span>
          ) : (
            <span className="text-xs text-apple-gray-400">未选择则保存在原目录</span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={handleProcess} disabled={processing || splitting || files.length === 0}
            className="rounded-xl bg-apple-blue px-5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-40">
            {processing ? <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />处理中...</span> : `批量处理 (${files.length})`}
          </button>
          <button onClick={handleSplit} disabled={processing || splitting || files.length === 0 || !skuMap}
            className="rounded-xl border border-apple-gray-300 bg-white px-5 py-2 text-sm font-medium text-apple-gray-700 transition-all hover:bg-apple-gray-50 active:scale-[0.97] disabled:opacity-40">
            {splitting ? <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-apple-gray-400/30 border-t-apple-gray-600" />拆分中...</span> : '拆分导出'}
          </button>
          <button onClick={handleWriteLinks} disabled={processing || splitting || !skuMap || !linkColumn || !outputFolder}
            className="rounded-xl border border-apple-gray-300 bg-white px-5 py-2 text-sm font-medium text-apple-gray-700 transition-all hover:bg-apple-gray-50 active:scale-[0.97] disabled:opacity-40">
            📎 写入文件名
          </button>
        </div>
        <p className="mt-2 text-xs text-apple-gray-400">
          自动识别 FNSKU → 匹配 SKU 写入左侧，右侧写入 "{rightText}"
        </p>
      </section>

      {/* Results */}
      {results.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-apple-gray-200">
          <div className="border-b border-apple-gray-200 bg-apple-gray-50 px-5 py-3 text-sm text-apple-gray-500">
            处理完成：成功 <strong className="text-apple-green">{successCount}</strong> 个，
            失败 <strong className="text-apple-red">{failCount}</strong> 个
          </div>
          <div className="max-h-72 divide-y divide-apple-gray-100 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3 text-sm ${r.success ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                <span>{r.success ? '✅' : '❌'}</span>
                <span className="font-medium text-apple-gray-900">{(r.file || '').split(/[/\\]/).pop()}</span>
                {r.success ? (
                  <span className="truncate text-apple-gray-500">
                    {r.splitCount != null && <code className="mr-1 rounded bg-green-50 px-1.5 py-0.5 text-xs text-apple-green">拆分 {r.splitCount} 个</code>}
                    {r.matchedCount > 0 && <code className="mr-1 rounded bg-green-50 px-1.5 py-0.5 text-xs text-apple-green">匹配 {r.matchedCount} 个{r.matchedCount <= 3 ? `: ${r.matchedSku}` : ''}</code>}
                    → {(r.output || '').split(/[/\\]/).pop()}
                  </span>
                ) : (
                  <span className="text-xs text-apple-red">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
