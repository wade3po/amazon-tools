import { useState } from 'react';

export default function PdfCleanPage() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [outputFolder, setOutputFolder] = useState('');

  const isElectron = !!window.electronAPI;

  const handleSelectOutputFolder = async () => {
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) setOutputFolder(folder);
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
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter((f) => f.name.toLowerCase().endsWith('.pdf'))
      .map((f) => f.path)
      .filter(Boolean);
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...new Set([...prev, ...droppedFiles])]);
      setResults([]);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
    try {
      const result = await window.electronAPI.cleanFbaLabels({ files, outputFolder });
      setResults(result);
    } catch (err) {
      alert('处理失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  if (!isElectron) {
    return (
      <div className="rounded-2xl bg-apple-blue-light p-6 text-center text-sm text-apple-blue">
        <p className="font-medium">PDF 清理功能需要在桌面端使用</p>
        <p className="mt-1 text-apple-blue/80">请下载桌面版应用以使用完整功能。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-apple-gray-900">FBA 标签清理</h1>
        <p className="mt-1 text-sm text-apple-gray-500">
          上传 FBA 箱唛 PDF，自动去除发货地信息和目的地公司名称，保护隐私
        </p>
      </div>

      {/* 说明区域 */}
      <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
        <h3 className="text-sm font-semibold text-amber-900">📋 功能说明</h3>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          <li>• 自动去除<strong>目的地</strong>中 "FBA:" 后面的公司名称（如 "Xia Men Yun Li..."）</li>
          <li>• 自动去除<strong>发货地</strong>中的姓名、详细地址、邮编城市信息</li>
          <li>• 保留仓库代码、地址和国家信息</li>
        </ul>
      </section>

      {/* 选择 PDF 文件 */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
        <h3 className="text-sm font-semibold text-apple-gray-900">① 选择 FBA 箱唛 PDF</h3>
        <div
          className="mt-4 cursor-pointer rounded-2xl border-2 border-dashed border-apple-gray-300 p-8 text-center transition-colors hover:border-apple-blue hover:bg-apple-blue-light/30"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={handleSelectFiles}
        >
          <p className="text-3xl">📄</p>
          <p className="mt-2 text-sm font-medium text-apple-gray-900">点击选择或拖拽 FBA 箱唛 PDF 文件</p>
          <p className="mt-0.5 text-xs text-apple-gray-500">支持批量选择多个文件</p>
        </div>

        {files.length > 0 && (
          <div className="mt-3 rounded-xl border border-apple-gray-200 overflow-hidden">
            <div className="flex items-center justify-between bg-apple-gray-50 px-4 py-2 text-xs text-apple-gray-500">
              <span>
                已选择 <strong className="text-apple-gray-900">{files.length}</strong> 个文件
              </span>
              <button
                onClick={() => {
                  setFiles([]);
                  setResults([]);
                }}
                className="text-apple-gray-500 hover:text-apple-red"
              >
                清空
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-apple-gray-100">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="truncate text-apple-gray-700" title={f}>
                    📄 {(f || '').split(/[/\\]/).pop()}
                  </span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="ml-2 text-apple-gray-400 hover:text-apple-red"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 操作区域 */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
        <h3 className="text-sm font-semibold text-apple-gray-900">② 输出设置</h3>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSelectOutputFolder}
            className="rounded-xl border border-apple-gray-300 bg-white px-4 py-2 text-sm font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50"
          >
            📁 {outputFolder ? '更换文件夹' : '选择输出文件夹'}
          </button>
          {outputFolder ? (
            <span className="truncate font-mono text-xs text-apple-gray-500" title={outputFolder}>
              {outputFolder}
            </span>
          ) : (
            <span className="text-xs text-apple-gray-400">未选择则保存在原目录（加 _cleaned 后缀）</span>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={handleProcess}
            disabled={processing || files.length === 0}
            className="rounded-xl bg-apple-blue px-5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-40"
          >
            {processing ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                处理中...
              </span>
            ) : (
              `🧹 开始清理 (${files.length})`
            )}
          </button>
        </div>
      </section>

      {/* 结果 */}
      {results.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-apple-gray-200">
          <div className="border-b border-apple-gray-200 bg-apple-gray-50 px-5 py-3 text-sm text-apple-gray-500">
            处理完成：成功 <strong className="text-apple-green">{successCount}</strong> 个， 失败{' '}
            <strong className="text-apple-red">{failCount}</strong> 个
          </div>
          <div className="max-h-72 divide-y divide-apple-gray-100 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-5 py-3 text-sm ${r.success ? 'bg-green-50/30' : 'bg-red-50/30'}`}
              >
                <span>{r.success ? '✅' : '❌'}</span>
                <span className="font-medium text-apple-gray-900">
                  {(r.file || '').split(/[/\\]/).pop()}
                </span>
                {r.success ? (
                  <span className="truncate text-apple-gray-500">→ {(r.output || '').split(/[/\\]/).pop()}</span>
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
