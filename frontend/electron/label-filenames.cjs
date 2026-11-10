const CHINESE_SUFFIX = '-中文标签';
function clean(value) {
  return String(value || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim();
}
function truncate(value, limit) {
  let result = value.slice(0, limit);
  if (/[\uD800-\uDBFF]$/.test(result)) result = result.slice(0, -1);
  return result.replace(/[. ]+$/g, '');
}
function base(sku, name) { return clean([sku, name].filter(Boolean).join('-')); }
function labelFileName(sku, name, chinese = false) {
  const suffix = chinese ? CHINESE_SUFFIX : '';
  const limit = chinese ? 100 : 80;
  return truncate(base(sku, name), limit - suffix.length) + suffix + '.pdf';
}
function legacyChineseName(sku, name) {
  return truncate(clean([sku, name, '中文标签'].filter(Boolean).join('-')), 100) + '.pdf';
}
function findLabelFile(files, sku, name, chinese = false) {
  if (!clean(sku)) return { error: 'SKU 为空，无法查找标签' };
  const pdfs = files.filter(f => /\.pdf$/i.test(f));
  const exact = labelFileName(sku, name, chinese);
  let match = pdfs.find(f => f.toLowerCase() === exact.toLowerCase());
  if (match) return { file: match };
  // Older versions could truncate the Chinese suffix; only accept the exact old name.
  if (chinese) {
    const legacy = legacyChineseName(sku, name);
    // A short name with no distinct suffix is not evidence of a Chinese label.
    if (legacy.toLowerCase() !== labelFileName(sku, name, false).toLowerCase()) {
      match = pdfs.find(f => f.toLowerCase() === legacy.toLowerCase());
      if (match) return { file: match };
    }
  }
  return { error: '标签文件不存在' };
}
module.exports = { labelFileName, legacyChineseName, findLabelFile };
