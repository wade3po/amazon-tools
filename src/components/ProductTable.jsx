function ProductTable({ products, selected, onToggleSelect }) {
  return (
    <div className="table-wrapper">
      <table className="product-table">
        <thead>
          <tr>
            <th className="col-check"></th>
            <th className="col-image">图片</th>
            <th className="col-title">商品标题</th>
            <th className="col-category">类目</th>
            <th className="col-price">价格</th>
            <th className="col-rating">评分</th>
            <th className="col-reviews">评论数</th>
            <th className="col-brand">品牌</th>
            <th className="col-asin">ASIN</th>
            <th className="col-stock">库存</th>
            <th className="col-bullets">描述要点</th>
            <th className="col-status">状态</th>
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
      className={`product-row ${isSelected ? 'selected' : ''} ${!isSuccess ? 'error-row' : ''}`}
      onClick={isSuccess ? onToggle : undefined}
    >
      <td className="col-check">
        {isSuccess && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </td>
      <td className="col-image">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="product-thumb"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="no-image">无图</div>
        )}
      </td>
      <td className="col-title">
        {isSuccess ? (
          <div className="product-title-cell">
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={product.title}
            >
              {product.title || '(无标题)'}
            </a>
          </div>
        ) : (
          <div className="error-cell">
            <div className="error-url" title={product.url}>{product.url}</div>
            <div className="error-msg">❌ {product.error}</div>
          </div>
        )}
      </td>
      <td className="col-category">
        <span className="category-text" title={product.category}>{product.category || '-'}</span>
      </td>
      <td className="col-price">
        <span className="price-text">{product.price || '-'}</span>
      </td>
      <td className="col-rating">
        {product.rating ? (
          <span className="rating-text">⭐ {product.rating.replace(' out of 5 stars', '').replace(' 颗星，最多 5 颗星', '')}</span>
        ) : '-'}
      </td>
      <td className="col-reviews">{product.reviewCount || '-'}</td>
      <td className="col-brand">{product.brand || '-'}</td>
      <td className="col-asin">
        <code className="asin-code">{product.asin || '-'}</code>
      </td>
      <td className="col-stock">
        <span className={`stock-badge ${product.availability?.toLowerCase().includes('in stock') ? 'in-stock' : ''}`}>
          {product.availability || '-'}
        </span>
      </td>
      <td className="col-bullets">
        {bullets.length > 0 ? (
          <ul className="bullet-list">
            {bullets.map((b, i) => (
              <li key={i} className="bullet-item">{b}</li>
            ))}
          </ul>
        ) : '-'}
      </td>
      <td className="col-status">
        {isSuccess ? (
          <span className="badge badge-success">成功</span>
        ) : (
          <span className="badge badge-error">失败</span>
        )}
      </td>
    </tr>
  );
}

export default ProductTable;
