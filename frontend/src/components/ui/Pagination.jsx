import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  const btnCls = "flex h-8 min-w-[32px] items-center justify-center rounded-lg text-sm transition-all";

  return (
    <div className="flex items-center justify-between border-t border-apple-gray-100 px-5 py-3">
      <span className="text-xs text-apple-gray-400">
        {'\u5171 '}{total}{' \u6761'}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${btnCls} px-1 text-apple-gray-400 hover:bg-apple-gray-100 hover:text-apple-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className={`${btnCls} px-2 text-apple-gray-600 hover:bg-apple-gray-100`}>1</button>
            {start > 2 && <span className="px-1 text-xs text-apple-gray-300">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${btnCls} px-2 ${
              p === page
                ? 'bg-apple-blue text-white'
                : 'text-apple-gray-600 hover:bg-apple-gray-100'
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-xs text-apple-gray-300">...</span>}
            <button onClick={() => onPageChange(totalPages)} className={`${btnCls} px-2 text-apple-gray-600 hover:bg-apple-gray-100`}>{totalPages}</button>
          </>
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`${btnCls} px-1 text-apple-gray-400 hover:bg-apple-gray-100 hover:text-apple-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
