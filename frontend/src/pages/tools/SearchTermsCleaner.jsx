import { useState, useMemo } from 'react';
import { Search, Copy, RotateCcw, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
  'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or',
  'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they',
  'this', 'to', 'was', 'will', 'with',
]);

function cleanSearchTerms(input, options) {
  if (!input.trim()) return { cleaned: '', stats: null };

  let words = input
    .toLowerCase()
    .replace(/[^\w\s]/g, options.removeSpecialChars ? ' ' : '')
    .split(/\s+/)
    .filter(Boolean);

  const originalCount = words.length;

  let removedStopWords = [];
  if (options.removeStopWords) {
    removedStopWords = words.filter((w) => STOP_WORDS.has(w));
    words = words.filter((w) => !STOP_WORDS.has(w));
  }

  let duplicates = [];
  if (options.removeDuplicates) {
    const seen = new Set();
    const unique = [];
    for (const w of words) {
      if (seen.has(w)) {
        duplicates.push(w);
      } else {
        seen.add(w);
        unique.push(w);
      }
    }
    words = unique;
  }

  const cleaned = words.join(' ');
  const byteLength = new TextEncoder().encode(cleaned).length;

  return {
    cleaned,
    stats: {
      originalCount,
      cleanedCount: words.length,
      removedDuplicates: duplicates.length,
      removedStopWords: removedStopWords.length,
      byteLength,
      isOverLimit: byteLength > 250,
    },
  };
}

export default function SearchTermsCleaner() {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    removeDuplicates: true,
    removeStopWords: true,
    removeSpecialChars: true,
  });

  const result = useMemo(() => cleanSearchTerms(input, options), [input, options]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const byteDisplay = result.stats
    ? `${result.stats.byteLength} / 250 bytes`
    : '0 / 250 bytes';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm">
          <Search className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('searchTerms.title')}</h1>
          <p className="text-sm text-gray-500">{t('searchTerms.desc')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { key: 'removeDuplicates', label: t('searchTerms.removeDuplicates') },
          { key: 'removeStopWords', label: t('searchTerms.removeStopWords') },
          { key: 'removeSpecialChars', label: t('searchTerms.removeSpecialChars') },
        ].map(({ key, label }) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              options[key]
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
              className="sr-only"
            />
            <div className={`flex h-4 w-4 items-center justify-center rounded border ${
              options[key] ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
            }`}>
              {options[key] && <Check className="h-3 w-3 text-white" />}
            </div>
            {label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">{t('searchTerms.inputLabel')}</label>
            <button onClick={() => setInput('')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <RotateCcw className="h-3 w-3" />{t('common.clear')}
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('searchTerms.inputPlaceholder')}
            rows={10}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 transition-all focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">{t('searchTerms.outputLabel')}</label>
            <button onClick={handleCopy} disabled={!result.cleaned} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
          <div className={`min-h-[240px] w-full rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            result.stats?.isOverLimit ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-800'
          }`}>
            {result.cleaned || <span className="text-gray-400">{t('searchTerms.outputPlaceholder')}</span>}
          </div>
        </div>
      </div>

      {result.stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label={t('searchTerms.originalWords')} value={result.stats.originalCount} />
          <StatCard label={t('searchTerms.cleanedWords')} value={result.stats.cleanedCount} accent />
          <StatCard label={t('searchTerms.duplicatesRemoved')} value={result.stats.removedDuplicates} />
          <StatCard label={t('searchTerms.stopWordsRemoved')} value={result.stats.removedStopWords} />
          <StatCard label={t('searchTerms.byteUsage')} value={byteDisplay} danger={result.stats.isOverLimit} />
        </div>
      )}

      {result.stats?.isOverLimit && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{t('searchTerms.overLimit')}</p>
            <p className="text-xs text-red-600 mt-0.5">
              {t('searchTerms.overLimitDesc', { n: result.stats.byteLength - 250 })}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-gray-800">{t('common.tips')}</h3>
        </div>
        <ul className="space-y-1.5 text-xs text-gray-600 leading-relaxed">
          <li>• {t('searchTerms.tip1')}</li>
          <li>• {t('searchTerms.tip2')}</li>
          <li>• {t('searchTerms.tip3')}</li>
          <li>• {t('searchTerms.tip4')}</li>
          <li>• {t('searchTerms.tip5')}</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, danger }) {
  return (
    <div className={`rounded-xl border p-3 ${danger ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${danger ? 'text-red-600' : accent ? 'text-blue-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
