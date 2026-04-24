import { useState } from 'react';

function PdfEditor() {
  const [files, setFiles] = useState([]);
  const [skuMap, setSkuMap] = useState(null); // { fnsku: sku } 映射
  const [excelFile, setExcelFile] = useState('');
  const [skuColumn, setSkuColumn] = useState('');
  const [fnskuColumn, setFnskuColumn] = useState('');
  const [columns, setColumns] = useState([]);
  const [rightText, setRightText] = useState('Made in China');
  const [fontSize, setFontSize] = useState(8);
  const [marginBottom, setMarginBottom] = useState(10);
  const [marginSide, setMarginSide] = useState(18);
  const [processing, setProcessing] = useState(false);
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
    setMatchPreview([]);

    // 自动猜测列名
    const cols = result.columns.map((c) => c.toLowerCase());
    const fnskuIdx = cols.findIndex((c) => c.includes('fnsku'));
    const skuIdx = cols.findIndex((c) => c.includes('sku') && !c.includes('fnsku'));
    if (fnskuIdx >= 0) setFnskuColumn(result.columns[fnskuIdx]);
    if (skuIdx >= 0) setSkuColumn(result.columns[skuIdx]);
  };

  // 确认列映射，生成 SKU 映射表
  const handleBuildMap = async () => {
    if (!excelFile || !skuColumn || !fnskuColumn) return;
    const result = await window.electronAPI.buildSkuMap({
      filePath: excelFile,
      skuColumn,
      fnskuColumn,
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
          disabled={processing || files.length === 0}
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
                    {r.matchedSku && <code className="matched-sku">{r.matchedFnsku} → {r.matchedSku}</code>}
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
