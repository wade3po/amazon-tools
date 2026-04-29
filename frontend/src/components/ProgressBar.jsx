const statusConfig = {
  scraping: { label: '抓取中', bg: 'bg-apple-blue-light', text: 'text-apple-blue' },
  done: { label: '完成', bg: 'bg-green-50', text: 'text-apple-green' },
  error: { label: '失败', bg: 'bg-red-50', text: 'text-apple-red' },
};

export default function ProgressBar({ current, total, url, status }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const cfg = statusConfig[status] || { label: '处理中', bg: 'bg-apple-gray-100', text: 'text-apple-gray-600' };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-apple-gray-200">
      <div className="mb-2 flex items-center gap-3 text-sm">
        <span className="flex-1 font-medium text-apple-gray-900">
          正在抓取 {current} / {total}
        </span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
        <span className="min-w-[36px] text-right text-xs font-semibold text-apple-gray-700">
          {percent}%
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-apple-gray-200">
        <div
          className="h-full rounded-full bg-apple-blue transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {url && (
        <p className="mt-2 truncate font-mono text-xs text-apple-gray-500" title={url}>
          {url}
        </p>
      )}
    </div>
  );
}
