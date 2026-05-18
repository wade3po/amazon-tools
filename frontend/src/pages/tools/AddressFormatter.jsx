import { useState, useMemo, useRef } from 'react';
import { MapPin, Copy, Check, RotateCcw, ArrowRight, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { useI18n } from '../../i18n';

// Parse common address formats from different platforms
function parseAddress(raw) {
  const lines = raw.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const result = { name: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US', phone: '' };

  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/;
  const zipRegex = /\b(\d{5}(?:-\d{4})?)\b/;
  const stateRegex = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i;

  const kvPairs = {};
  for (const line of lines) {
    const match = line.match(/^(.+?)[:：]\s*(.+)$/);
    if (match) kvPairs[match[1].toLowerCase().trim()] = match[2].trim();
  }

  if (Object.keys(kvPairs).length >= 3) {
    result.name = kvPairs['name'] || kvPairs['recipient'] || kvPairs['收件人'] || kvPairs['姓名'] || '';
    result.address1 = kvPairs['address1'] || kvPairs['address'] || kvPairs['street'] || kvPairs['地址'] || kvPairs['地址1'] || '';
    result.address2 = kvPairs['address2'] || kvPairs['apt'] || kvPairs['suite'] || kvPairs['地址2'] || '';
    result.city = kvPairs['city'] || kvPairs['城市'] || '';
    result.state = kvPairs['state'] || kvPairs['province'] || kvPairs['州'] || kvPairs['省'] || '';
    result.zip = kvPairs['zip'] || kvPairs['zipcode'] || kvPairs['postal'] || kvPairs['postal code'] || kvPairs['邮编'] || '';
    result.country = kvPairs['country'] || kvPairs['国家'] || 'US';
    result.phone = kvPairs['phone'] || kvPairs['tel'] || kvPairs['电话'] || '';
  } else {
    if (lines.length >= 1) result.name = lines[0];
    if (lines.length >= 2) result.address1 = lines[1];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const phoneMatch = line.match(phoneRegex);
      if (phoneMatch) { result.phone = phoneMatch[0]; continue; }
      const zipMatch = line.match(zipRegex);
      const stateMatch = line.match(stateRegex);
      if (zipMatch && stateMatch) {
        result.zip = zipMatch[1];
        result.state = stateMatch[1].toUpperCase();
        const cityPart = line.replace(zipMatch[0], '').replace(stateMatch[0], '').replace(/[,\s]+$/, '').trim();
        if (cityPart) result.city = cityPart;
      } else if (!result.address2 && !result.city) {
        result.address2 = line;
      }
    }
  }
  return result;
}

function formatAsMCF(address) {
  if (!address) return '';
  return [
    `Name: ${address.name}`,
    `AddressLine1: ${address.address1}`,
    address.address2 ? `AddressLine2: ${address.address2}` : null,
    `City: ${address.city}`,
    `StateOrRegion: ${address.state}`,
    `PostalCode: ${address.zip}`,
    `CountryCode: ${address.country}`,
    address.phone ? `PhoneNumber: ${address.phone}` : null,
  ].filter(Boolean).join('\n');
}

// Parse a CSV/Excel row into MCF format
function parseRow(row, columnMap) {
  return {
    name: (row[columnMap.name] || '').trim(),
    address1: (row[columnMap.address1] || '').trim(),
    address2: (row[columnMap.address2] || '').trim(),
    city: (row[columnMap.city] || '').trim(),
    state: (row[columnMap.state] || '').trim(),
    zip: String(row[columnMap.zip] || '').trim(),
    country: (row[columnMap.country] || 'US').trim(),
    phone: String(row[columnMap.phone] || '').trim(),
  };
}

export default function AddressFormatter() {
  const { t } = useI18n();
  const [mode, setMode] = useState('single'); // 'single' or 'batch'
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Batch mode state
  const [batchData, setBatchData] = useState(null); // { headers, rows }
  const [columnMap, setColumnMap] = useState({ name: '', address1: '', address2: '', city: '', state: '', zip: '', country: '', phone: '' });
  const [batchResults, setBatchResults] = useState([]);
  const fileInputRef = useRef(null);

  const parsed = useMemo(() => mode === 'single' ? parseAddress(input) : null, [input, mode]);
  const mcfOutput = useMemo(() => formatAsMCF(parsed), [parsed]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mcfOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Batch Excel upload
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        setBatchData({ headers, rows });
        setBatchResults([]);
        // Auto-detect columns
        const map = { ...columnMap };
        for (const h of headers) {
          const lower = h.toLowerCase();
          if (lower.includes('name') || lower.includes('姓名') || lower.includes('收件')) map.name = h;
          else if (lower === 'address1' || lower === 'street' || lower.includes('地址1') || (lower.includes('address') && !lower.includes('2'))) map.address1 = h;
          else if (lower === 'address2' || lower.includes('apt') || lower.includes('地址2')) map.address2 = h;
          else if (lower.includes('city') || lower.includes('城市')) map.city = h;
          else if (lower.includes('state') || lower.includes('province') || lower.includes('州')) map.state = h;
          else if (lower.includes('zip') || lower.includes('postal') || lower.includes('邮编')) map.zip = h;
          else if (lower.includes('country') || lower.includes('国家')) map.country = h;
          else if (lower.includes('phone') || lower.includes('tel') || lower.includes('电话')) map.phone = h;
        }
        setColumnMap(map);
      }
    } catch (err) {
      console.error('Failed to parse file:', err);
    }
    e.target.value = '';
  };

  const handleBatchConvert = () => {
    if (!batchData) return;
    const results = batchData.rows.map((row) => parseRow(row, columnMap));
    setBatchResults(results);
  };

  const handleBatchDownload = async () => {
    if (batchResults.length === 0) return;
    const XLSX = await import('xlsx');
    const data = batchResults.map((addr, i) => ({
      'Row': i + 1,
      'Name': addr.name,
      'AddressLine1': addr.address1,
      'AddressLine2': addr.address2,
      'City': addr.city,
      'StateOrRegion': addr.state,
      'PostalCode': addr.zip,
      'CountryCode': addr.country,
      'PhoneNumber': addr.phone,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MCF Addresses');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcf_addresses.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lime-500 to-green-500 shadow-sm">
          <MapPin className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('addressFormatter.title')}</h1>
          <p className="text-sm text-gray-500">{t('addressFormatter.desc')}</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('single')}
          className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            mode === 'single' ? 'bg-lime-100 text-lime-700 border border-lime-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          {t('addressFormatter.singleMode')}
        </button>
        <button
          onClick={() => setMode('batch')}
          className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            mode === 'batch' ? 'bg-lime-100 text-lime-700 border border-lime-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          {t('addressFormatter.batchMode')}
        </button>
      </div>

      {mode === 'single' ? (
        <>
          {/* Single mode */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">{t('addressFormatter.inputLabel')}</label>
                <button onClick={() => setInput('')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <RotateCcw className="h-3 w-3" /> {t('common.clear')}
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('addressFormatter.inputPlaceholder')}
                rows={10}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-100"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">{t('addressFormatter.outputLabel')}</label>
                <button
                  onClick={handleCopy}
                  disabled={!mcfOutput}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
              </div>
              <textarea
                value={mcfOutput}
                readOnly
                rows={10}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-800 focus:outline-none"
                placeholder={t('addressFormatter.outputPlaceholder')}
              />
            </div>
          </div>

          {parsed && parsed.name && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-lime-500" />
                {t('addressFormatter.parsedFields')}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: 'Name', value: parsed.name },
                  { label: 'Address 1', value: parsed.address1 },
                  { label: 'Address 2', value: parsed.address2 },
                  { label: 'City', value: parsed.city },
                  { label: 'State', value: parsed.state },
                  { label: 'Zip', value: parsed.zip },
                  { label: 'Country', value: parsed.country },
                  { label: 'Phone', value: parsed.phone },
                ].filter((f) => f.value).map((field) => (
                  <div key={field.label} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-[10px] font-medium text-gray-400 uppercase w-16 shrink-0">{field.label}</span>
                    <span className="text-xs text-gray-800">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Batch mode */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-lime-300 hover:bg-lime-50/30"
          >
            <FileSpreadsheet className="h-6 w-6 text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">{t('addressFormatter.uploadExcel')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('addressFormatter.uploadHint')}</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} className="hidden" />
          </div>

          {batchData && (
            <div className="space-y-4">
              {/* Column mapping */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-3">{t('addressFormatter.mapColumns')}</h4>
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'address1', label: 'Address 1' },
                    { key: 'address2', label: 'Address 2' },
                    { key: 'city', label: 'City' },
                    { key: 'state', label: 'State' },
                    { key: 'zip', label: 'Zip' },
                    { key: 'country', label: 'Country' },
                    { key: 'phone', label: 'Phone' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-500 mb-0.5 block">{label}</label>
                      <select
                        value={columnMap[key]}
                        onChange={(e) => setColumnMap({ ...columnMap, [key]: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-lime-300 focus:outline-none"
                      >
                        <option value="">--</option>
                        {batchData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">{batchData.rows.length} {t('addressFormatter.rowsDetected')}</span>
                  <button
                    onClick={handleBatchConvert}
                    className="rounded-lg bg-lime-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-lime-700"
                  >
                    {t('addressFormatter.convertAll')}
                  </button>
                </div>
              </div>

              {/* Batch results */}
              {batchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{batchResults.length} {t('addressFormatter.addressesConverted')}</span>
                    <button onClick={handleBatchDownload} className="flex items-center gap-1 text-xs font-medium text-lime-600 hover:text-lime-700">
                      <Download className="h-3 w-3" /> {t('addressFormatter.downloadExcel')}
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-[11px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-gray-500">#</th>
                          <th className="px-2 py-1.5 text-left text-gray-500">Name</th>
                          <th className="px-2 py-1.5 text-left text-gray-500">Address</th>
                          <th className="px-2 py-1.5 text-left text-gray-500">City</th>
                          <th className="px-2 py-1.5 text-left text-gray-500">State</th>
                          <th className="px-2 py-1.5 text-left text-gray-500">Zip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchResults.slice(0, 20).map((addr, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1.5 text-gray-700">{addr.name}</td>
                            <td className="px-2 py-1.5 text-gray-700 max-w-[200px] truncate">{addr.address1}</td>
                            <td className="px-2 py-1.5 text-gray-700">{addr.city}</td>
                            <td className="px-2 py-1.5 text-gray-700">{addr.state}</td>
                            <td className="px-2 py-1.5 text-gray-700">{addr.zip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {batchResults.length > 20 && (
                      <div className="px-3 py-2 text-[10px] text-gray-400 bg-gray-50 border-t">
                        {t('addressFormatter.showingFirst')} 20 / {batchResults.length}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('addressFormatter.supportedFormats')}</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li>• {t('addressFormatter.fmt1')}</li>
          <li>• {t('addressFormatter.fmt2')}</li>
          <li>• {t('addressFormatter.fmt3')}</li>
          <li>• {t('addressFormatter.fmt4')}</li>
          <li>• {t('addressFormatter.fmt5')}</li>
        </ul>
      </div>
    </div>
  );
}
