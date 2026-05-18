import { useState, useMemo } from 'react';
import { AlignLeft, Copy, Check, RotateCcw, CheckCircle2, XCircle, Sparkles, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../i18n';

// Emoji regex (simplified, covers most common ranges)
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu;

// HTML tags regex
const HTML_REGEX = /<\/?[^>]+(>|$)/g;

// Amazon prohibited/risky words and phrases
const PROHIBITED_WORDS = [
  { word: 'best', reason: 'Subjective superlative - Amazon prohibits unsubstantiated claims' },
  { word: 'cheapest', reason: 'Subjective superlative' },
  { word: '#1', reason: 'Unverified ranking claim' },
  { word: 'number one', reason: 'Unverified ranking claim' },
  { word: 'top rated', reason: 'Unverified ranking claim' },
  { word: 'anti-bacterial', reason: 'Pesticide claim - risk of listing removal without EPA registration' },
  { word: 'antibacterial', reason: 'Pesticide claim - risk of listing removal without EPA registration' },
  { word: 'anti-microbial', reason: 'Pesticide claim - risk of listing removal' },
  { word: 'antimicrobial', reason: 'Pesticide claim - risk of listing removal' },
  { word: 'kills germs', reason: 'Pesticide claim - risk of listing removal' },
  { word: 'disinfect', reason: 'Pesticide claim - risk of listing removal' },
  { word: '100% organic', reason: 'Requires USDA certification - risk of false advertising' },
  { word: 'certified organic', reason: 'Requires USDA certification' },
  { word: 'warranty', reason: 'Prohibited in listing copy - must use A-to-Z Guarantee instead' },
  { word: 'guarantee', reason: 'Prohibited in listing copy unless referencing A-to-Z' },
  { word: 'money back', reason: 'Promotional language prohibited in bullets' },
  { word: 'free shipping', reason: 'Promotional language prohibited' },
  { word: 'limited time', reason: 'Promotional/urgency language prohibited' },
  { word: 'act now', reason: 'Promotional/urgency language prohibited' },
  { word: 'buy now', reason: 'Call to action prohibited' },
  { word: 'fda approved', reason: 'Requires actual FDA approval documentation' },
  { word: 'fda', reason: 'Risk - ensure you have proper documentation' },
  { word: 'cure', reason: 'Medical claim - high risk of listing removal' },
  { word: 'treat', reason: 'Medical claim - review carefully' },
  { word: 'prevent', reason: 'Medical claim when used for health context' },
];

function detectProhibitedWords(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const item of PROHIBITED_WORDS) {
    const regex = new RegExp(`\\b${item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      found.push({ ...item, count: matches.length });
    }
  }
  return found;
}

function formatBullets(input, options) {
  if (!input.trim()) return null;

  const lines = input.split('\n').filter((l) => l.trim());
  const issues = [];
  const formattedBullets = [];

  lines.forEach((line, index) => {
    let bullet = line.trim();
    const bulletIssues = [];

    // Remove HTML tags
    if (options.cleanHtml) {
      const htmlMatches = bullet.match(HTML_REGEX);
      if (htmlMatches) {
        bulletIssues.push(`Removed ${htmlMatches.length} HTML tag(s)`);
        bullet = bullet.replace(HTML_REGEX, '');
      }
    }

    // Remove emojis
    if (options.cleanEmoji) {
      const emojiMatches = bullet.match(EMOJI_REGEX);
      if (emojiMatches) {
        bulletIssues.push(`Removed ${emojiMatches.length} emoji(s)`);
        bullet = bullet.replace(EMOJI_REGEX, '');
      }
    }

    // Normalize text
    if (options.normalize) {
      bullet = bullet.replace(/\s+/g, ' ').trim();
      bullet = bullet.replace(/^[•\-*●◆►✓✔☑✅⭐🔹🔸▪️▸]\s*/u, '');
      if (bullet.length > 0 && options.capitalize) {
        bullet = bullet.charAt(0).toUpperCase() + bullet.slice(1);
      }
    }

    // Remove double punctuation
    bullet = bullet.replace(/([.!?]){2,}/g, '$1');
    if (options.removeTrailingPeriod) {
      bullet = bullet.replace(/\.\s*$/, '');
    }

    if (bulletIssues.length > 0) {
      issues.push({ line: index + 1, issues: bulletIssues });
    }

    if (bullet.trim()) {
      formattedBullets.push(bullet.trim());
    }
  });

  // Detect prohibited words in formatted output
  const allText = formattedBullets.join(' ');
  const prohibitedFound = detectProhibitedWords(allText);

  // Quality scoring
  let score = 100;
  const scoreDetails = [];

  if (formattedBullets.length < 5) {
    score -= 10;
    scoreDetails.push({ pass: false, text: `Only ${formattedBullets.length} bullets (recommended: 5)` });
  } else {
    scoreDetails.push({ pass: true, text: `${formattedBullets.length} bullets` });
  }

  const shortBullets = formattedBullets.filter((b) => b.length < 50);
  const longBullets = formattedBullets.filter((b) => b.length > 500);
  if (shortBullets.length > 0) {
    score -= shortBullets.length * 5;
    scoreDetails.push({ pass: false, text: `${shortBullets.length} bullet(s) too short (<50 chars)` });
  }
  if (longBullets.length > 0) {
    score -= longBullets.length * 5;
    scoreDetails.push({ pass: false, text: `${longBullets.length} bullet(s) too long (>500 chars)` });
  }
  if (shortBullets.length === 0 && longBullets.length === 0) {
    scoreDetails.push({ pass: true, text: 'All bullets are good length' });
  }

  const capsBullets = formattedBullets.filter((b) => b === b.toUpperCase() && b.length > 10);
  if (capsBullets.length > 0) {
    score -= capsBullets.length * 10;
    scoreDetails.push({ pass: false, text: `${capsBullets.length} bullet(s) in ALL CAPS` });
  } else {
    scoreDetails.push({ pass: true, text: 'No ALL CAPS bullets' });
  }

  const noCapStart = formattedBullets.filter((b) => b.length > 0 && b[0] !== b[0].toUpperCase());
  if (noCapStart.length > 0) {
    score -= noCapStart.length * 3;
    scoreDetails.push({ pass: false, text: `${noCapStart.length} bullet(s) don't start with capital` });
  } else {
    scoreDetails.push({ pass: true, text: 'All bullets start with capital letter' });
  }

  // Prohibited words penalty
  if (prohibitedFound.length > 0) {
    score -= prohibitedFound.length * 8;
    scoreDetails.push({ pass: false, text: `${prohibitedFound.length} prohibited/risky word(s) detected` });
  } else {
    scoreDetails.push({ pass: true, text: 'No prohibited words detected' });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    formatted: formattedBullets.join('\n'),
    bullets: formattedBullets,
    issues,
    prohibitedFound,
    score,
    scoreDetails,
    stats: {
      inputLines: lines.length,
      outputLines: formattedBullets.length,
      totalIssues: issues.reduce((sum, i) => sum + i.issues.length, 0),
      avgLength: formattedBullets.length > 0
        ? Math.round(formattedBullets.reduce((sum, b) => sum + b.length, 0) / formattedBullets.length)
        : 0,
    },
  };
}

// Highlight prohibited words in text
function HighlightedBullet({ text, prohibitedWords }) {
  if (!prohibitedWords || prohibitedWords.length === 0) {
    return <span className="leading-relaxed">{text}</span>;
  }

  // Build regex from all prohibited words found
  const pattern = prohibitedWords
    .map((p) => p.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`(\\b(?:${pattern})\\b)`, 'gi');

  const parts = text.split(regex);

  return (
    <span className="leading-relaxed">
      {parts.map((part, i) => {
        const isProhibited = regex.test(part);
        // Reset regex lastIndex
        regex.lastIndex = 0;
        const match = prohibitedWords.find(
          (p) => p.word.toLowerCase() === part.toLowerCase()
        );
        if (match) {
          return (
            <span
              key={i}
              className="bg-red-100 text-red-700 font-semibold px-0.5 rounded border-b-2 border-red-400"
              title={match.reason}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function ListingFormatter() {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    cleanHtml: true,
    cleanEmoji: true,
    normalize: true,
    capitalize: true,
    removeTrailingPeriod: true,
  });

  const result = useMemo(() => formatBullets(input, options), [input, options]);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor = !result ? 'text-gray-300' :
    result.score >= 80 ? 'text-green-600' :
    result.score >= 60 ? 'text-orange-600' : 'text-red-600';

  const scoreBg = !result ? 'border-gray-200 bg-gray-50' :
    result.score >= 80 ? 'border-green-200 bg-green-50' :
    result.score >= 60 ? 'border-orange-200 bg-orange-50' : 'border-red-200 bg-red-50';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm">
          <AlignLeft className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('listingFormatter.title')}</h1>
          <p className="text-sm text-gray-500">{t('listingFormatter.desc')}</p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'cleanHtml', label: t('listingFormatter.cleanHtml') },
          { key: 'cleanEmoji', label: t('listingFormatter.removeEmoji') },
          { key: 'normalize', label: t('listingFormatter.normalizeText') },
          { key: 'capitalize', label: t('listingFormatter.autoCapitalize') },
          { key: 'removeTrailingPeriod', label: t('listingFormatter.removeTrailingPeriod') },
        ].map(({ key, label }) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              options[key]
                ? 'border-orange-200 bg-orange-50 text-orange-700'
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
              options[key] ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
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
            <label className="text-xs font-semibold text-gray-700">{t('listingFormatter.inputLabel')}</label>
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
            placeholder={t('listingFormatter.inputPlaceholder')}
            rows={12}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">{t('listingFormatter.outputLabel')}</label>
            <button
              onClick={handleCopy}
              disabled={!result}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t('common.copied') : t('listingFormatter.copyAll')}
            </button>
          </div>
          <div className="min-h-[288px] w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm overflow-y-auto">
            {result ? (
              <ul className="space-y-2">
                {result.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-800">
                    <span className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-600">
                      {i + 1}
                    </span>
                    <HighlightedBullet text={bullet} prohibitedWords={result.prohibitedFound} />
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-gray-400">{t('listingFormatter.outputPlaceholder')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Prohibited Words Alert */}
      {result && result.prohibitedFound.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-3">
            <ShieldAlert className="h-4 w-4" />
            {t('listingFormatter.prohibitedWords')} ({result.prohibitedFound.length})
          </h4>
          <div className="space-y-2">
            {result.prohibitedFound.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  {item.word}
                </span>
                <span className="text-xs text-red-600">{item.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score + Stats */}
      {result && (
        <div className="grid gap-4 sm:grid-cols-5">
          <div className={`rounded-xl border p-4 text-center ${scoreBg}`}>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('listingFormatter.quality')}</p>
            <p className={`mt-1 text-3xl font-bold ${scoreColor}`}>{result.score}</p>
            <p className="text-[10px] text-gray-400">/ 100</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-[11px] text-gray-500">{t('listingFormatter.bullets')}</p>
            <p className="text-2xl font-bold text-gray-900">{result.stats.outputLines}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-[11px] text-gray-500">{t('listingFormatter.avgLength')}</p>
            <p className="text-2xl font-bold text-gray-900">{result.stats.avgLength}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-[11px] text-gray-500">{t('listingFormatter.issuesFixed')}</p>
            <p className="text-2xl font-bold text-orange-600">{result.stats.totalIssues}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-[11px] text-gray-500">{t('listingFormatter.linesInput')}</p>
            <p className="text-2xl font-bold text-gray-900">{result.stats.inputLines}</p>
          </div>
        </div>
      )}

      {/* Score Details */}
      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            {t('listingFormatter.qualityChecklist')}
          </h3>
          <ul className="space-y-2">
            {result.scoreDetails.map((detail, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                {detail.pass ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                )}
                {detail.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
