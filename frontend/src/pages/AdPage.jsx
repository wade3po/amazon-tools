import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, PencilSquareIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useCurrentShop } from '../hooks/useCurrentShop';

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

const inputCls = 'w-full rounded-lg border border-apple-gray-200 bg-apple-gray-50 px-3 py-2 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20';

export default function AdPage() {
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

  // 日志弹窗
  const [showLogs, setShowLogs] = useState(false);
  const [logRecord, setLogRecord] = useState(null);
  const [logs, setLogs] = useState([]);

  // 手动添加日志
  const [newLogDesc, setNewLogDesc] = useState('');
  const [addingLog, setAddingLog] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await api.get('/ad', { params: { shopId } });
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
    setEditForm({
      hasAd: record.hasAd || false,
      adStartDate: record.adStartDate ? record.adStartDate.split('T')[0] : '',
      adBid: record.adBid ?? '',
      adAcos: record.adAcos ?? '',
      adNote: record.adNote || '',
      isOutOfStock: record.isOutOfStock || false,
      outOfStockStart: record.outOfStockStart ? record.outOfStockStart.split('T')[0] : '',
      outOfStockEnd: record.outOfStockEnd ? record.outOfStockEnd.split('T')[0] : '',
    });
    setShowEdit(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/ad/${editRecord._id}`, {
        hasAd: editForm.hasAd,
        adStartDate: editForm.adStartDate || null,
        adBid: editForm.adBid !== '' ? Number(editForm.adBid) : null,
        adAcos: editForm.adAcos !== '' ? Number(editForm.adAcos) : null,
        isOutOfStock: editForm.isOutOfStock,
        outOfStockStart: editForm.outOfStockStart || null,
        outOfStockEnd: editForm.outOfStockEnd || null,
        adNote: editForm.adNote || '',
      });
      toast.success('已保存');
      setShowEdit(false);
      fetchRecords();
    } catch (err) { toast.error(err.msg || '保存失败'); }
    finally { setSaving(false); }
  };

  const openLogs = async (record) => {
    setLogRecord(record);
    setShowLogs(true);
    setNewLogDesc('');
    try {
      const res = await api.get(`/ad/${record._id}/logs`);
      setLogs(res.data.logs || []);
    } catch { setLogs([]); }
  };

  const handleAddLog = async () => {
    if (!newLogDesc.trim()) return;
    setAddingLog(true);
    try {
      await api.post(`/ad/${logRecord._id}/log`, { action: 'custom', description: newLogDesc.trim() });
      toast.success('已添加');
      setNewLogDesc('');
      // 刷新日志
      const res = await api.get(`/ad/${logRecord._id}/logs`);
      setLogs(res.data.logs || []);
    } catch (err) { toast.error(err.msg || '添加失败'); }
    finally { setAddingLog(false); }
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
      <div>
        <h1 className="text-xl font-semibold text-apple-gray-900">广告管理</h1>
        <p className="mt-0.5 text-sm text-apple-gray-500">{currentShop?.name} · 共 {filtered.length} 个产品</p>
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
            className="w-full rounded-lg border border-apple-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-apple-gray-400 focus:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue/20"
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
                <tr className="border-b border-apple-gray-100 bg-apple-gray-50">
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">产品组</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">SKU</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">品名</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">FNSKU</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-apple-gray-400">广告</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">竞价($)</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">ACOS(%)</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-apple-gray-400">断货</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">广告操作</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-apple-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-50">
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
                      <tr key={r._id} className={`group hover:bg-apple-gray-50/50 ${isFirstInGroup && rowIdx > 0 ? 'border-t-2 border-apple-gray-200' : ''}`}>
                        {isFirstInGroup && (
                          <td rowSpan={span} className="border-r border-apple-gray-100 px-3 py-2.5 align-middle text-center">
                            {r.groupId && <span className="inline-block whitespace-nowrap rounded-md bg-apple-blue/10 px-2 py-0.5 text-xs font-semibold text-apple-blue">{r.groupId}</span>}
                          </td>
                        )}
                        <td className="px-3 py-2.5 font-medium text-apple-gray-900">{r.sku}</td>
                        <td className="px-3 py-2.5 text-apple-gray-700 max-w-[200px] truncate" title={r.name}>{r.name}</td>
                        <td className="px-3 py-2.5 text-apple-gray-500">{r.fnsku}</td>
                        <td className="px-3 py-2.5 text-center">
                          {r.hasAd ? (
                            <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">开启</span>
                          ) : (
                            <span className="inline-block rounded-full bg-apple-gray-100 px-2 py-0.5 text-xs text-apple-gray-400">关闭</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">{r.adBid != null ? `$${Number(r.adBid).toFixed(2)}` : <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-right">{r.adAcos != null ? `${r.adAcos}%` : <span className="text-apple-gray-300">—</span>}</td>
                        <td className="px-3 py-2.5 text-center">
                          {r.isOutOfStock ? (
                            <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">断货</span>
                          ) : (
                            <span className="text-apple-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => openEdit(r)} title="编辑" className="rounded-lg p-1.5 text-apple-gray-300 hover:bg-apple-gray-100 hover:text-apple-blue">
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => openLogs(r)} title="操作日志" className="rounded-lg p-1.5 text-apple-gray-300 hover:bg-apple-gray-100 hover:text-apple-blue">
                              <ClipboardDocumentListIcon className="h-4 w-4" />
                            </button>
                          </div>
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
            <h2 className="mb-1 text-base font-semibold text-apple-gray-900">编辑广告信息</h2>
            <p className="mb-4 text-xs text-apple-gray-500">{editRecord.sku} - {editRecord.name}</p>
            <form onSubmit={handleSave} className="space-y-4">
              {/* 广告状态 */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editForm.hasAd} onChange={(e) => setEditForm({ ...editForm, hasAd: e.target.checked })} className="rounded" />
                  开启广告
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">广告开始时间</label>
                  <input type="date" value={editForm.adStartDate} onChange={(e) => setEditForm({ ...editForm, adStartDate: e.target.value })} onClick={(e) => e.target.showPicker?.()} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">广告竞价 ($)</label>
                  <input type="number" step="0.01" value={editForm.adBid} onChange={(e) => setEditForm({ ...editForm, adBid: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">ACOS (%)</label>
                  <input type="number" step="0.1" value={editForm.adAcos} onChange={(e) => setEditForm({ ...editForm, adAcos: e.target.value })} className={inputCls} />
                </div>
              </div>

              {/* 广告操作内容 */}
              <div className="border-t border-apple-gray-100 pt-4">
                <label className="mb-1 block text-xs font-medium text-apple-gray-600">广告操作内容（保存时自动记录到日志）</label>
                <input
                  type="text"
                  value={editForm.adNote || ''}
                  onChange={(e) => setEditForm({ ...editForm, adNote: e.target.value })}
                  placeholder="如：否词 xxx、降低竞价0.05、暂停广告..."
                  className={inputCls}
                />
              </div>

              {/* 断货状态 */}
              <div className="border-t border-apple-gray-100 pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editForm.isOutOfStock} onChange={(e) => setEditForm({ ...editForm, isOutOfStock: e.target.checked })} className="rounded" />
                  当前断货
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">断货开始</label>
                  <input type="date" value={editForm.outOfStockStart} onChange={(e) => setEditForm({ ...editForm, outOfStockStart: e.target.value })} onClick={(e) => e.target.showPicker?.()} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">断货结束</label>
                  <input type="date" value={editForm.outOfStockEnd} onChange={(e) => setEditForm({ ...editForm, outOfStockEnd: e.target.value })} onClick={(e) => e.target.showPicker?.()} className={inputCls} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">取消</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 日志弹窗 */}
      {showLogs && logRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-base font-semibold text-apple-gray-900">操作日志</h2>
            <p className="mb-4 text-xs text-apple-gray-500">{logRecord.sku} - {logRecord.name}</p>

            {/* 添加日志 */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newLogDesc}
                onChange={(e) => setNewLogDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
                placeholder="输入操作记录，如：否词 xxx、暂停广告、竞价降低0.05..."
                className={inputCls + ' flex-1'}
              />
              <button onClick={handleAddLog} disabled={addingLog || !newLogDesc.trim()} className="rounded-lg bg-apple-blue px-3 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50 whitespace-nowrap">
                添加
              </button>
            </div>

            {/* 日志列表 */}
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-apple-gray-400">暂无操作记录</p>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-apple-gray-100">
                {logs.map((log) => (
                  <div key={log._id} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 text-xs text-apple-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span className={`text-sm ${log.action === 'bid_increase' || log.action === 'resume_ad' || log.action === 'back_in_stock' ? 'text-green-600' : log.action === 'bid_decrease' || log.action === 'pause_ad' || log.action === 'out_of_stock' ? 'text-red-500' : 'text-apple-gray-800'}`}>
                      {log.description}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowLogs(false)} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
