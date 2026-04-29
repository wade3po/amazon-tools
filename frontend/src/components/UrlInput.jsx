import { useState } from 'react';
import toast from 'react-hot-toast';

export default function UrlInput({ onScrape, isScraping, disabled }) {
  const [urlText, setUrlText] = useState('');

  const handleScrape = () => {
    const urls = urlText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && u.startsWith('http'));

    if (urls.length === 0) {
      toast.error('请输入至少一个有效的亚马逊商品链接');
      return;
    }

    onScrape(urls);
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split(/[\n,;，；]/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      setUrlText((prev) => {
        const existing = prev.trim();
        return existing ? existing + '\n' + lines.join('\n') : lines.join('\n');
      });
    }
  };

  const urlCount = urlText
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http')).length;

  const isDisabled = isScraping || disabled;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-apple-gray-200">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-sm font-semibold text-apple-gray-900">输入商品链接</h2>
        <span className="text-xs text-apple-gray-500">支持单个或多个链接，每行一个</span>
      </div>

      <textarea
        value={urlText}
        onChange={(e) => setUrlText(e.target.value)}
        onPaste={handlePaste}
        placeholder={`粘贴亚马逊商品链接，每行一个，例如：\nhttps://www.amazon.com/dp/B08N5WRWNW\nhttps://www.amazon.com/dp/B09G9FPHY6`}
        rows={5}
        disabled={isDisabled}
        className="w-full resize-y rounded-xl border border-apple-gray-300 bg-apple-gray-50 px-3.5 py-2.5 font-mono text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-colors focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-apple-gray-500">
          {urlCount > 0 ? `已输入 ${urlCount} 个链接` : ''}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setUrlText('')}
            disabled={isDisabled || !urlText}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-apple-gray-600 transition-colors hover:bg-apple-gray-100 disabled:opacity-40"
          >
            清空
          </button>
          <button
            onClick={handleScrape}
            disabled={isDisabled || urlCount === 0}
            className="rounded-lg bg-apple-blue px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isScraping ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                抓取中...
              </span>
            ) : (
              `开始抓取${urlCount > 0 ? ` (${urlCount})` : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
