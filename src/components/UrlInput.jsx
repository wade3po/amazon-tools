import { useState } from 'react';

function UrlInput({ onScrape, isScaping }) {
  const [urlText, setUrlText] = useState('');

  const handleScrape = () => {
    const urls = urlText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && u.startsWith('http'));

    if (urls.length === 0) {
      alert('请输入至少一个有效的亚马逊商品链接');
      return;
    }

    onScrape(urls);
  };

  const handlePaste = (e) => {
    // 粘贴时自动处理多行
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

  return (
    <div className="url-input-section">
      <div className="section-header">
        <h2>输入商品链接</h2>
        <span className="hint">支持单个或多个链接，每行一个</span>
      </div>

      <textarea
        className="url-textarea"
        value={urlText}
        onChange={(e) => setUrlText(e.target.value)}
        onPaste={handlePaste}
        placeholder={`粘贴亚马逊商品链接，每行一个，例如：\nhttps://www.amazon.com/dp/B08N5WRWNW\nhttps://www.amazon.com/dp/B09G9FPHY6`}
        rows={5}
        disabled={isScaping}
      />

      <div className="input-footer">
        <span className="url-count">
          {urlCount > 0 ? `已输入 ${urlCount} 个链接` : ''}
        </span>
        <div className="input-actions">
          <button
            className="btn btn-ghost"
            onClick={() => setUrlText('')}
            disabled={isScaping || !urlText}
          >
            清空
          </button>
          <button
            className="btn btn-primary btn-large"
            onClick={handleScrape}
            disabled={isScaping || urlCount === 0}
          >
            {isScaping ? (
              <>
                <span className="spinner" />
                抓取中...
              </>
            ) : (
              `开始抓取${urlCount > 0 ? ` (${urlCount})` : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UrlInput;
