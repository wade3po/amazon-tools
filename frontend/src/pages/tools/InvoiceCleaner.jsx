import { useState, useRef } from 'react';
import { Receipt, Upload, Download, FileUp, Loader2, X, Table } from 'lucide-react';
import { useI18n } from '../../i18n';

export default function InvoiceCleaner() {
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

    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Use fake worker to avoid external file dependency
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();

      const processedResults = [];

      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();

          const doc = await pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            useSystemFonts: true,
          }).promise;

          const pageTexts = [];

          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            // Preserve line structure by grouping items by Y position
            const lines = groupTextByLines(content.items);
            pageTexts.push(lines.join('\n'));
          }

          const fullText = pageTexts.join('\n\n');
          const invoiceData = extractInvoiceData(fullText);

          processedResults.push({
            name: file.name,
            status: 'success',
            data: invoiceData,
            pageCount: doc.numPages,
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

  // Group text items by Y coordinate to reconstruct lines
  const groupTextByLines = (items) => {
    if (items.length === 0) return [];

    // Sort by Y (descending = top to bottom), then X (left to right)
    const sorted = [...items]
      .filter((item) => item.str.trim())
      .sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 3) return yDiff; // Different line
        return a.transform[4] - b.transform[4]; // Same line, sort by X
      });

    const lines = [];
    let currentLine = [];
    let lastY = sorted[0]?.transform[5] ?? 0;

    for (const item of sorted) {
      const y = item.transform[5];
      if (Math.abs(y - lastY) > 3) {
        // New line
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' '));
        }
        currentLine = [item.str];
        lastY = y;
      } else {
        currentLine.push(item.str);
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }

    return lines;
  };

  const extractInvoiceData = (text) => {
    // Amazon order ID: xxx-xxxxxxx-xxxxxxx
    const orderIdMatch = text.match(/(\d{3}-\d{7}-\d{7})/);

    // Date patterns
    const dateMatch = text.match(
      /(?:(?:Order|Invoice)\s*(?:Date|Placed))[:\s]*([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
    ) || text.match(/(?:Date)[:\s]*([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/i);

    // Total - look for "Order Total" or "Grand Total" specifically
    const totalMatch = text.match(
      /(?:Order\s*Total|Grand\s*Total|Total\s*for\s*this\s*Order|Amount\s*Charged)[:\s]*[\$€£]?\s*([\d,]+\.\d{2})/i
    ) || text.match(/(?:Total)[:\s]*[\$€£]\s*([\d,]+\.\d{2})/i);

    // Tax
    const taxMatch = text.match(
      /(?:Estimated\s*Tax|Sales\s*Tax|Tax\s*Collected|VAT)[:\s]*[\$€£]?\s*([\d,]+\.\d{2})/i
    );

    // Shipping
    const shippingMatch = text.match(
      /(?:Shipping\s*(?:&\s*Handling)?|Delivery)[:\s]*[\$€£]?\s*([\d,]+\.\d{2})/i
    );

    // Subtotal
    const subtotalMatch = text.match(
      /(?:Item(?:s)?\s*Subtotal|Subtotal)[:\s]*[\$€£]?\s*([\d,]+\.\d{2})/i
    );

    // Seller/Vendor
    const sellerMatch = text.match(/(?:Sold\s*by|Seller)[:\s]*(.+?)(?:\n|$)/i);

    // Items - ASIN pattern with price
    const items = [];
    const itemRegex = /([A-Z0-9]{10})\s+.*?\$\s*([\d,]+\.\d{2})/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      items.push({ asin: match[1], price: match[2] });
    }

    // Payment method
    const paymentMatch = text.match(/(?:Payment\s*Method|Paid\s*with)[:\s]*(.+?)(?:\n|$)/i);

    return {
      orderId: orderIdMatch ? orderIdMatch[1] : '',
      date: dateMatch ? dateMatch[1] : '',
      total: totalMatch ? totalMatch[1] : '',
      subtotal: subtotalMatch ? subtotalMatch[1] : '',
      tax: taxMatch ? taxMatch[1] : '',
      shipping: shippingMatch ? shippingMatch[1] : '',
      seller: sellerMatch ? sellerMatch[1].trim() : '',
      payment: paymentMatch ? paymentMatch[1].trim() : '',
      items,
    };
  };

  const exportToCSV = () => {
    const successResults = results.filter((r) => r.status === 'success');
    if (successResults.length === 0) return;

    const rows = [['File', 'Order ID', 'Date', 'Subtotal', 'Tax', 'Shipping', 'Total', 'Seller', 'Payment', 'Items']];
    for (const r of successResults) {
      const d = r.data;
      rows.push([
        r.name, d.orderId, d.date, d.subtotal, d.tax, d.shipping, d.total,
        d.seller, d.payment, d.items.map((i) => i.asin).join('; ')
      ]);
    }

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices_extracted.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-sm">
          <Receipt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('invoiceCleaner.title')}</h1>
          <p className="text-sm text-gray-500">{t('invoiceCleaner.desc')}</p>
        </div>
      </div>

      {/* Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:border-amber-300 hover:bg-amber-50/30"
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{t('invoiceCleaner.dropInvoices')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('invoiceCleaner.supportsInvoices')}</p>
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
            <button onClick={() => { setFiles([]); setResults([]); }} className="text-xs text-gray-400 hover:text-gray-600">
              {t('common.clearAll')}
            </button>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileUp className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-xs text-gray-700 truncate">{file.name}</span>
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
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-amber-200 disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('invoiceCleaner.extracting')}
              </span>
            ) : (
              t('invoiceCleaner.extractBtn')
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">{t('invoiceCleaner.extractedData')}</span>
            <button onClick={exportToCSV} className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700">
              <Table className="h-3 w-3" /> {t('invoiceCleaner.exportCsv')}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">{t('invoiceCleaner.file')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">{t('invoiceCleaner.orderId')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">{t('invoiceCleaner.date')}</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">{t('invoiceCleaner.total')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">{t('invoiceCleaner.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2 text-gray-700 max-w-[150px] truncate">{r.name}</td>
                    <td className="px-3 py-2 text-gray-700 font-mono">{r.data?.orderId || '-'}</td>
                    <td className="px-3 py-2 text-gray-700">{r.data?.date || '-'}</td>
                    <td className="px-3 py-2 text-gray-700 text-right">{r.data?.total ? `$${r.data.total}` : '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status === 'success' ? t('invoiceCleaner.extracted') : t('common.error')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('invoiceCleaner.supportedInvoices')}</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li>• {t('invoiceCleaner.inv1')}</li>
          <li>• {t('invoiceCleaner.inv2')}</li>
          <li>• {t('invoiceCleaner.inv3')}</li>
          <li>• {t('invoiceCleaner.inv4')}</li>
        </ul>
      </div>
    </div>
  );
}
