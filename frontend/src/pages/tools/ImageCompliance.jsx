import { useState, useRef } from 'react';
import { Image, Upload, Download, X, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';

const OUTPUT_SIZES = [
  { value: '1600', label: '1600×1600' },
  { value: '2000', label: '2000×2000' },
  { value: '1000', label: '1000×1000' },
];

export default function ImageCompliance() {
  const { t } = useI18n();
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [outputSize, setOutputSize] = useState('2000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
    addImages(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    addImages(files);
  };

  const addImages = (files) => {
    const newImages = files.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setImages((prev) => [...prev, ...newImages]);
    setResults([]);
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleProcess = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setResults([]);

    const size = parseInt(outputSize);
    const processedResults = [];

    for (const img of images) {
      try {
        const result = await processImage(img.file, size, bgColor);
        processedResults.push({
          name: img.name.replace(/\.[^.]+$/, `_${size}x${size}.png`),
          url: result,
          status: 'success',
        });
      } catch (err) {
        processedResults.push({
          name: img.name,
          status: 'error',
          error: err.message,
        });
      }
    }

    setResults(processedResults);
    setProcessing(false);
  };

  const processImage = (file, targetSize, bg) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const tempUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(tempUrl); // Clean up temp URL after load
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, targetSize, targetSize);

        // Calculate scale to fit (with padding)
        const padding = targetSize * 0.05; // 5% padding
        const maxDim = targetSize - padding * 2;
        const scale = Math.min(maxDim / img.width, maxDim / img.height);

        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const x = (targetSize - drawWidth) / 2;
        const y = (targetSize - drawHeight) / 2;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to process image'));
          }
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = tempUrl;
    });
  };

  const downloadAll = () => {
    results.filter((r) => r.status === 'success').forEach((r) => {
      const a = document.createElement('a');
      a.href = r.url;
      a.download = r.name;
      a.click();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-sm">
          <Image className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('imageCompliance.title')}</h1>
          <p className="text-sm text-gray-500">{t('imageCompliance.desc')}</p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{t('imageCompliance.output')}</span>
          {OUTPUT_SIZES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutputSize(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                outputSize === opt.value
                  ? 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{t('imageCompliance.background')}</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-gray-200"
            />
            <span className="text-xs text-gray-500 font-mono">{bgColor}</span>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/30"
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{t('imageCompliance.dropImages')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('imageCompliance.supportsFormats')}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{images.length} {t('imageCompliance.images')}</span>
            <button
              onClick={() => { images.forEach((i) => URL.revokeObjectURL(i.preview)); setImages([]); setResults([]); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t('common.clearAll')}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                <img src={img.preview} alt={img.name} className="h-full w-full object-contain" />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-fuchsia-200 disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('common.processing')}
              </span>
            ) : (
              t('imageCompliance.convertTo', { size: outputSize })
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{t('common.results')}</span>
            <button onClick={downloadAll} className="flex items-center gap-1 text-xs font-medium text-fuchsia-600 hover:text-fuchsia-700">
              <Download className="h-3 w-3" /> {t('common.downloadAll')}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {results.filter((r) => r.status === 'success').map((r, i) => (
              <div key={i} className="group relative rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="aspect-square bg-gray-50">
                  <img src={r.url} alt={r.name} className="h-full w-full object-contain" />
                </div>
                <div className="flex items-center justify-between p-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-500 truncate">{r.name}</span>
                  <a href={r.url} download={r.name} className="text-fuchsia-600">
                    <Download className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('imageCompliance.requirements')}</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li>• {t('imageCompliance.tip1')}</li>
          <li>• {t('imageCompliance.tip2')}</li>
          <li>• {t('imageCompliance.tip3')}</li>
          <li>• {t('imageCompliance.tip4')}</li>
        </ul>
      </div>
    </div>
  );
}
