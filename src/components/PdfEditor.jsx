import { useState } from 'react';

function PdfEditor() {
  const [files, setFiles] = useState([]);
  const [skuMap, setSkuMap] = useState(null); // { fnsku: { sku, name } } 映射
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

  const handleSelectOutputFolder = async () => {
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) setOutputFolder(folder);
  };

  // 选择 Excel 文件
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

    // 自动猜测列名
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

  // 确认列映射，生成 SKU 映射表
  const handleBuildMap = async () => {
    if (!excelFile || !skuColumn || !fnskuColumn) return;
    const result = await window.electronAPI.buildSkuMap({
      filePath: excelFile,
      skuColumn,
      fnskuColumn,
      nameColumn,
    });
    if (result) {
      setSkuMap(result.map);
      setMatchPreview(result.preview);
    }
  };

  const handleSelectFiles = async () => {
    const result = await window.electronAPI.selectPdfFiles();
    if (result && result.length > 0) {
      setFiles(result);
      setResults([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      .map((f) => f.path)
      .filter(Boolean);
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...new Set([...prev, ...droppedFiles])]);
      setResults([]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    if (!skuMap && !rightText.trim()) return;

    setProcessing(true);
    setResults([]);

    try {
      const result = await window.electronAPI.processPdfFiles({
        files,
        skuMap: skuMap || {},
        rightText: rightText.trim(),
        fontSize,
        marginBottom,
        marginSide,
        outputFolder,
      });
      setResults(result);
    } catch (err) {
      alert('处理失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (files.length === 0 || !skuMap) return;
    if (!outputFolder) {
      alert('拆分导出需要先选择输出文件夹');
      return;
    }

    setSplitting(true);
    setResults([]);

    try {
      const result = await window.electronAPI.splitPdfLabels({
        files,
        skuMap,
        rightText: rightText.trim(),
        fontSize,
        marginBottom,
        marginSide,
        outputFolder,
      });
      setResults(result);
    } catch (err) {
      alert('拆分失败：' + err.message);
    } finally {
      setSplitting(false);
    }
  };

  const handleWriteLinks = async () => {
    if (!excelFile || !linkColumn || !skuMap || !outputFolder) {
      alert('请先导入 Excel、确认映射、选择标签列和输出文件夹');
      return;
    }
    try {
      const r = await window.electronAPI.writeExcelLinks({
        excelFile, fnskuColumn, linkColumn, outputFolder, skuMap,
      });
      if (r.success) {
        alert(`已写入 ${r.linkCount} 个文件名`);
      } else {
        alert('写入失败：' + r.error);
      }
    } catch (err) {
      alert('写入失败：' + err.message);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const mapSize = skuMap ? Object.keys(skuMap).length : 0;

  return (
    <div className="pdf-editor">
      {/* 步骤1: 导入 Excel */}
      <div className="pdf-section">
        <h3 className="section-step">① 导入 SKU 对照表（Excel）</h3>
        <div className="excel-import">
          <button className="btn btn-secondary" onClick={handleSelectExcel}>
            📊 {excelFile ? '重新选择 Excel' : '选择 Excel 文件'}
          </button>
          {excelFile && (
            <span className="excel-file-name">
              {excelFile.split(/[/\\]/).pop()}
            </span>
          )}
        </div>

        {columns.length > 0 && (
          <div className="column-mapping">
            <div className="mapping-row">
              <label className="setting-label">FNSKU 列（PDF 中的编码）</label>
              <select
                className="setting-input"
                value={fnskuColumn}
                onChange={(e) => setFnskuColumn(e.target.value)}
              >
                <option value="">请选择</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label className="setting-label">SKU 编码列（要添加到 PDF 的）</label>
              <select
                className="setting-input"
                value={skuColumn}
                onChange={(e) => setSkuColumn(e.target.value)}
              >
                <option value="">请选择</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label className="setting-label">品名列（用于拆分导出文件名，可选）</label>
              <select
                className="setting-input"
                value={nameColumn}
                onChange={(e) => setNameColumn(e.target.value)}
              >
                <option value="">不选择</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label className="setting-label">标签列（其左边列写入文件名，可选）</label>
              <select
                className="setting-input"
                value={linkColumn}
                onChange={(e) => setLinkColumn(e.target.value)}
              >
                <option value="">不选择</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleBuildMap}
              disabled={!skuColumn || !fnskuColumn}
            >
              确认映射
            </button>
          </div>
        )}

        {skuMap && (
          <div className="map-status">
            <span className="badge badge-success">
              ✅ 已加载 {mapSize} 条 FNSKU → SKU 映射
            </span>
            {matchPreview.length > 0 && (
              <div className="map-preview">
                <div className="preview-title">预览（前 5 条）：</div>
                {matchPreview.map((item, i) => (
                  <div key={i} className="preview-map-item">
                    <code>{item.fnsku}</code> → <strong>{item.sku}</strong>
                    {item.name && <span className="preview-name"> ({item.name})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 步骤2: 选择 PDF */}
      <div className="pdf-section">
        <h3 className="section-step">② 选择 PDF 文件</h3>
        <div
          className="pdf-drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleSelectFiles}
        >
          <div className="drop-icon">📄</div>
          <div className="drop-text">
            点击选择 PDF 文件，或拖拽文件到此处
          </div>
          <div className="drop-hint">支持批量选择多个 PDF 文件</div>
        </div>

        {files.length > 0 && (
          <div className="pdf-file-list">
            <div className="file-list-header">
              <span>已选择 <strong>{files.length}</strong> 个文件</span>
              <button
                className="btn btn-ghost"
                onClick={() => { setFiles([]); setResults([]); }}
              >
                清空
              </button>
            </div>
            <div className="file-list-items">
              {files.map((f, i) => (
                <div key={i} className="file-item">
                  <span className="file-name" title={f}>
                    📄 {(f || '').split(/[/\\]/).pop()}
                  </span>
                  <button
                    className="file-remove"
                    onClick={() => handleRemoveFile(i)}
                    title="移除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 步骤3: 设置 */}
      <div className="pdf-section">
        <h3 className="section-step">③ 设置</h3>

        <div className="pdf-preview-hint">
          <div className="preview-box">
            <div className="preview-barcode">▐▐▐▐ 条形码区域 ▐▐▐▐</div>
            <div className="preview-row">
              <span className="preview-left">{skuMap ? '← 自动匹配 SKU' : '（导入 Excel 后自动匹配）'}</span>
              <span className="preview-right">{rightText || 'Made in China'}</span>
            </div>
            <div className="preview-note">支持每页多个条形码标签，每个标签独立匹配</div>
          </div>
        </div>

        <div className="settings-grid">
          <div className="setting-item">
            <label className="setting-label">右侧文字</label>
            <input
              type="text"
              className="setting-input"
              value={rightText}
              onChange={(e) => setRightText(e.target.value)}
              placeholder="Made in China"
            />
          </div>
          <div className="setting-item">
            <label className="setting-label">字号 (pt)</label>
            <input
              type="number"
              className="setting-input setting-input-sm"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              min={6}
              max={72}
            />
          </div>
          <div className="setting-item">
            <label className="setting-label">距底部距离 (pt)</label>
            <input
              type="number"
              className="setting-input setting-input-sm"
              value={marginBottom}
              onChange={(e) => setMarginBottom(Number(e.target.value))}
              min={0}
              max={500}
            />
          </div>
          <div className="setting-item">
            <label className="setting-label">左右边距 (pt)</label>
            <input
              type="number"
              className="setting-input setting-input-sm"
              value={marginSide}
              onChange={(e) => setMarginSide(Number(e.target.value))}
              min={0}
              max={200}
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="pdf-actions">
        <div className="output-folder-row">
          <button className="btn btn-secondary" onClick={handleSelectOutputFolder}>
            📁 {outputFolder ? '更换输出文件夹' : '选择输出文件夹'}
          </button>
          {outputFolder ? (
            <span className="output-folder-path" title={outputFolder}>
              {outputFolder}
            </span>
          ) : (
            <span className="action-hint">未选择则保存在原文件同目录（加 _modified 后缀）</span>
          )}
        </div>
        <button
          className="btn btn-primary btn-large"
          onClick={handleProcess}
          disabled={processing || splitting || files.length === 0}
        >
          {processing ? (
            <>
              <span className="spinner" />
              处理中...
            </>
          ) : (
            `批量处理 (${files.length} 个文件)`
          )}
        </button>
        <button
          className="btn btn-secondary btn-large"
          onClick={handleSplit}
          disabled={processing || splitting || files.length === 0 || !skuMap}
          title="将每个条形码标签拆分为独立 PDF，文件名为 SKU-品名"
        >
          {splitting ? (
            <>
              <span className="spinner" />
              拆分中...
            </>
          ) : (
            '拆分导出标签'
          )}
        </button>
        <button
          className="btn btn-secondary btn-large"
          onClick={handleWriteLinks}
          disabled={processing || splitting || !skuMap || !linkColumn || !outputFolder}
          title="在标签列左边的空白单元格写入匹配的 PDF 文件名"
        >
          📎 写入文件名
        </button>
        <span className="action-hint">
          自动识别 PDF 中的 FNSKU → 匹配 SKU 写入左侧，右侧写入 "{rightText}"
        </span>
      </div>

      {/* 处理结果 */}
      {results.length > 0 && (
        <div className="pdf-results">
          <div className="results-summary">
            处理完成：成功 <strong className="text-success">{successCount}</strong> 个，
            失败 <strong className="text-error">{failCount}</strong> 个
          </div>
          <div className="result-list">
            {results.map((r, i) => (
              <div
                key={i}
                className={`result-item ${r.success ? 'result-success' : 'result-error'}`}
              >
                <span className="result-icon">{r.success ? '✅' : '❌'}</span>
                <span className="result-file">{(r.file || '').split(/[/\\]/).pop()}</span>
                {r.success ? (
                  <span className="result-output" title={r.output}>
                    {r.splitCount != null ? (
                      <code className="matched-sku">拆分出 {r.splitCount} 个标签</code>
                    ) : r.matchedCount > 0 ? (
                      <code className="matched-sku">
                        匹配 {r.matchedCount} 个标签
                        {r.matchedCount <= 3 && `: ${r.matchedSku}`}
                      </code>
                    ) : null}
                    → {(r.output || '').split(/[/\\]/).pop()}
                  </span>
                ) : (
                  <span className="result-error-msg">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfEditor;
