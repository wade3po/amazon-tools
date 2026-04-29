import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ListToolbar({ search, onSearchChange, onSearch, placeholder = '搜索...' }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) onSearch();
  };

  return (
    <div className="flex items-center gap-2 border-b border-apple-gray-100 px-5 py-2.5">
      <div className="relative flex-1 max-w-xs">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-apple-gray-200 bg-apple-gray-50 py-1.5 pl-9 pr-3 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-all focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20"
        />
      </div>
      <button
        onClick={onSearch}
        className="rounded-lg bg-apple-blue px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97]"
      >
        搜索
      </button>
    </div>
  );
}
