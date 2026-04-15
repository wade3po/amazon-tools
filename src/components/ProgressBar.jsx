function ProgressBar({ current, total, url, status }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  const statusText = {
    scraping: '抓取中',
    done: '完成',
    error: '失败',
  }[status] || '处理中';

  const statusClass = {
    scraping: 'status-scraping',
    done: 'status-done',
    error: 'status-error',
  }[status] || '';

  return (
    <div className="progress-section">
      <div className="progress-header">
        <span className="progress-label">
          正在抓取 {current} / {total}
        </span>
        <span className={`progress-status ${statusClass}`}>{statusText}</span>
        <span className="progress-percent">{percent}%</span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      {url && (
        <div className="progress-url" title={url}>
          {url.length > 80 ? url.slice(0, 80) + '...' : url}
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
