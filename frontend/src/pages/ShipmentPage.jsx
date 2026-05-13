import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, PencilSquareIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useCurrentShop } from '../hooks/useCurrentShop';
import ConfirmDialog from '../components/ui/ConfirmDialog';
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

// ── 打印中文标签 ──
async function printChineseLabel(product) {
  const { name, fnsku, packageType } = product;
  if (window.electronAPI?.generateAndOpenChineseLabel) {
    await window.electronAPI.generateAndOpenChineseLabel({ name, fnsku, packageType });
  } else {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>中文标签 - ${name || fnsku}</title>
<style>@page{size:50mm 30mm;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:50mm;height:30mm;overflow:hidden}body{font-family:"Microsoft YaHei","SimHei","PingFang SC",sans-serif;padding:2mm 3mm;display:flex;flex-direction:column;justify-content:center;gap:1mm}.line{font-size:7pt;line-height:1.3;word-break:break-all}.line-name{font-size:8pt;font-weight:bold}</style>
</head><body>
<div class="line line-name">品名：${name || '—'}</div>
<div class="line">FNSKU：${fnsku || '—'}</div>
<div class="line">包装袋类型：${packageType || '—'}</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  }
}

// ── 打开英文标签 PDF ──
async function openLabelPdf(product, labelFolder) {
  if (!labelFolder) { alert('请先配置标签文件夹路径'); return; }
  if (!window.electronAPI?.openFile) { alert('此功能仅在桌面端可用'); return; }
  const sku = product.sku || '';
  const name = product.name || '';
  let fileName = sku;
  if (name) fileName += '-' + name;
  fileName = fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim();
  if (fileName.length > 80) fileName = fileName.substring(0, 80).trim();
  fileName += '.pdf';
  const filePath = labelFolder.replace(/[/\\]$/, '') + '\\' + fileName;
  const result = await window.electronAPI.openFile(filePath);
  if (result && !result.success) {
    alert(`文件未找到：\n${filePath}`);
  }
}

const inputCls = 'w-full rounded-lg bg-apple-gray-50 px-3 py-2 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20';

export default function ShipmentPage() {
  const { currentShop } = useCurrentShop();
  const shopId = currentShop?._id;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [onlyWithQty, setOnlyWithQty] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await api.get('/shipment', { params: { shopId } });
      setRecords(res.data.records || []);
    } catch { toast.error('加载失败'); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { if (shopId) fetchRecords(); }, [shopId, fetchRecords]);

  const filtered = records
    .filter(r => {
      if (onlyWithQty && (r.purchaseQty == null || r.purchaseQty === 0)) return false;
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

  const calcTotalWeight = (weight, purchaseQty) => {
    if (weight == null || purchaseQty == null) return null;
    return Math.round(weight * purchaseQty / 1000 * 1000) / 1000;
  };

  const openEdit = (record) => {
    setEditRecord(record);
    setEditForm({
      purchaseQty: record.purchaseQty ?? '',
      boxQty: record.boxQty ?? '',
    });
    setShowEdit(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/shipment/${editRecord._id}`, {
        purchaseQty: editForm.purchaseQty !== '' ? Number(editForm.purchaseQty) : null,
        boxQty: editForm.boxQty !== '' ? Number(editForm.boxQty) : null,
      });
      toast.success('已保存');
      setShowEdit(false);
      fetchRecords();
    } catch (err) { toast.error(err.msg || '保存失败'); }
    finally { setSaving(false); }
  };

  // 清除所有采购件数和单箱数量
  const handleClearAll = async () => {
    setClearing(true);
    try {
      const withQty = records.filter(r => (r.purchaseQty != null && r.purchaseQty !== 0) || (r.boxQty != null && r.boxQty !== 0));
      await Promise.all(withQty.map(r => api.put(`/shipment/${r._id}`, { purchaseQty: null, boxQty: null })));
      toast.success(`已清除 ${withQty.length} 条数据`);
      setShowClearConfirm(false);
      fetchRecords();
    } catch (err) { toast.error(err.msg || '清除失败'); }
    finally { setClearing(false); }
  };

  // 导出（只导出采购件数有值的）
  const handleExport = async () => {
    const exportData = records
      .filter(r => r.purchaseQty != null && r.purchaseQty !== 0)
      .sort((a, b) => {
        const g = naturalCompare(a.groupId || '', b.groupId || '');
        if (g !== 0) return g;
        return naturalCompare(a.sku || '', b.sku || '');
      });

    if (exportData.length === 0) { toast.error('没有采购件数有值的数据可导出'); return; }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('发货清单');

    ws.columns = [
      { header: 'SKU 编码', key: 'sku', width: 15 },
      { header: '品名', key: 'name', width: 40 },
      { header: 'FNSKU', key: 'fnsku', width: 16 },
      { header: '重量/g', key: 'weight', width: 10 },
      { header: '采购件数', key: 'purchaseQty', width: 10 },
      { header: '总重/Kg', key: 'totalWeight', width: 10 },
      { header: '单箱数量', key: 'boxQty', width: 10 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    for (const r of exportData) {
      const tw = calcTotalWeight(r.weight, r.purchaseQty);
      ws.addRow({
        sku: r.sku || '',
        name: r.name || '',
        fnsku: r.fnsku || '',
        weight: r.weight != null ? r.weight : '',
        purchaseQty: r.purchaseQty,
        totalWeight: tw != null ? tw : '',
        boxQty: r.boxQty != null ? r.boxQty : '',
      });
    }

    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `发货清单_${currentShop?.name || ''}_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
    toast.success(`导出成功，共 ${exportData.length} 条`);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-gray-900">发货清单</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">{currentShop?.name} · 共 {filtered.length} 个产品</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowClearConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-apple-gray-200 px-3 py-2 text-sm font-medium text-apple-gray-700 transition-all hover:bg-red-50 hover:text-apple-red hover:border-apple-red">
            <TrashIcon className="h-4 w-4" />清除采购件数
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg bg-apple-blue px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97]">
            <ArrowDownTrayIcon className="h-4 w-4" />导出 Excel
          </button>
        </div>
      </div>

      {/* Search + Filter */}
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
        <label className="flex items-center gap-1.5 rounded-lg border border-apple-gray-200 bg-white px-3 py-2 text-sm text-apple-gray-700 cursor-pointer hover:bg-apple-gray-50">
          <input type="checkbox" checked={onlyWithQty} onChange={(e) => setOnlyWithQty(e.target.checked)} className="rounded" />
          仅显示有采购件数
        </label>
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
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">SKU 编码</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">品名</th>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-medium text-apple-gray-400">FNSKU</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">重量/g</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">采购件数</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">总重/Kg</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium text-apple-gray-400">单箱数量</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-apple-gray-400">标签</th>
                  <th className="whitespace-nowrap px-3 py-3 text-center font-medium text-apple-gray-400">中文标签</th>
                  <th className="sticky right-0 z-20 whitespace-nowrap bg-apple-gray-50 px-3 py-3 text-center font-medium text-apple-gray-400 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const tw = calcTotalWeight(r.weight, r.purchaseQty);
                  return (
                    <tr key={r._id} className="hover:bg-apple-gray-50/50">
                      <td className="px-3 py-2.5 font-medium text-apple-gray-900">{r.sku}</td>
                      <td className="px-3 py-2.5 text-apple-gray-700 max-w-[250px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-2.5 text-apple-gray-500">{r.fnsku || <span className="text-apple-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-right text-apple-gray-600">{r.weight != null ? r.weight : <span className="text-apple-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-apple-gray-900">{r.purchaseQty != null ? r.purchaseQty : <span className="text-apple-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-apple-blue">{tw != null ? tw.toFixed(3) : <span className="text-apple-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-right text-apple-gray-600">{r.boxQty != null ? r.boxQty : <span className="text-apple-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => openLabelPdf(r, currentShop?.labelFolder)}
                          className="whitespace-nowrap rounded-md bg-apple-blue/10 px-2 py-0.5 text-xs font-medium text-apple-blue hover:bg-apple-blue/20"
                        >
                          打开
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => printChineseLabel(r)}
                          className="whitespace-nowrap rounded-md bg-apple-blue/10 px-2 py-0.5 text-xs font-medium text-apple-blue hover:bg-apple-blue/20"
                        >
                          打开
                        </button>
                      </td>
                      <td className="sticky right-0 z-10 bg-white px-3 py-2.5 text-center shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                        <button onClick={() => openEdit(r)} title="编辑" className="rounded-lg p-1.5 text-apple-gray-300 hover:bg-apple-gray-100 hover:text-apple-blue">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showEdit && editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-base font-semibold text-apple-gray-900">编辑发货信息</h2>
            <p className="mb-4 text-xs text-apple-gray-500">{editRecord.sku} - {editRecord.name}</p>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">采购件数</label>
                  <input type="number" value={editForm.purchaseQty} onChange={(e) => setEditForm({ ...editForm, purchaseQty: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-apple-gray-600">单箱数量</label>
                  <input type="number" value={editForm.boxQty} onChange={(e) => setEditForm({ ...editForm, boxQty: e.target.value })} className={inputCls} />
                </div>
              </div>
              {editForm.purchaseQty && editRecord.weight != null && (
                <p className="text-xs text-apple-gray-500">
                  总重/Kg：<span className="font-medium text-apple-blue">{(editRecord.weight * Number(editForm.purchaseQty) / 1000).toFixed(3)}</span>
                </p>
              )}
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

      {/* 清除确认弹窗 */}
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="清除所有数据"
        message="确定要清除所有产品的采购件数和单箱数量吗？此操作不可撤销。"
        confirmText="清除"
        danger
        loading={clearing}
      />
    </div>
  );
}
