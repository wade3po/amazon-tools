import { useState } from 'react';
import { PhotoIcon, FolderOpenIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ImageConverterPage() {
  const [files, setFiles] = useState([]); // 文件路径数组
  const [sourceFolder, setSourceFolder] = useState('');
  const [folderName, setFolderName] = useState('');
  const [outputFolder, setOutputFolder] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);

  const handleSelectSourceFolder = async () => {
    if (!window.electronAPI) {
      toast.error('此功能仅在桌面端可用');
      return;
    }
    const res = await window.electronAPI.selectImageFiles();
    if (res && res.folder) {
      setSourceFolder(res.folder);
      setFolderName(res.folderName);
      setFiles(res.files);
      setResults([]);
    }
  };

  const handleSelectOutputFolder = async () => {
    if (!window.electronAPI) {
      toast.error('此功能仅在桌面端可用');
      return;
    }
    const folder = await window.electronAPI.selectOutputFolder();
    if (folder) {
      setOutputFolder(folder);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setSourceFolder('');
    setFolderName('');
    setResults([]);
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      toast.error('请先选择图片文件夹');
      return;
    }
    if (!outputFolder) {
      toast.error('请先选择输出文件夹');
      return;
    }

    setProcessing(true);
    setResults([]);

    try {
      const res = await window.electronAPI.convertImages({
        files,
        outputFolder,
        namePrefix: folderName, // 用源文件夹名称作为前缀
        targetSize: 2000,
        targetKB: 800,
        maxKB: 1000,
      });

      if (res.success) {
        setResults(res.results);
        const successCount = res.results.filter((r) => r.success).length;
        toast.success(`转换完成：${successCount}/${files.length} 张`);
      } else {
        toast.error(res.error || '转换失败');
      }
    } catch (err) {
      toast.error('转换失败：' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const getFileName = (filePath) => {
    return filePath.split(/[\\/]/).pop();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-apple-gray-900">图片转换</h1>
        <p className="mt-0.5 text-sm text-apple-gray-500">
          PNG → JPG · 2000×2000 · 白底填充 · 目标 800KB · 用文件夹名按顺序命名
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSelectSourceFolder}
          className="inline-flex items-center gap-2 rounded-lg border border-apple-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-apple-gray-700 transition-all hover:bg-apple-gray-50 active:scale-[0.97]"
        >
          <FolderOpenIcon className="h-4 w-4" />
          选择图片文件夹
        </button>

        <button
          onClick={handleSelectOutputFolder}
          className="inline-flex items-center gap-2 rounded-lg border border-apple-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-apple-gray-700 transition-all hover:bg-apple-gray-50 active:scale-[0.97]"
        >
          <FolderOpenIcon className="h-4 w-4" />
          选择输出文件夹
        </button>
      </div>

      {/* Folder Info */}
      {sourceFolder && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-apple-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-apple-gray-700">
              📁 源文件夹：<span className="text-apple-gray-900">{folderName}</span>
            </span>
            <button onClick={clearAll} className="text-xs text-apple-gray-400 hover:text-apple-red">
              清空
            </button>
          </div>
          <span className="text-xs text-apple-gray-400">{sourceFolder}</span>
          <span className="text-xs text-apple-gray-500">找到 {files.length} 张图片</span>
          <span className="text-xs text-apple-blue">
            输出命名：{folderName}-1.jpg, {folderName}-2.jpg, {folderName}-3.jpg ...
          </span>
        </div>
      )}

      {outputFolder && (
        <div className="rounded-xl border border-apple-gray-200 bg-white p-4">
          <span className="text-sm font-medium text-apple-gray-700">
            📂 输出到：<span className="text-apple-gray-900">{outputFolder}</span>
          </span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="divide-y divide-apple-gray-100 rounded-xl border border-apple-gray-200 bg-white max-h-48 overflow-y-auto">
            {files.map((filePath, idx) => (
              <div key={filePath} className="flex items-center gap-3 px-4 py-2">
                <span className="text-xs text-apple-gray-400 w-6 text-right">{idx + 1}</span>
                <PhotoIcon className="h-4 w-4 flex-shrink-0 text-apple-gray-400" />
                <span className="flex-1 text-sm text-apple-gray-700 truncate">{getFileName(filePath)}</span>
                <span className="text-xs text-apple-gray-400">→ {folderName}-{idx + 1}.jpg</span>
              </div>
            ))}
          </div>

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={processing || !outputFolder}
            className="w-full rounded-xl bg-apple-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-apple-blue-hover active:scale-[0.98] disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                转换中...
              </span>
            ) : !outputFolder ? (
              '请先选择输出文件夹'
            ) : (
              `开始转换 · ${files.length} 张图片`
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-apple-gray-700">
              转换结果 · {results.filter((r) => r.success).length}/{results.length} 成功
            </span>
            <button
              onClick={() => window.electronAPI?.openFile(outputFolder)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-apple-blue hover:text-apple-blue-hover"
            >
              <FolderOpenIcon className="h-3.5 w-3.5" />
              打开文件夹
            </button>
          </div>

          <div className="divide-y divide-apple-gray-100 rounded-xl border border-apple-gray-200 bg-white max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${r.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="flex-1 text-sm text-apple-gray-700 truncate">
                  {r.success ? r.outputName : getFileName(r.file)}
                </span>
                {r.success ? (
                  <span className="text-xs text-apple-gray-400">{formatSize(r.size)}</span>
                ) : (
                  <span className="text-xs text-red-500">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-apple-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-apple-gray-800 mb-2">说明</h3>
        <ul className="space-y-1.5 text-xs text-apple-gray-500">
          <li>• 选择图片文件夹后，自动读取其中所有图片文件</li>
          <li>• 输出命名规则：文件夹名-序号.jpg（如"12 水槽过滤网-1.jpg"）</li>
          <li>• 输出格式：JPG，2000×2000 像素，白色背景填充</li>
          <li>• 自动调整 JPEG 压缩质量，使文件大小接近 800KB（不超过 1MB）</li>
          <li>• 图片等比缩放居中，不裁剪不拉伸</li>
        </ul>
      </div>
    </div>
  );
}
