import { useState, useMemo } from 'react';
import { GitCompare, Copy, Check, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n';

function parseLine(line) {
  // Try to parse structured data: SKU | Color | Size | Price | Stock
  const parts = line.split(/[\t|,]/).map((s) => s.trim());
  if (parts.length >= 2) {
    return { raw: line, sku: parts[0], fields: parts.slice(1), key: parts[0] };
  }
  return { raw: line, sku: line.trim(), fields: [], key: line.trim() };
}

function diffVariations(oldText, newText) {
  const oldLines = oldText.split('\n').map((l) => l.trim()).filter(Boolean);
  const newLines = newText.split('\n').map((l) => l.trim()).filter(Boolean);

  const oldParsed = oldLines.map(parseLine);
  const newParsed = newLines.map(parseLine);

  const oldMap = new Map(oldParsed.map((p) => [p.key, p]));
  const newMap = new Map(newParsed.map((p) => [p.key, p]));

  const results = [];

  // Find removed and modified
  for (const old of oldParsed) {
    const match = newMap.get(old.key);
    if (!match) {
      results.push({ type: 'removed', data: old, line: old.raw });
    } else if (match.raw !== old.raw) {
      results.push({ type: 'modified', data: old, newData: match, oldLine: old.raw, newLine: match.raw });
    } else {
      results.push({ type: 'unchanged', data: old, line: old.raw });
    }
  }

  // Find added (in new but not in old)
  for (const item of newParsed) {
    if (!oldMap.has(item.key)) {
      results.push({ type: 'added', data: item, line: item.raw });
    }
  }

  // Stats
  const stats = {
    total: results.length,
    added: results.filter((r) => r.type === 'added').length,
    removed: results.filter((r) => r.type === 'removed').length,
    modified: results.filter((r) => r.type === 'modified').length,
    unchanged: results.filter((r) => r.type === 'unchanged').length,
  };

  return { results, stats };
}

export default function VariationDiff() {
  const { t } = useI18n();
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [copied, setCopied] = useState(false);

  const diff = useMemo(() => {
    if (!oldText.trim() && !newText.trim()) return null;
    return diffVariations(oldText, newText);
  }, [oldText, newText]);

  const handleCopyReport = async () => {
    if (!diff) return;
    const report = diff.results
      .filter((r) => r.type !== 'unchanged')
      .map((r) => {
        if (r.type === 'added') return `[+] ${r.line}`;
        if (r.type === 'removed') return `[-] ${r.line}`;
        if (r.type === 'modified') return `[~] ${r.oldLine} → ${r.newLine}`;
        return '';
      })
      .join('\n');
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-sm">
          <GitCompare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('variationDiff.title')}</h1>
          <p className="text-sm text-gray-500">{t('variationDiff.desc')}</p>
        </div>
      </div>

      {/* Input panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">{t('variationDiff.oldList')}</label>
            <button onClick={() => setOldText('')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <RotateCcw className="h-3 w-3" /> {t('common.clear')}
            </button>
          </div>
          <textarea
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            placeholder={t('variationDiff.oldPlaceholder')}
            rows={10}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-xs text-gray-800 placeholder:text-gray-400 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">{t('variationDiff.newList')}</label>
            <button onClick={() => setNewText('')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <RotateCcw className="h-3 w-3" /> {t('common.clear')}
            </button>
          </div>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t('variationDiff.newPlaceholder')}
            rows={10}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-xs text-gray-800 placeholder:text-gray-400 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
          />
        </div>
      </div>

      {/* Stats */}
      {diff && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
            <Stat label={t('variationDiff.added')} value={diff.stats.added} color="text-green-600" bg="bg-green-100" />
            <Stat label={t('variationDiff.removed')} value={diff.stats.removed} color="text-red-600" bg="bg-red-100" />
            <Stat label={t('variationDiff.modified')} value={diff.stats.modified} color="text-amber-600" bg="bg-amber-100" />
            <Stat label={t('variationDiff.unchanged')} value={diff.stats.unchanged} color="text-gray-600" bg="bg-gray-100" />
          </div>
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? t('common.copied') : t('variationDiff.copyChanges')}
          </button>
        </div>
      )}

      {/* Diff view */}
      {diff && diff.results.some((r) => r.type !== 'unchanged') && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
            {t('variationDiff.changes')}
          </div>
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {diff.results
              .filter((r) => r.type !== 'unchanged')
              .map((r, i) => (
                <div key={i} className={`px-4 py-2.5 font-mono text-xs ${
                  r.type === 'added' ? 'bg-green-50' :
                  r.type === 'removed' ? 'bg-red-50' :
                  'bg-amber-50'
                }`}>
                  {r.type === 'added' && (
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-green-200 px-1.5 py-0.5 text-[10px] font-bold text-green-800">+</span>
                      <span className="text-green-800">{r.line}</span>
                    </div>
                  )}
                  {r.type === 'removed' && (
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-red-200 px-1.5 py-0.5 text-[10px] font-bold text-red-800">−</span>
                      <span className="text-red-800 line-through">{r.line}</span>
                    </div>
                  )}
                  {r.type === 'modified' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 rounded bg-red-200 px-1.5 py-0.5 text-[10px] font-bold text-red-800">−</span>
                        <span className="text-red-700 line-through">{r.oldLine}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 rounded bg-green-200 px-1.5 py-0.5 text-[10px] font-bold text-green-800">+</span>
                        <span className="text-green-700">{r.newLine}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('variationDiff.howToUse')}</h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li>• {t('variationDiff.tip1')}</li>
          <li>• {t('variationDiff.tip2')}</li>
          <li>• {t('variationDiff.tip3')}</li>
          <li>• {t('variationDiff.tip4')}</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, color, bg }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${bg} text-[10px] font-bold ${color}`}>
        {value}
      </span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}
