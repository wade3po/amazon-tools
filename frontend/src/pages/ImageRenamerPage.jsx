import { useState } from 'react';
import { FolderOpenIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// 直接用 file:// 协议加载本地图片（webSecurity: false 已允许）
function toFileUrl(filePath) {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

function Thumbnail({ filePath }) {
  return (
    <div className="w-full aspect-square rounded-lg border border-apple-gray-100 bg-apple-gray-50 overflow-hidden flex items-center justify-center">
      <img
        src={toFileUrl(filePath)}
        alt=""
        loading="lazy"
        className="w-full h-full object-contain"
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}

export default function ImageRenamerPage() {
  const [rootFolder, setRootFolder] = useState('');
  const [groups, setGroups] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const isElectron = !!window.electronAPI;

  const totalImages = groups.reduce((s, g) => s + g.images.length, 0);
  const changedCount = groups.reduce((s, g) =>
    s + g.images.filter(img => img.newBaseName.trim() && img.newBaseName.trim() !== img.baseName).length, 0);

  // ── 扫描文件夹 ──
  const handleScan = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    const res = await window.electronAPI.scanImageFolderForRename();
    if (!res) return;
    if (res.images.length === 0) { toast.error('未找到图片文件'); return; }

    const groupMap = new Map();
    for (const img of res.images) {
      if (!groupMap.has(img.folder)) {
        groupMap.set(img.folder, {
          folder: img.folder,
          folderName: img.folder.split(/[\\/]/).filter(Boolean).pop(),
          newFolderName: img.folder.split(/[\\/]/).filter(Boolean).pop(),
          folderStatus: 'idle',
          images: [],
        });
      }
      groupMap.get(img.folder).images.push({
        ...img,
        newBaseName: img.baseName,
        status: 'idle',
        error: '',
      });
    }

    setRootFolder(res.rootFolder);
    setGroups([...groupMap.values()]);
    setSummary(null);
    toast.success(`找到 ${res.images.length} 张图片，${groupMap.size} 个文件夹`);
  };

  const handleClear = () => { setRootFolder(''); setGroups([]); setSummary(null); };

  const handleNameChange = (folder, filePath, value) => {
    setGroups(prev => prev.map(g =>
      g.folder !== folder ? g : {
        ...g,
        images: g.images.map(img =>
          img.filePath === filePath ? { ...img, newBaseName: value } : img
        ),
      }
    ));
  };

  const handleFolderNameChange = (folder, value) => {
    setGroups(prev => prev.map(g =>
      g.folder !== folder ? g : { ...g, newFolderName: value }
    ));
  };

  const handleRenameFolder = async (folder) => {
    const g = groups.find(x => x.folder === folder);
    if (!g || !g.newFolderName.trim() || g.newFolderName.trim() === g.folderName) return;
    const res = await window.electronAPI.renameFolder({ folderPath: folder, newName: g.newFolderName.trim() });
    if (res.success && !res.skipped) {
      toast.success(`文件夹已重命名为：${res.newName}`);
      // 更新 group 里的 folder 路径和 folderName
      setGroups(prev => prev.map(g2 =>
        g2.folder !== folder ? g2 : {
          ...g2,
          folder: res.newPath,
          folderName: res.newName,
          newFolderName: res.newName,
          folderStatus: 'done',
          images: g2.images.map(img => ({
            ...img,
            folder: res.newPath,
            filePath: img.filePath.replace(folder, res.newPath),
          })),
        }
      ));
    } else if (!res.success) {
      toast.error(res.error || '重命名失败');
    }
  };

  // ── 执行重命名 ──
  const handleRename = async () => {
    if (!isElectron) { toast.error('此功能仅在桌面端可用'); return; }
    if (changedCount === 0) { toast('没有需要重命名的图片', { icon: 'ℹ️' }); return; }

    setProcessing(true);
    setSummary(null);

    const toRename = [];
    for (const g of groups) {
      for (const img of g.images) {
        if (img.newBaseName.trim() && img.newBaseName.trim() !== img.baseName) {
          toRename.push({ filePath: img.filePath, newBaseName: img.newBaseName.trim() });
        }
      }
    }

    try {
      const results = await window.electronAPI.renameImages({ renames: toRename });

      let done = 0, skipped = 0, failed = 0;
      setGroups(prev => prev.map(g => ({
        ...g,
        images: g.images.map(img => {
          const r = results.find(x => x.filePath === img.filePath);
          if (!r) return img;
          if (r.success && !r.skipped) {
            done++;
            return { ...img, filePath: r.newPath, fileName: r.newName, baseName: img.newBaseName.trim(), status: 'done' };
          }
          if (r.skipped) { skipped++; return { ...img, status: 'idle' }; }
          failed++;
          return { ...img, status: 'error', error: r.error };
        }),
      })));

      setSummary({ done, skipped, failed });
      if (failed === 0) toast.success(`重命名完成：${done} 张成功`);
      else toast.error(`完成：${done} 成功，${failed} 失败`);
    } catch (err) {
      toast.error('重命名失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const rootFolderName = rootFolder.split(/[\\/]/).filter(Boolean).pop() || '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-apple-gray-900">图片重命名</h1>
        <p className="mt-0.5 text-sm text-apple-gray-500">扫描文件夹内图片，逐张修改文件名后批量重命名</p>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleScan}
          disabled={processing}
          className="inline-flex items-center gap-2 rounded-lg border border-apple-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50 active:scale-[0.97] disabled:opacity-50"
        >
          <FolderOpenIcon className="h-4 w-4" />
          选择图片文件夹
        </button>
        {rootFolder && !processing && (
          <button onClick={handleClear} className="text-xs text-apple-gray-400 hover:text-red-500">清空</button>
        )}
        {changedCount > 0 && (
          <span className="text-xs text-apple-blue ml-auto">{changedCount} 张待重命名</span>
        )}
      </div>

      {/* 根目录信息 */}
      {rootFolder && (
        <div className="rounded-xl border border-apple-gray-200 bg-white px-4 py-3 flex items-center gap-3">
          <FolderOpenIcon className="h-4 w-4 text-apple-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-apple-gray-900">{rootFolderName}</span>
            <span className="text-xs text-apple-gray-400 ml-2">{rootFolder}</span>
          </div>
          <span className="text-xs text-apple-gray-500 flex-shrink-0">
            {groups.length} 个文件夹 · {totalImages} 张
          </span>
        </div>
      )}

      {/* 按文件夹分组，每组 4 列网格 */}
      {groups.map(g => (
        <div key={g.folder} className="rounded-xl border border-apple-gray-200 bg-white overflow-hidden">
          {/* 文件夹标题 */}
          <div className="flex items-center gap-2 bg-apple-gray-50 border-b border-apple-gray-100 px-4 py-2.5">
            <FolderOpenIcon className="h-4 w-4 text-apple-gray-400 flex-shrink-0" />
            <span className={`text-sm font-semibold ${g.folderStatus === 'done' ? 'text-green-600' : 'text-apple-gray-800'}`}>
              {g.folderName}
            </span>
            <span className="text-xs text-apple-gray-400 ml-1">{g.images.length} 张</span>
            {/* 文件夹重命名输入框 */}
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="text"
                value={g.newFolderName}
                onChange={e => handleFolderNameChange(g.folder, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRenameFolder(g.folder)}
                disabled={processing || g.folderStatus === 'done'}
                placeholder="文件夹新名称"
                className={`w-48 rounded-lg border px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/20 disabled:opacity-50 ${
                  g.newFolderName.trim() && g.newFolderName.trim() !== g.folderName
                    ? 'border-apple-blue bg-blue-50/30 text-apple-gray-900'
                    : 'border-apple-gray-200 bg-white text-apple-gray-600'
                }`}
              />
              {g.newFolderName.trim() && g.newFolderName.trim() !== g.folderName && g.folderStatus !== 'done' && (
                <button
                  onClick={() => handleRenameFolder(g.folder)}
                  disabled={processing}
                  className="rounded-lg bg-apple-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50"
                >
                  确认
                </button>
              )}
              {g.folderStatus === 'done' && (
                <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* 4 列网格 */}
          <div className="grid grid-cols-4 gap-4 p-4">
            {g.images.map(img => (
              <div
                key={img.filePath}
                className={`flex flex-col gap-2 rounded-xl p-2 border transition-colors ${
                  img.status === 'done'
                    ? 'border-green-200 bg-green-50/40'
                    : img.status === 'error'
                    ? 'border-red-200 bg-red-50/40'
                    : img.newBaseName.trim() && img.newBaseName.trim() !== img.baseName
                    ? 'border-apple-blue/40 bg-blue-50/20'
                    : 'border-apple-gray-100 bg-white'
                }`}
              >
                {/* 缩略图 */}
                <Thumbnail filePath={img.filePath} />

                {/* 原文件名 */}
                <div className="text-[11px] text-apple-gray-400 truncate text-center font-mono" title={img.fileName}>
                  {img.fileName}
                </div>

                {/* 新文件名输入框 */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={img.newBaseName}
                    onChange={e => handleNameChange(g.folder, img.filePath, e.target.value)}
                    disabled={processing || img.status === 'done'}
                    placeholder="新文件名"
                    className={`flex-1 min-w-0 rounded-lg border px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-apple-blue/20 disabled:opacity-50 ${
                      img.newBaseName.trim() && img.newBaseName.trim() !== img.baseName
                        ? 'border-apple-blue bg-white text-apple-gray-900'
                        : 'border-apple-gray-200 bg-apple-gray-50 text-apple-gray-600'
                    }`}
                  />
                  <span className="text-[10px] text-apple-gray-400 flex-shrink-0">{img.ext}</span>
                </div>

                {/* 状态 */}
                {img.status === 'done' && (
                  <div className="flex items-center justify-center gap-1 text-[11px] text-green-500">
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    已重命名
                  </div>
                )}
                {img.status === 'error' && (
                  <div className="text-[11px] text-red-500 text-center truncate" title={img.error}>
                    {img.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 执行按钮 */}
      {groups.length > 0 && (
        <button
          onClick={handleRename}
          disabled={processing || changedCount === 0}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-apple-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-apple-blue-hover active:scale-[0.98] disabled:opacity-50"
        >
          {processing ? (
            <><ArrowPathIcon className="h-4 w-4 animate-spin" />重命名中…</>
          ) : (
            <><CheckCircleIcon className="h-4 w-4" />{changedCount > 0 ? `执行重命名 · ${changedCount} 张` : '没有修改'}</>
          )}
        </button>
      )}

      {/* 结果 */}
      {summary && (
        <div className="rounded-xl border border-apple-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-apple-gray-800 mb-3">重命名结果</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-500">{summary.done}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">成功</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-apple-gray-400">{summary.skipped}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">跳过</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
              <div className="text-xs text-apple-gray-500 mt-0.5">失败</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
