import { useState, useMemo } from 'react';
import { Type, Copy, Check, AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useI18n } from '../../i18n';

const BANNED_CHARS = ['!', '¡', '™', '©', '®', '℗', '£', '€', '¥', '¢'];
const MAX_TITLE_LENGTH = 200;

function analyzeTitle(input) {
  if (!input.trim()) return null;

  const title = input.trim();
  const charCount = title.length;
  const byteCount = new TextEncoder().encode(title).length;

  // Keyword duplicate detection
  const words = title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const wordCounts = {};
  words.forEach((w) => {
    if (w.length > 2) wordCounts[w] = (wordCounts[w] || 0) + 1;
  });
  const duplicatedKeywords = Object.entries(wordCounts)
    .filter(([, count]) => count > 1)
    .map(([word, count]) => ({ word, count }));

  // Capitalization analysis
  const titleWords = title.split(/\s+/);
  const capsWords = titleWords.filter((w) => w === w.toUpperCase() && w.length > 1);
  const capsRatio = titleWords.length > 0 ? capsWords.length / titleWords.length : 0;

  // Banned characters detection
  const foundBanned = BANNED_CHARS.filter((c) => title.includes(c));

  // Pipe / dash separator usage
  const hasSeparators = /[|–—-]/.test(title);

  // Starts with brand
  const startsWithCaps = /^[A-Z]/.test(title);

  // SEO Score calculation (0-100)
  let score = 100;
  const issues = [];
  const passes = [];

  // Length check
  if (charCount > MAX_TITLE_LENGTH) {
    score -= 20;
    issues.push(`Title exceeds ${MAX_TITLE_LENGTH} characters (${charCount} chars)`);
  } else if (charCount < 80) {
    score -= 10;
    issues.push('Title is too short — aim for 150-200 characters');
  } else {
    passes.push(`Length is good (${charCount} chars)`);
  }

  // Duplicates
  if (duplicatedKeywords.length > 0) {
    score -= duplicatedKeywords.length * 5;
    issues.push(`${duplicatedKeywords.length} repeated keyword(s): ${duplicatedKeywords.map((d) => `"${d.word}" ×${d.count}`).join(', ')}`);
  } else {
    passes.push('No repeated keywords');
  }

  // All caps
  if (capsRatio > 0.3) {
    score -= 15;
    issues.push(`Too many ALL CAPS words (${Math.round(capsRatio * 100)}%)`);
  } else {
    passes.push('Capitalization is appropriate');
  }

  // Banned chars
  if (foundBanned.length > 0) {
    score -= foundBanned.length * 10;
    issues.push(`Contains banned characters: ${foundBanned.join(' ')}`);
  } else {
    passes.push('No banned characters');
  }

  // Separators
  if (hasSeparators) {
    passes.push('Uses separators for readability');
  } else if (charCount > 100) {
    score -= 5;
    issues.push('Consider using | or - separators for readability');
  }

  // Leading space
  if (input.startsWith(' ') || input.endsWith(' ')) {
    score -= 5;
    issues.push('Title has leading or trailing spaces');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    title,
    charCount,
    byteCount,
    duplicatedKeywords,
    capsRatio,
    capsWords,
    foundBanned,
    score,
    issues,
    passes,
  };
}

export default function TitleOptimizer() {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => analyzeTitle(input), [input]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(input.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor = !analysis ? 'text-gray-300' :
    analysis.score >= 80 ? 'text-green-600' :
    analysis.score >= 60 ? 'text-yellow-600' : 'text-red-600';

  const scoreBg = !analysis ? 'bg-gray-50' :
    analysis.score >= 80 ? 'bg-green-50 border-green-200' :
    analysis.score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-sm">
          <Type className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('titleOptimizer.title')}</h1>
          <p className="text-sm text-gray-500">{t('titleOptimizer.desc')}</p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700">{t('titleOptimizer.inputLabel')}</label>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono ${analysis && analysis.charCount > MAX_TITLE_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
              {analysis ? analysis.charCount : 0} / {MAX_TITLE_LENGTH} chars
            </span>
            <button
              onClick={handleCopy}
              disabled={!input.trim()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('titleOptimizer.inputPlaceholder')}
          rows={4}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {/* Character bar */}
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              !analysis ? 'bg-gray-200 w-0' :
              analysis.charCount > MAX_TITLE_LENGTH ? 'bg-red-500' :
              analysis.charCount > 150 ? 'bg-green-500' :
              'bg-yellow-500'
            }`}
            style={{ width: analysis ? `${Math.min(100, (analysis.charCount / MAX_TITLE_LENGTH) * 100)}%` : '0%' }}
          />
        </div>
      </div>

      {/* Score + Stats */}
      {analysis && (
        <div className="grid gap-4 sm:grid-cols-4">
          {/* Score */}
          <div className={`rounded-xl border p-4 text-center ${scoreBg}`}>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('titleOptimizer.seoScore')}</p>
            <p className={`mt-1 text-3xl font-bold ${scoreColor}`}>{analysis.score}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">/ 100</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-[11px] font-medium text-gray-500">{t('titleOptimizer.characters')}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{analysis.charCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-[11px] font-medium text-gray-500">{t('titleOptimizer.bytes')}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{analysis.byteCount}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-[11px] font-medium text-gray-500">{t('titleOptimizer.words')}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{input.trim().split(/\s+/).filter(Boolean).length}</p>
          </div>
        </div>
      )}

      {/* Issues & Passes */}
      {analysis && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Issues */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              {t('titleOptimizer.issues')} ({analysis.issues.length})
            </h3>
            {analysis.issues.length === 0 ? (
              <p className="text-xs text-gray-400">{t('common.success')}</p>
            ) : (
              <ul className="space-y-2">
                {analysis.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Passes */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('titleOptimizer.passed')} ({analysis.passes.length})
            </h3>
            <ul className="space-y-2">
              {analysis.passes.map((pass, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400 mt-0.5" />
                  <span>{pass}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Duplicate keywords detail */}
      {analysis && analysis.duplicatedKeywords.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-orange-800 mb-2">
            <Info className="h-4 w-4" />
            {t('titleOptimizer.repeatedKeywords')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.duplicatedKeywords.map((d) => (
              <span key={d.word} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                {d.word} <span className="text-orange-500">×{d.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('titleOptimizer.bestPractices')}</h3>
        <ul className="grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
          <li>• {t('titleOptimizer.bp1')}</li>
          <li>• {t('titleOptimizer.bp2')}</li>
          <li>• {t('titleOptimizer.bp3')}</li>
          <li>• {t('titleOptimizer.bp4')}</li>
          <li>• {t('titleOptimizer.bp5')}</li>
          <li>• {t('titleOptimizer.bp6')}</li>
          <li>• {t('titleOptimizer.bp7')}</li>
          <li>• {t('titleOptimizer.bp8')}</li>
        </ul>
      </div>
    </div>
  );
}
