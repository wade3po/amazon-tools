import { useState, useMemo } from 'react';
import { FileText, Copy, Check, Download, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n';

// Invisible/control characters to detect and remove
const INVISIBLE_CHARS = {
  '\u200B': 'Zero-width space',
  '\u200C': 'Zero-width non-joiner',
  '\u200D': 'Zero-width joiner',
  '\uFEFF': 'BOM',
  '\u00A0': 'Non-breaking space',
  '\u2028': 'Line separator',
  '\u2029': 'Paragraph separator',
  '\u200E': 'LTR mark',
  '\u200F': 'RTL mark',
  '\u00AD': 'Soft hyphen',
  '\r': 'Carriage return (\\r)',
  '\t': 'Tab character',
};

// Chinese/fullwidth to English/ASCII mapping
const CHAR_MAP = new Map([
  ['\uff0c', ','], ['\u3002', '.'], ['\uff01', '!'], ['\uff1f', '?'], ['\uff1b', ';'], ['\uff1a', ':'],
  ['\u201c', '"'], ['\u201d', '"'], ['\u2018', "'"], ['\u2019', "'"], ['\uff08', '('], ['\uff09', ')'],
  ['\u3010', '['], ['\u3011', ']'], ['\uff5b', '{'], ['\uff5d', '}'], ['\u300a', '<'], ['\u300b', '>'],
  ['\u3001', ','], ['\uff5e', '~'], ['\uff06', '&'], ['\uff20', '@'], ['\uff03', '#'], ['\uff04', '$'],
  ['\uff05', '%'], ['\uff3e', '^'], ['\uff0a', '*'], ['\uff0b', '+'], ['\uff1d', '='],
  ['\u3000', ' '], // fullwidth space
]);

function cleanFlatFile(input, options) {
  if (!input.trim()) return null;

  let text = input;
  const issues = [];
  const fixes = [];

  // Detect and remove hidden characters
  if (options.removeHidden) {
    for (const [char, name] of Object.entries(INVISIBLE_CHARS)) {
      const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = text.match(regex);
      if (matches) {
        issues.push({ type: 'hidden', message: `Found ${matches.length}× ${name}` });
        text = text.replace(regex, char === '\t' ? ' ' : char === '\r' ? '' : ' ');
        fixes.push(`Removed ${matches.length}× ${name}`);
      }
    }
  }

  // Normalize Chinese/fullwidth characters to ASCII
  if (options.normalizeChars) {
    let normalizeCount = 0;
    for (const [from, to] of CHAR_MAP) {
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = text.match(regex);
      if (matches) {
        normalizeCount += matches.length;
        text = text.replace(regex, to);
      }
    }
    if (normalizeCount > 0) {
      issues.push({ type: 'normalize', message: `Found ${normalizeCount} fullwidth/Chinese punctuation` });
      fixes.push(`Normalized ${normalizeCount} characters to ASCII`);
    }
  }

  // Remove extra whitespace
  if (options.removeExtraSpaces) {
    const before = text;
    text = text.replace(/[ ]+/g, ' ');
    // Remove leading/trailing spaces per line
    text = text.split('\n').map((line) => line.trim()).join('\n');
    // Remove excessive blank lines
    text = text.replace(/\n{3,}/g, '\n\n');
    if (before !== text) {
      fixes.push('Cleaned extra whitespace and blank lines');
    }
  }

  // Detect potential CSV issues
  const lines = text.split('\n');
  const csvIssues = [];
  lines.forEach((line, i) => {
    // Unescaped quotes in CSV
    if (line.includes('"') && !line.match(/^"[^"]*"$/)) {
      const unescaped = line.match(/[^,"]"[^,"]/g);
      if (unescaped) {
        csvIssues.push(`Line ${i + 1}: Possible unescaped quote`);
      }
    }
  });
  if (csvIssues.length > 0 && csvIssues.length <= 5) {
    issues.push({ type: 'csv', message: `${csvIssues.length} potential CSV formatting issues` });
  }

  return {
    cleaned: text,
    issues,
    fixes,
    stats: {
      originalLength: input.length,
      cleanedLength: text.length,
      removedChars: input.length - text.length,
      lineCount: lines.length,
    },
  };
}

export default function FlatFileCleaner() {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    removeHidden: true,
    normalizeChars: true,
    removeExtraSpaces: true,
  });

  const result = useMemo(() => cleanFlatFile(input, options), [input, options]);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.cleaned], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_flat_file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('flatFile.title')}</h1>
          <p className="text-sm text-gray-500">{t('flatFile.desc')}</p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'removeHidden', label: t('flatFile.removeHidden') },
          { key: 'normalizeChars', label: t('flatFile.normalizePunctuation') },
          { key: 'removeExtraSpaces', label: t('flatFile.cleanWhitespace') },
        ].map(({ key, label }) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              options[key]
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
              options[key] ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
            }`}>
              {options[key] && <Check className="h-3 w-3 text-white" />}
            </div>
            {label}
          </label>
        ))}
      </div>

      {/* Input / Output */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">{t('flatFile.inputLabel')}</label>
            <button
              onClick={() => setInput('')}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <RotateCcw className="h-3 w-3" />
              {t('common.clear')}
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('flatFile.inputPlaceholder')}
            rows={12}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-xs text-gray-800 placeholder:text-gray-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">{t('flatFile.outputLabel')}</label>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!result}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t('common.copied') : t('common.copy')}
              </button>
              <button
                onClick={handleDownload}
                disabled={!result}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300"
              >
                <Download className="h-3 w-3" />
                {t('common.download')}
              </button>
            </div>
          </div>
          <textarea
            value={result?.cleaned || ''}
            readOnly
            rows={12}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-800 focus:outline-none"
            placeholder={t('flatFile.outputLabel')}
          />
        </div>
      </div>

      {/* Report */}
      {result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t('flatFile.issuesDetected')} ({result.issues.length})
            </h3>
            {result.issues.length === 0 ? (
              <p className="text-xs text-gray-400">{t('flatFile.noIssues')}</p>
            ) : (
              <ul className="space-y-2">
                {result.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      issue.type === 'hidden' ? 'bg-red-400' :
                      issue.type === 'normalize' ? 'bg-orange-400' : 'bg-yellow-400'
                    }`} />
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('flatFile.fixesApplied')} ({result.fixes.length})
            </h3>
            {result.fixes.length === 0 ? (
              <p className="text-xs text-gray-400">{t('flatFile.noFixes')}</p>
            ) : (
              <ul className="space-y-2">
                {result.fixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400 mt-0.5" />
                    {fix}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {result && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-500">{t('flatFile.original')}</p>
            <p className="text-lg font-bold text-gray-900">{result.stats.originalLength}</p>
            <p className="text-[10px] text-gray-400">{t('flatFile.chars')}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-500">{t('flatFile.cleaned')}</p>
            <p className="text-lg font-bold text-emerald-600">{result.stats.cleanedLength}</p>
            <p className="text-[10px] text-gray-400">{t('flatFile.chars')}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-500">{t('flatFile.removed')}</p>
            <p className="text-lg font-bold text-red-500">{result.stats.removedChars}</p>
            <p className="text-[10px] text-gray-400">{t('flatFile.chars')}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-[11px] text-gray-500">{t('flatFile.lines')}</p>
            <p className="text-lg font-bold text-gray-900">{result.stats.lineCount}</p>
            <p className="text-[10px] text-gray-400">total</p>
          </div>
        </div>
      )}
    </div>
  );
}
