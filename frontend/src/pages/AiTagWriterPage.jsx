import { useState } from 'react';
import { DocumentArrowUpIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const KEYWORD = 'contains-synthetic-performer';
const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);

function getExt(p) {
  const dot = p.lastIndexOf('.');
  return dot >= 0 ? p.slice(dot).toLowerCase() : '';
}

function getFileName(p) {
  return p.split(/[\\/]/).pop();
}

function statusColor(status) {
  if (status === 'done') return 'text-green-500';
  if (status === 'error') return 'text-red-500';
  if (status === 'writing') return 'text-yellow-500';
  return 'text-apple-gray-400';
}

function statusLabel(status, error) {
  if (status === 'writing') return '写入中…';
  if (status === 'done') return '写入成功';
  if (status === 'error') return error || '失败';
  return '等待';
}

export default function AiTagWriterPage() {
  const [fileItems, setFileItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const isElectron = !!window.electronAPI;

  // ── 选择图片文件（多选） ──
  const handleSelectFiles = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    const paths = await window.electronAPI.selectImageFilesForTag();
    if (!paths?.length) return;

    const supported = paths.filter(f => SUPPORTED_EXTS.has(getExt(f)));
    if (supported.length === 0) {
      toast.error('所选文件中没有支持的图片格式');
      return;
    }

    // 去重合并
    setFileItems(prev => {
      const existing = new Set(prev.map(f => f.path));
      const added = supported
        .filter(p => !existing.has(p))
        .map(p => ({ path: p, status: 'idle', error: '' }));
      return [...prev, ...added];
    });
    setSummary(null);
    toast.success(`已添加 ${supported.length} 张图片`);
  };

  // ── 移除单个文件 ──
  const handleRemove = (filePath) => {
    setFileItems(prev => prev.filter(f => f.path !== filePath));
    setSummary(null);
  };

  // ── 执行写入 ──
  const handleWrite = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    if (fileItems.length === 0) { toast.error('请先选择图片'); return; }

    setProcessing(true);
    setSummary(null);
    setFileItems(prev => prev.map(f => ({ ...f, status: 'writing', error: '' })));

    try {
      const results = await window.electronAPI.writeXmpAiTags({
        files: fileItems.map(f => f.path),
      });

      let written = 0, failed = 0;
      setFileItems(prev =>
        prev.map(f => {
          const r = results.find(x => x.file === f.path);
          if (!r) return f;
          if (r.success) { written++; return { ...f, status: 'done' }; }
          failed++;
          return { ...f, status: 'error', error: r.error || '写入失败' };
        })
      );

      setSummary({ written, failed });
      if (failed === 0) {
        toast.success(`全部完成，${written} 张已写入标记`);
      } else {
        toast.error(`完成：${written} 成功，${failed} 失败`);
      }
    } catch (err) {
      toast.error('写入失败：' + err.message);
      setFileItems(prev => prev.map(f => ({ ...f, status: 'idle' })));
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setFileItems([]);
    setSummary(null);
  };

  const doneCount = fileItems.filter(f => f.status === 'done').length;
  const errorCount = fileItems.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-apple-gray-900">AI 标记写入</h1>
        <p className="mt-0.5 text-sm text-apple-gray-500">
          批量将{' '}
          <code className="rounded bg-apple-gray-100 px-1 py-0.5 text-xs font-mono text-apple-gray-700">
            {KEYWORD}
          </code>{' '}
          写入图片 XMP 元数据，直接替换原文件
        </p>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSelectFiles}
          disabled={processing}
          className="inline-flex items-center gap-2 rounded-lg border border-apple-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-apple-gray-700 transition-all hover:bg-apple-gray-50 active:scale-[0.97] disabled:opacity-50"
        >
          <DocumentArrowUpIcon className="h-4 w-4" />
          选择图片
        </button>

        {fileItems.length > 0 && !processing && (
          <button
            onClick={handleClear}
            className="text-xs text-apple-gray-400 hover:text-red-500 transition-colors ml-auto"
          >
            清空列表
          </button>
        )}
      </div>

      {/* 文件列表 */}
      {fileItems.length > 0 && (
        <div className="rounded-xl border border-apple-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 border-b border-apple-gray-100 px-4 py-2 bg-apple-gray-50">
            <span className="w-6 text-xs text-apple-gray-400 text-right">#</span>
            <span className="flex-1 text-xs font-medium text-apple-gray-500">文件名</span>
            <span className="w-20 text-xs font-medium text-apple-gray-500 text-right">状态</span>
            <span className="w-4" />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-apple-gray-100">
            {fileItems.map((item, idx) => (
              <div key={item.path} className="flex items-center gap-3 px-4 py-2 group">
                <span className="w-6 text-xs text-apple-gray-400 text-right flex-shrink-0">
                  {idx + 1}
                </span>
                <span
                  className="flex-1 text-sm text-apple-gray-700 truncate"
                  title={item.path}
                >
                  {getFileName(item.path)}
                </span>
                <span
                  className={`w-20 text-right text-xs font-medium flex-shrink-0 ${statusColor(item.status)}`}
                  title={item.error}
                >
                  {statusLabel(item.status, item.error)}
                </span>
                {!processing && item.status !== 'done' && (
                  <button
                    onClick={() => handleRemove(item.path)}
                    className="w-4 flex-shrink-0 text-apple-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                )}
                {(processing || item.status === 'done') && <span className="w-4 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {(doneCount > 0 || errorCount > 0) && (
            <div className="flex items-center gap-4 border-t border-apple-gray-100 bg-apple-gray-50 px-4 py-2">
              {doneCount > 0 && <span className="text-xs text-green-500">{doneCount} 成功</span>}
              {errorCount > 0 && <span className="text-xs text-red-500">{errorCount} 失败</span>}
              <span className="text-xs text-apple-gray-400 ml-auto">
                {doneCount + errorCount} / {fileItems.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 写入按钮 */}
      {fileItems.length > 0 && (
        <button
          onClick={handleWrite}
          disabled={processing}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-apple-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-apple-blue-hover active:scale-[0.98] disabled:opacity-50"
        >
          {processing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              写入中…
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4" />
              开始写入 · {fileItems.length} 张图片
            </>
          )}
        </button>
      )}

      {/* 结果 */}
      {summary && (
        <div className="rounded-xl border border-apple-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-apple-gray-800 mb-3">写入结果</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-500">{summary.written}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">写入成功</div>
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
          <li>• 支持格式：JPG · PNG · WebP · TIF，可多选</li>
          <li>• 直接替换原文件，写入 XMP 元数据{' '}
            <code className="rounded bg-apple-gray-100 px-1 font-mono">dc:subject / rdf:Bag / rdf:li</code>
          </li>
          <li>• 已含该标记的图片自动跳过，不重复写入</li>
          <li>• 符合亚马逊 2026年7月公告要求</li>
        </ul>
      </div>
    </div>
  );
}
