import { useState, useEffect, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, PencilSquareIcon, LinkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useCurrentShop } from '../hooks/useCurrentShop';
import * as XLSX from 'xlsx';

// 自然排序
function naturalSortKey(str) {
  if (!str) return [];
  return String(str).split(/(\d+)/).map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? part.toLowerCase() : num;
  });
}
function naturalCompare(a, b) {
  const ka = naturalSortKey(a);
  const kb = naturalSortKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const va = ka[i] ?? '';
    const vb = kb[i] ?? '';
    if (typeof va === 'number' && typeof vb === 'number') {
      if (va !== vb) return va - vb;
    } else {
      const sa = String(va);
      const sb = String(vb);
      if (sa !== sb) return sa < sb ? -1 : 1;
    }
  }
  return 0;
}

const inputCls = 'w-full rounded-lg bg-apple-gray-50 px-3 py-2 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20';

export default function PurchasePage() {
  const { currentShop } = useCurrentShop();
  const shopId = currentShop?._id;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // 编辑弹窗
  const [showEdit, setShowEdit] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // 导入
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const fetchRecords = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await api.get('/purchase', { params: { shopId } });
      setRecords(res.data.records || []);
    } catch { toast.error('加载失败'); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { if (shopId) fetchRecords(); }, [shopId, fetchRecords]);

  const filtered = records
    .filter(r => {
      if (!activeSearch) return true;
      const kw = activeSearch.toLowerCase();
      return (r.sku || '').toLowerCase().includes(kw) ||
        (r.name || '').toLowerCase().includes(kw) ||
        (r.fnsku || '').toLowerCase().includes(kw) ||
        (r.groupId || '').toLowerCase().includes(kw);
    })
    .sort((a, b) => {
      const g = naturalCompare(a.groupId || '', b.groupId || '');
      if (g !== 0) return g;
      return naturalCompare(a.sku || '', b.sku || '');
    });

  const openEdit = (record) => {
    setEditRecord(record);
    // 采购链接是产品组共享的，取同组第一条记录的值回显
    const groupLink = records.find(r => (r.groupId || r._id) === (record.groupId || record._id))?.purchaseLink || '';
    setEditForm({
      purchaseLink: groupLink,
      weight: record.weight ?? '',
      shippingQty: record.shippingQty ?? '',
      totalWeight: record.totalWeight ?? '',
      unit: record.unit || '',
      size: record.size || '',
      shape: record.shape || '',
      color: record.color || '',
      plannedQty: record.plannedQty ?? '',
      stockQty: record.stockQty ?? '',
      actualQty: record.actualQty ?? '',
      note: record.note || '',
    });
    setShowEdit(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 保存当前记录
      await api.put(`/purchase/${editRecord._id}`, {
        purchaseLink: editForm.purchaseLink,
        weight: editForm.weight !== '' ? Number(editForm.weight) : null,
        shippingQty: editForm.shippingQty !== '' ? Number(editForm.shippingQty) : null,
        totalWeight: editForm.totalWeight !== '' ? Number(editForm.totalWeight) : null,
        unit: editForm.unit,
        size: editForm.size,
        shape: editForm.shape,
        color: editForm.color,
        plannedQty: editForm.plannedQty !== '' ? Number(editForm.plannedQty) : null,
        stockQty: editForm.stockQty !== '' ? Number(editForm.stockQty) : null,
        actualQty: editForm.actualQty !== '' ? Number(editForm.actualQty) : null,
        note: editForm.note,
      });

      // 采购链接是产品组共享的，同步更新同组其他记录
      const groupKey = editRecord.groupId || editRecord._id;
      const sameGroupRecords = records.filter(r => (r.groupId || r._id) === groupKey && r._id !== editRecord._id);
      if (sameGroupRecords.length > 0) {
        await Promise.all(sameGroupRecords.map(r =>
          api.put(`/purchase/${r._id}`, { purchaseLink: editForm.purchaseLink })
        ));
      }

      toast.success('已保存');
      setShowEdit(false);
      fetchRecords();
    } catch (err) { toast.error(err.msg || '保存失败'); }
    finally { setSaving(false); }
  };

  // ── Excel 导入解析 ──
  function n(v) {
    if (v === '' || v === null || v === undefined) return undefined;
    const num = Number(String(v).replace(/[¥$£€,%]/g, '').trim());
    return isNaN(num) ? undefined : num;
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });

        // 优先找名为"采购表"的 sheet，否则找包含"采购"的 sheet，最后找包含 SKU 的
        let targetSheet = null;
        if (wb.Sheets['采购表']) {
          targetSheet = wb.Sheets['采购表'];
        } else {
          for (const sheetName of wb.SheetNames) {
            if (sheetName.includes('采购')) {
              targetSheet = wb.Sheets[sheetName];
              break;
            }
          }
        }
        if (!targetSheet) {
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (raw.slice(0, 10).some((row) => row.some((c) => String(c).includes('SKU')))) {
              targetSheet = ws;
              break;
            }
          }
        }
        if (!targetSheet) { toast.error('未找到采购表工作表'); return; }

        const rawData = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });

        // 找表头行
        let headerIdx = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          if (rawData[i].some((c) => String(c).includes('SKU'))) { headerIdx = i; break; }
        }

        // 处理合并单元格 → 序号/采购链接列补全
        const merges = targetSheet['!merges'] || [];
        const mergeMap = {}; // row -> { col -> value }
        for (const m of merges) {
          const addr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
          const val = targetSheet[addr]?.v;
          if (val !== undefined && val !== null) {
            for (let r = m.s.r; r <= m.e.r; r++) {
              if (!mergeMap[r]) mergeMap[r] = {};
              mergeMap[r][m.s.c] = String(val).trim();
            }
          }
        }

        const headers = rawData[headerIdx].map((h) => String(h).trim());
        const parsed = [];

        for (let i = headerIdx + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (row.every((c) => c === '' || c === null)) continue;
          const obj = {};
          headers.forEach((h, idx) => {
            // 优先用合并单元格的值
            const mergeVal = mergeMap[i]?.[idx];
            obj[h] = mergeVal !== undefined ? mergeVal : row[idx];
          });

          const get = (...keys) => {
            for (const k of keys) {
              if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
            }
            return '';
          };

          const sku = String(get('SKU 编码', 'SKU') || '').trim();
          if (!sku) continue;

          parsed.push({
            sku,
            purchaseLink: String(get('采购链接', '1688采购链接') || '').trim(),
            weight: n(get('重量/g', '重量')),
            shippingQty: n(get('发货件数')),
            totalWeight: n(get('总重', '总重/kg')),
            unit: String(get('单位') || '').trim(),
            size: String(get('尺寸') || '').trim(),
            shape: String(get('形状') || '').trim(),
            color: String(get('颜色') || '').trim(),
            plannedQty: n(get('计划采购数量')),
            stockQty: n(get('产品库存数量')),
            actualQty: n(get('实际应采购数量')),
          });
        }

        setImportRows(parsed);
        toast.success(`解析到 ${parsed.length} 条数据`);
      } catch (err) {
        toast.error('解析失败：' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    try {
      const res = await api.post('/purchase/batch/import', { shopId, items: importRows });
      toast.success(`导入完成：更新 ${res.data.updated} 条，跳过 ${res.data.skipped} 条`);
      setShowImport(false);
      setImportRows([]);
      setImportFileName('');
      fetchRecords();
    } catch (err) {
      toast.error(err.msg || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  if (!shopId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-apple-gray-400">
        <p className="text-sm">请先在顶部选择店铺</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-gray-900">采购管理</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">{currentShop?.name} · 共 {filtered.length} 个产品</p>
        </div>
        <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-apple-blue px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97]">
          <ArrowUpTrayIcon className="h-4 w-4" />批量导入
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveSearch(search)}
            placeholder="搜索 SKU、品名、FNSKU..."
            className="w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm placeholder:text-apple-gray-400 focus:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue/20"
          />
        </div>
        <button onClick={() => setActiveSearch(search)} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover">搜索</button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-apple-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-gray-200 border-t-apple-gray-900" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-apple-gray-400">暂无数据</p>
          </div>
        ) : (
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-apple-gray-200 bg-apple-gray-50">
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">采购链接</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">产品组</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">SKU</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">品名</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">重量/g</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">发货件数</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">总重</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">单位</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">尺寸</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">形状</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">颜色</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">计划采购数量</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">产品库存数量</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">实际应采购数量</th>
                  <th className="sticky right-0 z-20 whitespace-nowrap bg-apple-gray-50 px-3 py-3 text-center font-medium text-apple-gray-400 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">操作</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 计算 rowSpan
                  const rowSpanMap = {};
                  filtered.forEach((r) => {
                    const key = r.groupId || r._id;
                    rowSpanMap[key] = (rowSpanMap[key] || 0) + 1;
                  });
                  const renderedGroups = new Set();

                  return filtered.map((r, rowIdx) => {
                    const groupKey = r.groupId || r._id;
                    const isFirstInGroup = !renderedGroups.has(groupKey);
                    if (isFirstInGroup) renderedGroups.add(groupKey);
                    const span = rowSpanMap[groupKey];

                    return (
                      <tr key={r._id} className="hover:bg-apple-gray-50/50">
                        {/* 采购链接 - 按产品组合并 */}
                        {isFirstInGroup && (
                          <td rowSpan={span} className="px-3 py-2.5 align-middle text-center">
                            {r.purchaseLink ? (
                              <div className="flex flex-col items-center gap-1">
                                {r.purchaseLink.split('\n').filter(l => l.trim()).map((link, i) => (
                                  <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-apple-blue hover:text-apple-blue-hover" title={link.trim()}>
                                    <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="text-xs">链接{r.purchaseLink.split('\n').filter(l => l.trim()).length > 1 ? i + 1 : ''}</span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-apple-gray-300">—</span>
                            )}
                          </td>
                        )}
                        {/* 产品组 - 按产品组合并 */}
                        {isFirstInGroup && (
                          <td rowSpan={span} className="px-3 py-2.5 align-middle text-center">
                            {r.groupId && <span className="inline-block whitespace-nowrap rounded-md bg-apple-blue/10 px-2 py-0.5 text-xs font-semibold text-apple-blue">{r.groupId}</span>}
                          </td>
                        )}
                        <td className="px-3 py-2.5 font-medium text-apple-gray-900">{r.sku}</td>
                        <td className="px-3 py-2.5 text-apple-gray-700 max-w-[200px] truncate" title={r.name}>{r.name}</td>
                        <td className="px-3 py-2.5 text-right text-apple-gray-600">{r.weight != null ? r.weight : <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right text-apple-gray-600">{r.shippingQty != null ? r.shippingQty : <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right text-apple-gray-600">{r.totalWeight != null ? r.totalWeight : <span className="text-apple-gray-300">—</span>}</td>
                        {/* 单位 - 按产品组合并 */}
                        {isFirstInGroup && (
                          <td rowSpan={span} className="px-3 py-2.5 align-middle text-center text-apple-gray-600">
                            {r.unit || <span className="text-apple-gray-300">—</span>}
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-apple-gray-600">{r.size || <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-apple-gray-600">{r.shape || <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-apple-gray-600">{r.color || <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-apple-gray-900">{r.plannedQty != null ? r.plannedQty : <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right text-apple-gray-600">{r.stockQty != null ? r.stockQty : <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right">
                          {r.actualQty != null ? (
                            <span className="font-semibold text-apple-blue">{r.actualQty}</span>
                          ) : (
                            <span className="text-apple-gray-300">—</span>
                          )}
                        </td>
                        <td className="sticky right-0 z-10 bg-white px-3 py-2.5 text-center shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                          <button onClick={() => openEdit(r)} title="编辑" className="rounded-lg p-1.5 text-apple-gray-300 hover:bg-apple-gray-100 hover:text-apple-blue">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showEdit && editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-base font-semibold text-apple-gray-900">编辑采购信息</h2>
            <p className="mb-4 text-xs text-apple-gray-500">{editRecord.sku} - {editRecord.name}</p>
            <form onSubmit={handleSave} className="space-y-4">
              {/* 采购链接 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-apple-gray-600">采购链接（每行一条）</label>
                <textarea value={editForm.purchaseLink} onChange={(e) => setEditForm({ ...editForm, purchaseLink: e.target.value })} placeholder="https://detail.1688.com/...&#10;每行输入一条链接" rows={3} className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">重量/g</label>
                  <input type="number" step="0.1" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">发货件数</label>
                  <input type="number" value={editForm.shippingQty} onChange={(e) => setEditForm({ ...editForm, shippingQty: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">总重</label>
                  <input type="number" step="0.01" value={editForm.totalWeight} onChange={(e) => setEditForm({ ...editForm, totalWeight: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">单位</label>
                  <input type="text" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} placeholder="如：L" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">尺寸</label>
                  <input type="text" value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} placeholder="如：15*15*4.2" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">形状</label>
                  <input type="text" value={editForm.shape} onChange={(e) => setEditForm({ ...editForm, shape: e.target.value })} placeholder="如：圆形" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">颜色</label>
                  <input type="text" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} placeholder="如：黑色" className={inputCls} />
                </div>
              </div>

              <div className="border-t border-apple-gray-100 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-apple-gray-600">计划采购数量</label>
                    <input type="number" value={editForm.plannedQty} onChange={(e) => setEditForm({ ...editForm, plannedQty: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-apple-gray-600">产品库存数量</label>
                    <input type="number" value={editForm.stockQty} onChange={(e) => setEditForm({ ...editForm, stockQty: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-apple-gray-600">实际应采购数量</label>
                    <input type="number" value={editForm.actualQty} onChange={(e) => setEditForm({ ...editForm, actualQty: e.target.value })} className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-apple-gray-600">备注</label>
                <input type="text" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} placeholder="备注信息" className={inputCls} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">取消</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-base font-semibold text-apple-gray-900">批量导入采购数据</h2>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-apple-gray-200 bg-apple-gray-50 py-10 transition-colors hover:border-apple-blue hover:bg-apple-blue/5"
              onClick={() => fileRef.current?.click()}
            >
              <ArrowUpTrayIcon className="mb-2 h-8 w-8 text-apple-gray-300" />
              <p className="text-sm font-medium text-apple-gray-600">{importFileName || '点击选择 Excel 文件'}</p>
              <p className="mt-1 text-xs text-apple-gray-400">支持 .xlsx / .xls，按 SKU 匹配更新采购记录</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
            </div>

            {importRows.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-apple-gray-100">
                <div className="flex items-center justify-between bg-apple-gray-50 px-4 py-2">
                  <span className="text-xs font-medium text-apple-gray-600">预览（前 5 条）</span>
                  <span className="text-xs text-apple-gray-400">共 {importRows.length} 条</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-apple-gray-100">
                        {['SKU', '重量/g', '发货件数', '单位', '颜色', '计划采购', '库存', '实际采购'].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-apple-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-apple-gray-50">
                      {importRows.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-apple-gray-900">{r.sku}</td>
                          <td className="px-3 py-2">{r.weight ?? '—'}</td>
                          <td className="px-3 py-2">{r.shippingQty ?? '—'}</td>
                          <td className="px-3 py-2">{r.unit || '—'}</td>
                          <td className="px-3 py-2">{r.color || '—'}</td>
                          <td className="px-3 py-2">{r.plannedQty ?? '—'}</td>
                          <td className="px-3 py-2">{r.stockQty ?? '—'}</td>
                          <td className="px-3 py-2">{r.actualQty ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setShowImport(false); setImportRows([]); setImportFileName(''); }} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">取消</button>
              <button onClick={handleImport} disabled={!importRows.length || importing} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50">
                {importing ? '导入中...' : `导入 ${importRows.length} 条`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
