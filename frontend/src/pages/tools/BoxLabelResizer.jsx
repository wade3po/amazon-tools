import { useState, useRef } from 'react';
import { Package, Upload, Download, X, FileUp, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';

export default function BoxLabelResizer() {
  const { t } = useI18n();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [outputSize, setOutputSize] = useState('4x6');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).filter((f) => f.type === 'application/pdf');
    setFiles((prev) => [...prev, ...newFiles]);
    setResults([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files).filter((f) => f.type === 'application/pdf');
    setFiles((prev) => [...prev, ...newFiles]);
    setResults([]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);

    try {
      const { PDFDocument } = await import('pdf-lib');

      const processedResults = [];

      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const srcDoc = await PDFDocument.load(arrayBuffer);
          const pageCount = srcDoc.getPageCount();

          // Target dimensions based on output size
          const targetWidths = { '4x6': 288, '4x4': 288, 'a6': 297.64 };
          const targetHeights = { '4x6': 432, '4x4': 288, 'a6': 419.53 };
          const targetWidth = targetWidths[outputSize];
          const targetHeight = targetHeights[outputSize];

          const outDoc = await PDFDocument.create();

          for (let i = 0; i < pageCount; i++) {
            const srcPage = srcDoc.getPage(i);
            const { width: srcWidth, height: srcHeight } = srcPage.getSize();

            // Create new page with target size
            const newPage = outDoc.addPage([targetWidth, targetHeight]);

            // Embed the source page
            const [embeddedPage] = await outDoc.embedPages([srcPage]);

            // Calculate scale to fit while maintaining aspect ratio
            const scaleX = targetWidth / srcWidth;
            const scaleY = targetHeight / srcHeight;
            const scale = Math.min(scaleX, scaleY) * 0.95; // 95% to add margins

            const scaledWidth = srcWidth * scale;
            const scaledHeight = srcHeight * scale;

            // Center the content
            const x = (targetWidth - scaledWidth) / 2;
            const y = (targetHeight - scaledHeight) / 2;

            newPage.drawPage(embeddedPage, {
              x,
              y,
              width: scaledWidth,
              height: scaledHeight,
            });
          }

          const pdfBytes = await outDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);

          processedResults.push({
            name: file.name.replace('.pdf', `_${outputSize}.pdf`),
            url,
            pages: pageCount,
            status: 'success',
          });
        } catch (err) {
          processedResults.push({
            name: file.name,
            status: 'error',
            error: err.message,
          });
        }
      }

      setResults(processedResults);
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = () => {
    results
      .filter((r) => r.status === 'success')
      .forEach((r) => {
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-sm">
          <Package className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('boxLabel.title')}</h1>
          <p className="text-sm text-gray-500">{t('boxLabel.desc')}</p>
        </div>
      </div>

      {/* Output size selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-700">{t('boxLabel.outputSize')}</span>
        {[
          { value: '4x6', label: '4×6 inch' },
          { value: '4x4', label: '4×4 inch' },
          { value: 'a6', label: 'A6' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setOutputSize(opt.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              outputSize === opt.value
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:border-rose-300 hover:bg-rose-50/30"
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{t('common.dropFiles')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('boxLabel.supportsPdf')}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{files.length} {t('common.files')}</span>
            <button
              onClick={() => { setFiles([]); setResults([]); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t('common.clearAll')}
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileUp className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="text-xs text-gray-700 truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <button onClick={() => removeFile(i)} className="text-gray-300 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-rose-200 disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.processing')}
              </span>
            ) : (
              t('boxLabel.convertTo', { size: outputSize })
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{t('common.results')}</span>
            {results.filter((r) => r.status === 'success').length > 1 && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                <Download className="h-3 w-3" />
                {t('common.downloadAll')}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                r.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs truncate ${r.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {r.name}
                  </span>
                  {r.pages && <span className="text-[10px] text-green-500 shrink-0">{r.pages} {t('boxLabel.pages')}</span>}
                </div>
                {r.status === 'success' && (
                  <a
                    href={r.url}
                    download={r.name}
                    className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                  >
                    <Download className="h-3 w-3" />
                    {t('common.download')}
                  </a>
                )}
                {r.status === 'error' && (
                  <span className="text-[10px] text-red-500">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('common.howItWorks')}</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li>• {t('boxLabel.tip1')}</li>
          <li>• {t('boxLabel.tip2')}</li>
          <li>• {t('boxLabel.tip3')}</li>
          <li>• {t('boxLabel.tip4')}</li>
        </ul>
      </div>
    </div>
  );
}
