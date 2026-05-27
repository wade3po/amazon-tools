import { useState, useRef } from 'react';
import { Image, Upload, Download, X, GripVertical, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';

const IMAGE_SLOTS = [
  { key: 'MAIN', label: 'Main Image' },
  { key: 'PT01', label: 'Point 1' },
  { key: 'PT02', label: 'Point 2' },
  { key: 'PT03', label: 'Point 3' },
  { key: 'PT04', label: 'Point 4' },
  { key: 'PT05', label: 'Point 5' },
  { key: 'PT06', label: 'Point 6' },
  { key: 'PT07', label: 'Point 7' },
  { key: 'PT08', label: 'Point 8' },
];

export default function BatchRenamer() {
  const { t } = useI18n();
  const [asin, setAsin] = useState('');
  const [files, setFiles] = useState([]); // { id, file, preview, slot }
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (newFiles) => {
    const images = Array.from(newFiles).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const mapped = images.map((file, i) => {
      const slotIdx = files.length + i;
      return {
        id: Date.now() + Math.random(),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        slot: IMAGE_SLOTS[slotIdx]?.key || `PT${String(slotIdx).padStart(2, '0')}`,
        ext: file.name.split('.').pop().toLowerCase(),
      };
    });
    setFiles((prev) => [...prev, ...mapped]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const moveFile = (fromIdx, toIdx) => {
    setFiles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      // Reassign slots based on position
      return arr.map((f, i) => ({
        ...f,
        slot: IMAGE_SLOTS[i]?.key || `PT${String(i).padStart(2, '0')}`,
      }));
    });
  };

  const getFileName = (file, index) => {
    const slot = IMAGE_SLOTS[index]?.key || `PT${String(index).padStart(2, '0')}`;
    const ext = file.ext || 'jpg';
    return `${asin.trim()}.${slot}.${ext}`;
  };

  const handleExport = async () => {
    if (!asin.trim() || files.length === 0) return;
    setExporting(true);

    try {
      const JSZip = (await import('jszip')).default || (await import('jszip'));
      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const name = getFileName(f, i);
        const arrayBuffer = await f.file.arrayBuffer();
        zip.file(name, arrayBuffer);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asin.trim()}_images.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-sm">
          <Image className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('batchRenamer.title')}</h1>
          <p className="text-sm text-gray-500">{t('batchRenamer.desc')}</p>
        </div>
      </div>

      {/* ASIN input */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-xs font-semibold text-gray-700 mb-2 block">{t('batchRenamer.asinLabel')}</label>
        <input
          type="text"
          value={asin}
          onChange={(e) => setAsin(e.target.value.toUpperCase())}
          placeholder="B0XXXXXXXXX"
          maxLength={10}
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm uppercase tracking-wider focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-100"
        />
        {asin && !/^[A-Z0-9]{10}$/.test(asin.trim()) && (
          <p className="text-[11px] text-orange-500 mt-1">{t('batchRenamer.asinHint')}</p>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-pink-300 hover:bg-pink-50/30"
      >
        <Upload className="h-7 w-7 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{t('batchRenamer.dropImages')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('batchRenamer.dropHint')}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File list with reorder */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{files.length} {t('batchRenamer.filesAdded')}</span>
            <button onClick={() => { files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)); setFiles([]); }} className="text-xs text-gray-400 hover:text-gray-600">
              {t('common.clearAll')}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {files.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                {/* Drag handle hint */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => idx > 0 && moveFile(idx, idx - 1)}
                    disabled={idx === 0}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-[10px]"
                  >▲</button>
                  <button
                    onClick={() => idx < files.length - 1 && moveFile(idx, idx + 1)}
                    disabled={idx === files.length - 1}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-[10px]"
                  >▼</button>
                </div>

                {/* Thumbnail */}
                <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                  {f.preview ? (
                    <img src={f.preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[9px] text-gray-400">VID</div>
                  )}
                </div>

                {/* Slot badge */}
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  idx === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {IMAGE_SLOTS[idx]?.key || `PT${String(idx).padStart(2, '0')}`}
                </span>

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 truncate">{f.file.name}</p>
                  <p className="text-[10px] font-mono text-pink-600">
                    → {asin.trim() || 'ASIN'}.{IMAGE_SLOTS[idx]?.key || `PT${String(idx).padStart(2, '0')}`}.{f.ext}
                  </p>
                </div>

                {/* Remove */}
                <button onClick={() => removeFile(f.id)} className="text-gray-300 hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting || !asin.trim() || files.length === 0}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-pink-200 disabled:opacity-50"
          >
            {exporting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('batchRenamer.exporting')}
              </span>
            ) : (
              t('batchRenamer.exportZip')
            )}
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('batchRenamer.namingRules')}</h3>
        <div className="grid gap-1.5 text-xs text-gray-600 sm:grid-cols-2">
          <div className="flex items-center gap-2"><span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">ASIN.MAIN.jpg</span> Main product image</div>
          <div className="flex items-center gap-2"><span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">ASIN.PT01.jpg</span> Additional image 1</div>
          <div className="flex items-center gap-2"><span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">ASIN.PT02.jpg</span> Additional image 2</div>
          <div className="flex items-center gap-2"><span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">ASIN.PT08.jpg</span> Max 9 images total</div>
        </div>
      </div>
    </div>
  );
}
