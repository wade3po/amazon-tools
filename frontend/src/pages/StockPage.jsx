import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, PencilSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useCurrentShop } from '../hooks/useCurrentShop';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

export default function StockPage() {
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

  const fetchRecords = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await api.get('/stock', { params: { shopId } });
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
        (r.groupId || '').toLowerCase().includes(kw);
    })
    .sort((a, b) => {
      const g = naturalCompare(a.groupId || '', b.groupId || '');
      if (g !== 0) return g;
      return naturalCompare(a.sku || '', b.sku || '');
    });

  const openEdit = (record) => {
    setEditRecord(record);
    // 单位是产品组共享的，取同组第一条
    const groupKey = record.groupId || record._id;
    const groupUnit = records.find(r => (r.groupId || r._id) === groupKey)?.unit || '';
    setEditForm({
      unit: groupUnit,
      stockQty: record.stockQty ?? '',
    });
    setShowEdit(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/stock/${editRecord._id}`, {
        unit: editForm.unit,
        stockQty: editForm.stockQty !== '' ? Number(editForm.stockQty) : null,
      });

      // 单位是产品组共享的，同步更新同组其他记录
      const groupKey = editRecord.groupId || editRecord._id;
      const sameGroupRecords = records.filter(r => (r.groupId || r._id) === groupKey && r._id !== editRecord._id);
      if (sameGroupRecords.length > 0) {
        await Promise.all(sameGroupRecords.map(r =>
          api.put(`/stock/${r._id}`, { unit: editForm.unit })
        ));
      }

      toast.success('已保存');
      setShowEdit(false);
      fetchRecords();
    } catch (err) { toast.error(err.msg || '保存失败'); }
    finally { setSaving(false); }
  };

  // ── 导出 Excel（带合并单元格 + 垂直居中）──
  const handleExport = async () => {
    if (filtered.length === 0) { toast.error('暂无数据可导出'); return; }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('库存表');

    // 设置列宽
    ws.columns = [
      { header: '序号', key: 'groupId', width: 12 },
      { header: '品名', key: 'name', width: 40 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '库存数量', key: 'stockQty', width: 12 },
    ];

    // 表头样式
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 按产品组分组
    const groups = [];
    let currentGroup = null;
    for (const r of filtered) {
      const key = r.groupId || r._id;
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { key, groupId: r.groupId || '', unit: r.unit || '', items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(r);
    }

    // 填充数据
    let rowIdx = 2; // 从第2行开始（第1行是表头）
    for (const group of groups) {
      const startRow = rowIdx;
      for (const item of group.items) {
        ws.addRow({
          groupId: group.groupId,
          name: item.name || '',
          unit: group.unit,
          stockQty: item.stockQty != null ? item.stockQty : '',
        });
        // 设置每行垂直居中
        const row = ws.getRow(rowIdx);
        row.alignment = { vertical: 'middle' };
        rowIdx++;
      }
      const endRow = rowIdx - 1;

      // 合并序号列
      if (endRow > startRow) {
        ws.mergeCells(startRow, 1, endRow, 1);
      }
      // 合并单位列
      if (endRow > startRow) {
        ws.mergeCells(startRow, 3, endRow, 3);
      }
    }

    // 合并单元格居中对齐
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', ...cell.alignment };
      });
    });

    // 导出
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `库存表_${currentShop?.name || ''}_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
    toast.success('导出成功');
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
          <h1 className="text-xl font-semibold text-apple-gray-900">库存管理</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">{currentShop?.name} · 共 {filtered.length} 个产品</p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg bg-apple-blue px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97]">
          <ArrowDownTrayIcon className="h-4 w-4" />导出 Excel
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
            placeholder="搜索产品组、品名..."
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
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">序号</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">品名</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-apple-gray-400">单位</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">库存数量</th>
                  <th className="sticky right-0 z-20 whitespace-nowrap bg-apple-gray-50 px-3 py-3 text-center font-medium text-apple-gray-400 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">操作</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rowSpanMap = {};
                  filtered.forEach((r) => {
                    const key = r.groupId || r._id;
                    rowSpanMap[key] = (rowSpanMap[key] || 0) + 1;
                  });
                  const renderedGroups = new Set();

                  return filtered.map((r) => {
                    const groupKey = r.groupId || r._id;
                    const isFirstInGroup = !renderedGroups.has(groupKey);
                    if (isFirstInGroup) renderedGroups.add(groupKey);
                    const span = rowSpanMap[groupKey];

                    return (
                      <tr key={r._id} className="hover:bg-apple-gray-50/50">
                        {/* 序号（产品组）- 合并 */}
                        {isFirstInGroup && (
                          <td rowSpan={span} className="px-3 py-2.5 align-middle text-center">
                            {r.groupId && <span className="inline-block whitespace-nowrap rounded-md bg-apple-blue/10 px-2 py-0.5 text-xs font-semibold text-apple-blue">{r.groupId}</span>}
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-apple-gray-900">{r.name}</td>
                        {/* 单位 - 合并 */}
                        {isFirstInGroup && (
                          <td rowSpan={span} className="px-3 py-2.5 align-middle text-center text-apple-gray-600">
                            {r.unit || <span className="text-apple-gray-300">—</span>}
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-right font-medium text-apple-gray-900">
                          {r.stockQty != null ? r.stockQty : <span className="text-apple-gray-300">—</span>}
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-base font-semibold text-apple-gray-900">编辑库存</h2>
            <p className="mb-4 text-xs text-apple-gray-500">{editRecord.name}</p>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">单位</label>
                  <input type="text" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} placeholder="如：个、条" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">库存数量</label>
                  <input type="number" value={editForm.stockQty} onChange={(e) => setEditForm({ ...editForm, stockQty: e.target.value })} className={inputCls} />
                </div>
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
    </div>
  );
}
