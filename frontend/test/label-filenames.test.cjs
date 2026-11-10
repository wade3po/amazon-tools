const test = require('node:test');
const assert = require('node:assert/strict');
const { labelFileName, legacyChineseName, findLabelFile } = require('../electron/label-filenames.cjs');

test('long Chinese labels keep their suffix and old truncated labels remain findable', () => {
  const sku = 'YL-9-1', name = '反光条贴纸（6_6CM 圆角五角星【荧光黄绿】；）'.repeat(8);
  const modern = labelFileName(sku, name, true), legacy = legacyChineseName(sku, name);
  assert.ok(modern.endsWith('-中文标签.pdf'));
  assert.ok(modern.length <= 104);
  assert.ok(!legacy.includes('中文标签'));
  assert.equal(findLabelFile([legacy], sku, name, true).file, legacy);
  assert.ok(findLabelFile([legacy], sku, name).error);
});

test('symbols are normalized consistently and exact names win over other SKUs', () => {
  const sku = 'A/B', name = '商品:名称?';
  const file = labelFileName(sku, name);
  assert.equal(file, 'A_B-商品_名称_.pdf');
  assert.equal(findLabelFile(['A_B-其他.pdf', file], sku, name).file, file);
  assert.ok(findLabelFile(['A_B-其他.pdf', 'A_B-更多.pdf'], sku, name).error);
  assert.ok(findLabelFile(['A_BC-其他.pdf'], sku, name).error);
});

test('unicode truncation does not split a surrogate pair', () => {
  const file = labelFileName('SKU', '😀'.repeat(100), true);
  assert.ok(!/[\uD800-\uDBFF]$/.test(file.slice(0, -'-中文标签.pdf'.length)));
});


test('a longer SKU sharing a prefix is never used as a fallback', () => {
  const other = labelFileName('YL-9-1-20', '商品', true);
  assert.ok(findLabelFile([other], 'YL-9-1', '商品', true).error);
});
