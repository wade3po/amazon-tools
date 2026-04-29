export default function ProductTable({ products, selected, onToggleSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-apple-gray-200 bg-apple-gray-50">
            <th className="w-10 px-3 py-2.5" />
            <th className="w-16 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">图片</th>
            <th className="min-w-[200px] max-w-[300px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">商品标题</th>
            <th className="min-w-[120px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">类目</th>
            <th className="w-24 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">价格</th>
            <th className="w-20 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">评分</th>
            <th className="w-20 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">评论数</th>
            <th className="w-28 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">品牌</th>
            <th className="w-28 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">ASIN</th>
            <th className="w-24 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">库存</th>
            <th className="min-w-[200px] px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">描述要点</th>
            <th className="w-16 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-apple-gray-500">状态</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              isSelected={selected.has(product.id)}
              onToggle={() => onToggleSelect(product.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductRow({ product, isSelected, onToggle }) {
  const isSuccess = product.status === 'success';
  const bullets = product.bullets || [];

  return (
    <tr
      className={`border-b border-apple-gray-100 transition-colors ${
        isSuccess ? 'cursor-pointer hover:bg-apple-gray-50' : 'opacity-70'
      } ${isSelected ? 'bg-apple-blue-light' : ''}`}
      onClick={isSuccess ? onToggle : undefined}
    >
      <td className="px-3 py-2.5">
        {isSuccess && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-apple-gray-300 accent-apple-blue"
          />
        )}
      </td>
      <td className="px-3 py-2.5">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-12 w-12 rounded-lg border border-apple-gray-200 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-apple-gray-100 text-xs text-apple-gray-400">
            无图
          </div>
        )}
      </td>
      <td className="max-w-[300px] px-3 py-2.5">
        {isSuccess ? (
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={product.title}
            className="line-clamp-2 text-sm text-apple-blue hover:underline"
          >
            {product.title || '(无标题)'}
          </a>
        ) : (
          <div>
            <p className="truncate font-mono text-xs text-apple-gray-500" title={product.url}>{product.url}</p>
            <p className="mt-0.5 text-xs text-apple-red">❌ {product.error}</p>
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="line-clamp-2 text-xs text-apple-gray-600" title={product.category}>{product.category || '-'}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="font-semibold text-orange-700">{product.price || '-'}</span>
      </td>
      <td className="px-3 py-2.5">
        {product.rating ? (
          <span className="whitespace-nowrap text-xs text-orange-600">
            ⭐ {product.rating.replace(' out of 5 stars', '').replace(' 颗星，最多 5 颗星', '')}
          </span>
        ) : '-'}
      </td>
      <td className="px-3 py-2.5 text-xs text-apple-gray-700">{product.reviewCount || '-'}</td>
      <td className="px-3 py-2.5 text-xs text-apple-gray-700">{product.brand || '-'}</td>
      <td className="px-3 py-2.5">
        <code className="rounded bg-apple-gray-100 px-1.5 py-0.5 font-mono text-xs text-apple-gray-700">
          {product.asin || '-'}
        </code>
      </td>
      <td className="px-3 py-2.5">
        <span className={`rounded-md px-2 py-0.5 text-xs ${
          product.availability?.toLowerCase().includes('in stock')
            ? 'bg-green-50 text-apple-green'
            : 'bg-apple-gray-100 text-apple-gray-600'
        }`}>
          {product.availability || '-'}
        </span>
      </td>
      <td className="px-3 py-2.5">
        {bullets.length > 0 ? (
          <ul className="space-y-0.5">
            {bullets.slice(0, 3).map((b, i) => (
              <li key={i} className="line-clamp-1 text-xs text-apple-gray-700">
                <span className="mr-1 text-apple-orange">•</span>{b}
              </li>
            ))}
            {bullets.length > 3 && (
              <li className="text-xs text-apple-gray-400">+{bullets.length - 3} 更多</li>
            )}
          </ul>
        ) : '-'}
      </td>
      <td className="px-3 py-2.5">
        {isSuccess ? (
          <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-apple-green">成功</span>
        ) : (
          <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-apple-red">失败</span>
        )}
      </td>
    </tr>
  );
}
