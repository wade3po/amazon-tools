import { useState } from 'react';
import { FolderOpenIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function getFileName(p) {
  return p.split(/[\\/]/).pop();
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(0) + ' KB';
}

export default function ImageConverterPage() {
  const [rootFolder, setRootFolder] = useState('');
  const [subFolders, setSubFolders] = useState([]); // [{ folder, folderName, images }]
  const [totalImages, setTotalImages] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const isElectron = !!window.electronAPI;

  // ── 选择根目录并扫描 ──
  const handleScan = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    const res = await window.electronAPI.scanImageFolder();
    if (!res) return;
    if (res.subFolders.length === 0) {
      toast.error('未找到包含图片的子文件夹');
      return;
    }
    setRootFolder(res.rootFolder);
    setSubFolders(res.subFolders);
    setTotalImages(res.totalImages);
    setResults([]);
    setSummary(null);
    toast.success(`扫描完成：${res.subFolders.length} 个文件夹，共 ${res.totalImages} 张图片`);
  };

  const handleClear = () => {
    setRootFolder('');
    setSubFolders([]);
    setTotalImages(0);
    setResults([]);
    setSummary(null);
  };

  // ── 开始转换 ──
  const handleConvert = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    if (subFolders.length === 0) { toast.error('请先选择根目录'); return; }

    setProcessing(true);
    setResults([]);
    setSummary(null);

    try {
      const res = await window.electronAPI.convertImagesInPlace({ subFolders });
      setResults(res);

      const success = res.filter(r => r.success).length;
      const failed = res.filter(r => !r.success).length;
      const aiTagged = res.filter(r => r.aiTagged).length;
      setSummary({ success, failed, aiTagged });

      if (failed === 0) {
        toast.success(`转换完成：${success} 张成功${aiTagged ? `，${aiTagged} 张写入AI标记` : ''}`);
      } else {
        toast.error(`完成：${success} 成功，${failed} 失败`);
      }
    } catch (err) {
      toast.error('转换失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const rootFolderName = rootFolder.split(/[\\/]/).filter(Boolean).pop() || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-apple-gray-900">图片转换</h1>
        <p className="mt-0.5 text-sm text-apple-gray-500">
          PNG → JPG · 1800×1800 · 白底填充 · 1000KB · 输出到原文件夹 · 自动删除原 PNG
        </p>
      </div>

      {/* 选择根目录 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleScan}
          disabled={processing}
          className="inline-flex items-center gap-2 rounded-lg border border-apple-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-apple-gray-700 transition-all hover:bg-apple-gray-50 active:scale-[0.97] disabled:opacity-50"
        >
          <FolderOpenIcon className="h-4 w-4" />
          选择根目录
        </button>
        {rootFolder && !processing && (
          <button onClick={handleClear} className="text-xs text-apple-gray-400 hover:text-red-500 transition-colors">
            清空
          </button>
        )}
      </div>

      {/* 扫描结果概览 */}
      {rootFolder && (
        <div className="rounded-xl border border-apple-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-apple-gray-900">📁 {rootFolderName}</div>
              <div className="text-xs text-apple-gray-400 mt-0.5">{rootFolder}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-apple-gray-900">{totalImages} 张</div>
              <div className="text-xs text-apple-gray-400">{subFolders.length} 个文件夹</div>
            </div>
          </div>

          {/* 子文件夹列表 */}
          <div className="max-h-48 overflow-y-auto divide-y divide-apple-gray-100 rounded-lg border border-apple-gray-100">
            {subFolders.map((sf, i) => (
              <div key={sf.folder} className="flex items-center gap-3 px-3 py-2">
                <span className="w-5 text-xs text-apple-gray-400 text-right flex-shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-apple-gray-700 truncate" title={sf.folder}>
                  {sf.folderName}
                </span>
                <span className="text-xs text-apple-gray-400 flex-shrink-0">{sf.images.length} 张</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 转换按钮 */}
      {subFolders.length > 0 && (
        <button
          onClick={handleConvert}
          disabled={processing}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-apple-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-apple-blue-hover active:scale-[0.98] disabled:opacity-50"
        >
          {processing ? (
            <>
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              转换中…
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              开始转换 · {totalImages} 张图片
            </>
          )}
        </button>
      )}

      {/* 汇总结果 */}
      {summary && (
        <div className="rounded-xl border border-apple-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-apple-gray-800 mb-3">转换结果</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-500">{summary.success}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">转换成功</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">{summary.aiTagged}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">写入AI标记</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">失败</div>
            </div>
          </div>
        </div>
      )}

      {/* 详细结果列表 */}
      {results.length > 0 && (
        <div className="rounded-xl border border-apple-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-apple-gray-100 bg-apple-gray-50 px-4 py-2">
            <span className="text-xs font-medium text-apple-gray-500">详细结果</span>
            <button
              onClick={() => window.electronAPI?.openFile(rootFolder)}
              className="inline-flex items-center gap-1 text-xs text-apple-blue hover:text-apple-blue-hover"
            >
              <FolderOpenIcon className="h-3.5 w-3.5" />
              打开根目录
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-apple-gray-100">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2">
                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${r.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="flex-1 text-sm text-apple-gray-700 truncate" title={r.file}>
                  {getFileName(r.file)}
                </span>
                {r.success ? (
                  <span className="flex items-center gap-1.5 text-xs text-apple-gray-400 flex-shrink-0">
                    {r.aiTagged && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-500 font-medium">AI</span>
                    )}
                    {r.aiTagError && (
                      <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-500 font-medium" title={r.aiTagError}>AI标记失败</span>
                    )}
                    {formatSize(r.size)}
                  </span>
                ) : (
                  <span className="text-xs text-red-500 flex-shrink-0">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="rounded-xl border border-apple-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-apple-gray-800 mb-2">说明</h3>
        <ul className="space-y-1.5 text-xs text-apple-gray-500">
          <li>• 选择根目录后，自动扫描两级子文件夹内的所有图片</li>
          <li>• 输出文件名保持原文件名，只将扩展名改为 <code className="rounded bg-apple-gray-100 px-1 font-mono">.jpg</code></li>
          <li>• 输出到原文件夹，转换完成后自动删除原始 PNG</li>
          <li>• 输出格式：JPG，2000×2000 像素，白色背景，目标 1000KB</li>
          <li>• 原文件名含 <code className="rounded bg-apple-gray-100 px-1 font-mono">-P</code> 的图片，自动写入 AI 合规 XMP 标记</li>
        </ul>
      </div>
    </div>
  );
}
