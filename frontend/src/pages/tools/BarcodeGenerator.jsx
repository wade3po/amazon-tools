import { useState, useRef, useCallback } from 'react';
import { Barcode, Plus, Trash2, Download, Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { useI18n } from '../../i18n';

// High-resolution Code128 barcode generation using canvas
function drawCode128(canvas, text, options = {}) {
  const { displayWidth = 300, displayHeight = 80, fontSize = 12, scale = 3 } = options;

  // Use higher internal resolution for crisp rendering
  const width = displayWidth * scale;
  const height = displayHeight * scale;

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const CODE128B_START = 104;
  const CODE128_STOP = 106;

  const patterns = [
    '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
    '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
    '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
    '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
    '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
    '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
    '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
    '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
    '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
    '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
    '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
    '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
    '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
    '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
    '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
    '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
    '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
    '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
    '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
    '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
    '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
    '11010011100', '1100011101011',
  ];

  if (!text || text.length === 0) {
    ctx.fillStyle = '#999';
    ctx.font = `${fontSize * scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('No data', width / 2, height / 2);
    return;
  }

  const codes = [CODE128B_START];
  let checksum = CODE128B_START;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const code = Math.max(0, Math.min(94, charCode - 32));
    codes.push(code);
    checksum += code * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(CODE128_STOP);

  let fullPattern = '';
  for (const code of codes) {
    fullPattern += patterns[code] || '';
  }

  const scaledFontSize = fontSize * scale;
  const barAreaHeight = height - scaledFontSize - 12 * scale;
  const padding = 15 * scale;
  const availableWidth = width - padding * 2;

  // Calculate bar unit width (integer pixels for crisp lines)
  const unitWidth = Math.floor(availableWidth / fullPattern.length);
  const totalBarsWidth = unitWidth * fullPattern.length;
  const startX = Math.floor((width - totalBarsWidth) / 2);

  ctx.fillStyle = '#000000';
  for (let i = 0; i < fullPattern.length; i++) {
    if (fullPattern[i] === '1') {
      ctx.fillRect(startX + i * unitWidth, 6 * scale, unitWidth, barAreaHeight);
    }
  }

  // Draw text below barcode
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${scaledFontSize}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, width / 2, height - 4 * scale);
}

export default function BarcodeGenerator() {
  const { t } = useI18n();
  const [items, setItems] = useState([{ id: 1, sku: '', fnsku: '' }]);
  const [generated, setGenerated] = useState([]);
  const [generating, setGenerating] = useState(false);
  const canvasRefs = useRef({});
  const excelInputRef = useRef(null);

  const addItem = () => {
    setItems((prev) => [...prev, { id: Date.now(), sku: '', fnsku: '' }]);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleBulkPaste = (e) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      const newItems = lines.map((line, i) => {
        const parts = line.split(/[\t,]/).map((p) => p.trim());
        return { id: Date.now() + i, sku: parts[0] || '', fnsku: parts[1] || parts[0] || '' };
      });
      setItems(newItems);
    }
  };

  // Excel/CSV upload handler
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Skip header row if it looks like headers
      const startRow = rows.length > 0 && typeof rows[0][0] === 'string' &&
        (rows[0][0].toLowerCase().includes('sku') || rows[0][0].toLowerCase().includes('fnsku'))
        ? 1 : 0;

      const newItems = [];
      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const sku = String(row[0] || '').trim();
        const fnsku = String(row[1] || row[0] || '').trim();
        if (sku || fnsku) {
          newItems.push({ id: Date.now() + i, sku, fnsku });
        }
      }

      if (newItems.length > 0) {
        setItems(newItems);
        setGenerated([]);
      }
    } catch (err) {
      console.error('Failed to parse Excel:', err);
    }

    // Reset input
    e.target.value = '';
  };

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    const validItems = items.filter((item) => item.fnsku || item.sku);

    setTimeout(() => {
      setGenerated(validItems.map((item) => ({
        ...item,
        barcodeText: item.fnsku || item.sku,
      })));
      setGenerating(false);
    }, 300);
  }, [items]);

  const downloadBarcode = (index) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return;
    // Export full resolution PNG
    const url = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generated[index].barcodeText}.png`;
    a.click();
  };

  const downloadAllAsPdf = async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();

    // Standard FNSKU label size: 2" x 1" at 72 DPI (PDF points)
    const labelWidth = 2 * 72; // 144pt = 2 inches
    const labelHeight = 1 * 72; // 72pt = 1 inch

    for (const [index, item] of generated.entries()) {
      const canvas = canvasRefs.current[index];
      if (!canvas) continue;

      const imgData = canvas.toDataURL('image/png');
      const imgBytes = await fetch(imgData).then((r) => r.arrayBuffer());
      const img = await doc.embedPng(imgBytes);

      const page = doc.addPage([labelWidth, labelHeight]);

      // Draw barcode image to fill the label with some padding
      const padding = 8;
      const drawWidth = labelWidth - padding * 2;
      const drawHeight = labelHeight - padding * 2;

      // Maintain aspect ratio
      const imgAspect = img.width / img.height;
      const labelAspect = drawWidth / drawHeight;
      let finalW, finalH, x, y;

      if (imgAspect > labelAspect) {
        finalW = drawWidth;
        finalH = drawWidth / imgAspect;
        x = padding;
        y = padding + (drawHeight - finalH) / 2;
      } else {
        finalH = drawHeight;
        finalW = drawHeight * imgAspect;
        x = padding + (drawWidth - finalW) / 2;
        y = padding;
      }

      page.drawImage(img, { x, y, width: finalW, height: finalH });
    }

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barcodes.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
          <Barcode className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('barcode.title')}</h1>
          <p className="text-sm text-gray-500">{t('barcode.desc')}</p>
        </div>
      </div>

      {/* Excel upload */}
      <div
        onClick={() => excelInputRef.current?.click()}
        className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
      >
        <FileSpreadsheet className="h-6 w-6 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{t('common.uploadExcel')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('barcode.uploadExcelDesc')}</p>
        </div>
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleExcelUpload}
          className="hidden"
        />
      </div>

      {/* Input table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_40px] gap-0 border-b border-gray-200 bg-gray-50 px-4 py-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">SKU</span>
          <span className="text-[11px] font-semibold text-gray-500 uppercase">FNSKU</span>
          <span></span>
        </div>
        <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 px-4 py-2 items-center">
              <input
                value={item.sku}
                onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                onPaste={index === 0 ? handleBulkPaste : undefined}
                placeholder="SKU..."
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
              />
              <input
                value={item.fnsku}
                onChange={(e) => updateItem(item.id, 'fnsku', e.target.value)}
                placeholder="FNSKU..."
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
              />
              <button
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                className="flex items-center justify-center text-gray-300 hover:text-red-400 disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
            <Plus className="h-3 w-3" /> {t('common.addRow')}
          </button>
          <span className="text-[10px] text-gray-400">{t('common.pasteFromExcel')}</span>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating || items.every((i) => !i.sku && !i.fnsku)}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('common.generating')}
          </span>
        ) : (
          t('barcode.generateBtn')
        )}
      </button>

      {/* Generated barcodes */}
      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{generated.length} {t('barcode.barcodes')}</span>
            <button
              onClick={downloadAllAsPdf}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Download className="h-3 w-3" /> {t('barcode.exportPdf')}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {generated.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">{item.sku || item.fnsku}</span>
                  <button
                    onClick={() => downloadBarcode(index)}
                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700"
                  >
                    <Download className="h-3 w-3" /> PNG
                  </button>
                </div>
                <canvas
                  ref={(el) => {
                    canvasRefs.current[index] = el;
                    if (el) drawCode128(el, item.barcodeText, { displayWidth: 280, displayHeight: 70, fontSize: 11, scale: 4 });
                  }}
                  className="w-full rounded border border-gray-100"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('common.tips')}</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li>• {t('barcode.tip1')}</li>
          <li>• {t('barcode.tip2')}</li>
          <li>• {t('barcode.tip3')}</li>
          <li>• {t('barcode.tip4')}</li>
          <li>• {t('barcode.tip5')}</li>
        </ul>
      </div>
    </div>
  );
}
