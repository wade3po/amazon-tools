import { useState, useRef } from 'react';
import { ScanLine, Upload, Download, X, FileUp, Loader2, Info } from 'lucide-react';
import { useI18n } from '../../i18n';

export default function FnskuSplitter() {
  const { t } = useI18n();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
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
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';

      const processedResults = [];

      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();

          // Step 1: Use pdfjs-dist to detect label positions via text extraction
          const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), useWorkerFetch: false, isEvalSupported: false }).promise;
          const pageCount = pdfJsDoc.numPages;

          // Step 2: Load with pdf-lib for splitting
          const srcDoc = await PDFDocument.load(arrayBuffer);
          const outDoc = await PDFDocument.create();
          let totalLabels = 0;

          for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
            const page = await pdfJsDoc.getPage(pageIdx + 1);
            const viewport = page.getViewport({ scale: 1.0 });
            const textContent = await page.getTextContent();

            const srcPage = srcDoc.getPage(pageIdx);
            const { width: pageWidth, height: pageHeight } = srcPage.getSize();

            // Find FNSKU-like text items (X00 pattern, 10 chars alphanumeric)
            const fnskuItems = textContent.items.filter((item) => {
              const str = item.str.trim();
              return /^X[0-9A-Z]{9}$/.test(str) || /^[A-Z0-9]{10}$/.test(str);
            });

            if (fnskuItems.length > 0) {
              // Detected individual labels by FNSKU positions
              // Group text items into label regions based on Y clustering
              const labelBounds = detectLabelBounds(textContent.items, pageWidth, pageHeight, viewport.height);

              if (labelBounds.length > 0) {
                for (const bounds of labelBounds) {
                  const [embeddedPage] = await outDoc.embedPages([srcPage], [{
                    left: bounds.left,
                    bottom: bounds.bottom,
                    right: bounds.right,
                    top: bounds.top,
                  }]);

                  const labelW = bounds.right - bounds.left;
                  const labelH = bounds.top - bounds.bottom;
                  const newPage = outDoc.addPage([labelW, labelH]);
                  newPage.drawPage(embeddedPage, { x: 0, y: 0, width: labelW, height: labelH });
                  totalLabels++;
                }
              } else {
                // Fallback: split by detected grid (count FNSKUs to infer layout)
                const { cols, rows } = inferGrid(fnskuItems, pageWidth, pageHeight, viewport.height);
                const cellW = pageWidth / cols;
                const cellH = pageHeight / rows;

                for (let row = 0; row < rows; row++) {
                  for (let col = 0; col < cols; col++) {
                    const [embeddedPage] = await outDoc.embedPages([srcPage], [{
                      left: col * cellW,
                      bottom: pageHeight - (row + 1) * cellH,
                      right: (col + 1) * cellW,
                      top: pageHeight - row * cellH,
                    }]);
                    const newPage = outDoc.addPage([cellW, cellH]);
                    newPage.drawPage(embeddedPage, { x: 0, y: 0, width: cellW, height: cellH });
                    totalLabels++;
                  }
                }
              }
            } else {
              // No FNSKU detected — treat entire page as single label
              const [embeddedPage] = await outDoc.embedPages([srcPage]);
              const newPage = outDoc.addPage([pageWidth, pageHeight]);
              newPage.drawPage(embeddedPage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
              totalLabels++;
            }
          }

          const pdfBytes = await outDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);

          processedResults.push({
            name: file.name.replace('.pdf', '_split.pdf'),
            url,
            pages: pageCount,
            labels: totalLabels,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-sm">
          <ScanLine className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('fnskuSplitter.title')}</h1>
          <p className="text-sm text-gray-500">{t('fnskuSplitter.desc')}</p>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
        <p className="text-xs text-sky-700 leading-relaxed">{t('fnskuSplitter.autoDetect')}</p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:border-sky-300 hover:bg-sky-50/30"
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{t('common.dropFiles')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('fnskuSplitter.uploadHint')}</p>
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
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileUp className="h-4 w-4 shrink-0 text-sky-500" />
                  <span className="text-xs text-gray-700 truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
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
            className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-sky-200 disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('fnskuSplitter.splitting')}
              </span>
            ) : (
              t('fnskuSplitter.splitBtn')
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-700">{t('common.results')}</span>
          {results.map((r, i) => (
            <div key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              r.status === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="min-w-0">
                <span className={`text-xs truncate block ${r.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {r.name}
                </span>
                {r.labels && (
                  <span className="text-[10px] text-green-500">
                    {r.pages} {t('fnskuSplitter.pagesProcessed')} → {r.labels} {t('fnskuSplitter.labelsExtracted')}
                  </span>
                )}
              </div>
              {r.status === 'success' && (
                <a href={r.url} download={r.name} className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800">
                  <Download className="h-3 w-3" /> {t('common.download')}
                </a>
              )}
              {r.status === 'error' && (
                <span className="text-[10px] text-red-500 max-w-[200px] truncate">{r.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('common.howItWorks')}</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li>• {t('fnskuSplitter.tip1')}</li>
          <li>• {t('fnskuSplitter.tip2')}</li>
          <li>• {t('fnskuSplitter.tip3')}</li>
          <li>• {t('fnskuSplitter.tip4')}</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Detect label bounding boxes from text items positions
 * pdfjs text coordinates: origin at bottom-left, Y increases upward
 * pdf-lib coordinates: same (origin bottom-left)
 */
function detectLabelBounds(textItems, pageWidth, pageHeight, viewportHeight) {
  if (textItems.length === 0) return [];

  // Convert pdfjs transform to pdf-lib coordinates
  // pdfjs transform: [scaleX, 0, 0, scaleY, translateX, translateY]
  const items = textItems
    .filter((item) => item.str.trim().length > 0)
    .map((item) => {
      const tx = item.transform[4];
      const ty = item.transform[5];
      return { x: tx, y: ty, text: item.str, width: item.width, height: item.height };
    });

  if (items.length === 0) return [];

  // Cluster items by Y position to find rows
  const yPositions = items.map((i) => i.y);
  const uniqueYs = [...new Set(yPositions.map((y) => Math.round(y)))].sort((a, b) => b - a);

  // Find FNSKU items (typically the barcode text)
  const fnskuItems = items.filter((item) => /^X[0-9A-Z]{9}$/.test(item.text.trim()) || /^[A-Z0-9]{10}$/.test(item.text.trim()));

  if (fnskuItems.length < 2) return []; // Not enough to determine grid

  // Determine columns from X positions of FNSKUs
  const fnskuXs = fnskuItems.map((i) => i.x).sort((a, b) => a - b);
  const cols = detectClusters(fnskuXs);

  // Determine rows from Y positions of FNSKUs
  const fnskuYs = fnskuItems.map((i) => i.y).sort((a, b) => b - a);
  const rows = detectClusters(fnskuYs);

  if (cols < 1 || rows < 1) return [];

  // Calculate cell dimensions
  const cellW = pageWidth / cols;
  const cellH = pageHeight / rows;

  const bounds = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      bounds.push({
        left: col * cellW,
        bottom: pageHeight - (row + 1) * cellH,
        right: (col + 1) * cellW,
        top: pageHeight - row * cellH,
      });
    }
  }

  return bounds;
}

/**
 * Count distinct clusters in a sorted array of numbers
 */
function detectClusters(sortedValues) {
  if (sortedValues.length === 0) return 0;
  let clusters = 1;
  let lastVal = sortedValues[0];
  const threshold = 30; // Minimum distance between clusters (in PDF points)

  for (let i = 1; i < sortedValues.length; i++) {
    if (Math.abs(sortedValues[i] - lastVal) > threshold) {
      clusters++;
      lastVal = sortedValues[i];
    }
  }
  return clusters;
}

/**
 * Infer grid layout from FNSKU positions as fallback
 */
function inferGrid(fnskuItems, pageWidth, pageHeight, viewportHeight) {
  const xs = fnskuItems.map((item) => item.transform[4]);
  const ys = fnskuItems.map((item) => item.transform[5]);

  const cols = detectClusters([...xs].sort((a, b) => a - b));
  const rows = detectClusters([...ys].sort((a, b) => b - a));

  // Fallback to common layouts
  if (cols < 1 || rows < 1) {
    const total = fnskuItems.length;
    if (total <= 1) return { cols: 1, rows: 1 };
    if (total <= 6) return { cols: 2, rows: Math.ceil(total / 2) };
    if (total <= 15) return { cols: 3, rows: Math.ceil(total / 3) };
    return { cols: 3, rows: 10 }; // Amazon default
  }

  return { cols, rows };
}
