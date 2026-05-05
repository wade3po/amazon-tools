import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PencilSquareIcon, TrashIcon, PlusIcon, ArrowUpTrayIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormDialog from '../components/ui/FormDialog';
import Pagination from '../components/ui/Pagination';
import { useCurrentShop } from '../hooks/useCurrentShop';
import * as XLSX from 'xlsx';

// ── 空表单 ──
const EMPTY_FORM = {
  groupId: '', sku: '', name: '', fnsku: '',
  price: '', cost: '', costRate: '', shippingCost: '', shippingRate: '',
  fbaFee: '', fbaRate: '', amazonLogisticsFee: '', commissionRate: '', vatRate: '',
  grossProfit: '', grossProfitRate: '', roi: '', suggestedPrice: '', netProfit: '',
  weight: '', purchaseQty: '', totalWeight: '', estimatedInvestment: '', estimatedRevenue: '',
  labelName: '', labelLink: '', labelPageName: '',
  packageSize: '', packageType: '', purchaseLink: '', note: '',
};

const inputCls = 'w-full rounded-lg border border-apple-gray-200 bg-apple-gray-50 px-3 py-2 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-all focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20';
const labelCls = 'mb-1 block text-xs font-medium text-apple-gray-600';

function n(v) {
  if (v === '' || v === null || v === undefined) return null;
  const num = Number(String(v).replace(/[¥$£€,%]/g, '').trim());
  return isNaN(num) ? null : num;
}

// ── Excel 列映射（按实际表头精确匹配）──
function parseExcelRow(row, groupId) {
  // 精确取值，同时支持去除首尾空格后匹配
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    }
    return '';
  };

  return {
    groupId:            String(groupId || get('序号') || '').trim(),
    sku:                String(get('SKU 编码') || '').trim(),
    name:               String(get('品名') || '').trim(),
    fnsku:              String(get('FNSKU') || '').trim(),
    price:              n(get('销售价')),
    cost:               n(get('(采购)\n成本', '(采购) \n成本')),
    costRate:           n(get('成本占比')),
    shippingCost:       n(get('(头程)\n运费', '(头程) \n运费')),
    shippingRate:       n(get('运费占比')),
    fbaFee:             n(get('FBA费用')),
    fbaRate:            n(get('FBA占比')),
    amazonLogisticsFee: n(get('其中亚马逊物流费')),
    commissionRate:     n(get('销售佣金占比')),
    vatRate:            n(get('增值税税率')),
    grossProfit:        n(get('毛利（未除广告）', '毛利(未除广告)')),
    grossProfitRate:    n(get('毛利占比')),
    roi:                n(get('投入产出比')),
    suggestedPrice:     n(get('20%毛利率售价')),
    netProfit:          n(get('净利润')),
    weight:             n(get('重量/g')),
    purchaseQty:        n(get('采购件数')),
    labelName:          String(get('标签名') || '').trim(),
    labelLink:          String(get('标签') || '').trim(),
    labelPageName:      String(get('中文标签') || '').trim(),
    totalWeight:        n(get('总重/kg')),
    estimatedInvestment: n(get('预计投入')),
    estimatedRevenue:   n(get('预计收益')),
    packageSize:        String(get('包装后尺寸') || '').trim(),
    packageType:        String(get('包装袋类型') || '').trim(),
    purchaseLink:       String(get('1688采购链接') || '').trim(),
    note:               String(get('备注') || '').trim(),
  };
}

// ── 表格列定义 ──
const COLUMNS = [
  { key: 'groupId',             label: '产品组',      width: 90,  align: 'left' },
  { key: 'sku',                 label: 'SKU',         width: 120, align: 'left' },
  { key: 'name',                label: '品名',        width: 280, align: 'left' },
  { key: 'fnsku',               label: 'FNSKU',       width: 130, align: 'left' },
  { key: 'price',               label: '销售价',      width: 80,  align: 'right', prefix: '$' },
  { key: 'cost',                label: '采购成本',    width: 80,  align: 'right', prefix: '¥' },
  { key: 'costRate',            label: '成本占比',    width: 75,  align: 'right', suffix: '%' },
  { key: 'shippingCost',        label: '头程运费',    width: 80,  align: 'right', prefix: '¥' },
  { key: 'shippingRate',        label: '运费占比',    width: 75,  align: 'right', suffix: '%' },
  { key: 'fbaFee',              label: 'FBA费用',     width: 80,  align: 'right', prefix: '$' },
  { key: 'fbaRate',             label: 'FBA占比',     width: 75,  align: 'right', suffix: '%' },
  { key: 'amazonLogisticsFee',  label: '亚马逊物流费', width: 95, align: 'right', prefix: '$' },
  { key: 'commissionRate',      label: '佣金占比',    width: 75,  align: 'right', suffix: '%' },
  { key: 'vatRate',             label: '增值税',      width: 70,  align: 'right', suffix: '%' },
  { key: 'grossProfit',         label: '毛利',        width: 80,  align: 'right', prefix: '$' },
  { key: 'grossProfitRate',     label: '毛利占比',    width: 75,  align: 'right', suffix: '%' },
  { key: 'roi',                 label: '投入产出比',  width: 80,  align: 'right' },
  { key: 'suggestedPrice',      label: '20%毛利售价', width: 90,  align: 'right', prefix: '$' },
  { key: 'netProfit',           label: '净利润',      width: 80,  align: 'right', prefix: '¥', colored: true },
  { key: 'weight',              label: '重量/g',      width: 70,  align: 'right' },
  { key: 'purchaseQty',         label: '采购件数',    width: 75,  align: 'right' },
  { key: 'totalWeight',         label: '总重/kg',     width: 75,  align: 'right' },
  { key: 'estimatedInvestment', label: '预计投入',    width: 80,  align: 'right', prefix: '¥' },
  { key: 'estimatedRevenue',    label: '预计收益',    width: 80,  align: 'right', prefix: '¥' },
  { key: 'labelName',           label: '标签名',      width: 160, align: 'left' },
  { key: 'labelPageName',       label: '中文标签',    width: 160, align: 'left' },
  { key: 'packageSize',         label: '包装尺寸',    width: 100, align: 'left' },
  { key: 'packageType',         label: '包装袋类型',  width: 100, align: 'left' },
];

function CellValue({ col, value }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-apple-gray-300">—</span>;
  }
  if (col.colored && typeof value === 'number') {
    return (
      <span className={value > 0 ? 'text-green-600 font-medium' : value < 0 ? 'text-red-500 font-medium' : ''}>
        {col.prefix || ''}{value}{col.suffix || ''}
      </span>
    );
  }
  return <span>{col.prefix || ''}{value}{col.suffix || ''}</span>;
}

// ── Product Form ──
function ProductForm({ form, setForm, onSubmit, submitText, submitting, onCancel }) {
  const f = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className={labelCls}>{label}</label>
      <input type={type} value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className={inputCls} />
    </div>
  );
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-0">
      {/* 滚动内容区 */}
      <div className="space-y-4 text-sm">
        {/* 基本 */}
        <div className="grid grid-cols-2 gap-3">
          {f('产品组号', 'groupId', 'text', 'JAO-1')}
          {f('SKU 编码 *', 'sku', 'text', 'JAO-1-1')}
        </div>
        <div>{f('品名 *', 'name', 'text', '产品名称')}</div>
        {f('FNSKU', 'fnsku', 'text', 'X0050SCKO7')}

        {/* 价格 */}
        <p className="border-t border-apple-gray-100 pt-3 text-xs font-semibold text-apple-gray-500">价格与成本</p>
        <div className="grid grid-cols-3 gap-3">
          {f('销售价 ($)', 'price', 'number')}
          {f('采购成本 (¥)', 'cost', 'number')}
          {f('成本占比 %', 'costRate', 'number')}
          {f('头程运费 (¥)', 'shippingCost', 'number')}
          {f('运费占比 %', 'shippingRate', 'number')}
          {f('FBA费用 ($)', 'fbaFee', 'number')}
          {f('FBA占比 %', 'fbaRate', 'number')}
          {f('亚马逊物流费 ($)', 'amazonLogisticsFee', 'number')}
          {f('销售佣金占比 %', 'commissionRate', 'number')}
          {f('增值税税率 %', 'vatRate', 'number')}
        </div>

        {/* 利润 */}
        <p className="border-t border-apple-gray-100 pt-3 text-xs font-semibold text-apple-gray-500">利润</p>
        <div className="grid grid-cols-3 gap-3">
          {f('毛利 ($)', 'grossProfit', 'number')}
          {f('毛利占比 %', 'grossProfitRate', 'number')}
          {f('投入产出比', 'roi', 'number')}
          {f('20%毛利率售价 ($)', 'suggestedPrice', 'number')}
          {f('净利润 (¥)', 'netProfit', 'number')}
        </div>

        {/* 物流 */}
        <p className="border-t border-apple-gray-100 pt-3 text-xs font-semibold text-apple-gray-500">物流与采购</p>
        <div className="grid grid-cols-3 gap-3">
          {f('重量 (g)', 'weight', 'number')}
          {f('采购件数', 'purchaseQty', 'number')}
          {f('总重 (kg)', 'totalWeight', 'number')}
          {f('预计投入 (¥)', 'estimatedInvestment', 'number')}
          {f('预计收益 (¥)', 'estimatedRevenue', 'number')}
        </div>

        {/* 标签包装 */}
        <p className="border-t border-apple-gray-100 pt-3 text-xs font-semibold text-apple-gray-500">标签与包装</p>
        <div className="grid grid-cols-2 gap-3">
          {f('标签名', 'labelName')}
          {f('中文标签', 'labelPageName')}
          {f('包装尺寸', 'packageSize', 'text', '15*15*4.2')}
          {f('包装袋类型', 'packageType', 'text', '自粘15*21')}
        </div>

        {/* 其他 */}
        <p className="border-t border-apple-gray-100 pt-3 text-xs font-semibold text-apple-gray-500">其他</p>
        <div>
          <label className={labelCls}>1688 采购链接</label>
          <input type="url" value={form.purchaseLink ?? ''} onChange={(e) => setForm({ ...form, purchaseLink: e.target.value })} placeholder="https://..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>备注</label>
          <textarea value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} className={inputCls} />
        </div>
      </div>

      {/* 固定底部按钮 */}
      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-apple-gray-100 bg-white pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">取消</button>
        <button type="submit" disabled={submitting} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50">
          {submitting ? '保存中...' : submitText}
        </button>
      </div>
    </form>
  );
}

// ── Import Dialog ──
function ImportDialog({ open, onClose, shopId, onSuccess }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });

        // 找第一个包含 SKU 的 sheet
        let targetSheet = null;
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (raw.slice(0, 10).some((row) => row.some((c) => String(c).includes('SKU')))) {
            targetSheet = ws;
            break;
          }
        }
        if (!targetSheet) { toast.error('未找到包含 SKU 的工作表'); return; }

        const rawData = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });

        // 找表头行
        let headerIdx = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          if (rawData[i].some((c) => String(c).includes('SKU'))) { headerIdx = i; break; }
        }

        // 处理合并单元格 → 序号列补全
        const merges = targetSheet['!merges'] || [];
        const groupMap = {};
        for (const m of merges) {
          if (m.s.c <= 1) {
            const addr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
            const val = targetSheet[addr]?.v;
            if (val) {
              for (let r = m.s.r; r <= m.e.r; r++) groupMap[r] = String(val).trim();
            }
          }
        }

        const headers = rawData[headerIdx].map((h) => String(h).trim());
        console.log('[import] headers:', headers);
        console.log('[import] headerIdx:', headerIdx, 'total rows:', rawData.length);
        const parsed = [];

        for (let i = headerIdx + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (row.every((c) => c === '' || c === null)) continue;
          const obj = {};
          headers.forEach((h, idx) => { obj[h] = row[idx]; });
          const gid = groupMap[i] || obj['序号'] || '';
          const p = parseExcelRow(obj, gid);
          // SKU 或 FNSKU 有值就导入
          if (!p.sku && !p.fnsku) continue;
          // SKU 是必填，如果只有 FNSKU 没有 SKU，用 FNSKU 作为 SKU
          if (!p.sku && p.fnsku) p.sku = p.fnsku;
          parsed.push(p);
        }

        setRows(parsed);
        toast.success(`解析到 ${parsed.length} 条数据`);
      } catch (err) {
        toast.error('解析失败：' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    try {
      const batchSize = 50;
      let hasError = false;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        try {
          await api.post('/product/batch', { shopId, products: batch });
        } catch (e) {
          console.warn(`批次 ${i}-${i + batchSize} 失败:`, e.message);
          hasError = true;
        }
      }
      if (hasError) {
        toast.success('导入完成（部分批次有警告，数据已尽量保存）');
      } else {
        toast.success('导入成功');
      }
      onSuccess();
      onClose();
      setRows([]);
      setFileName('');
    } catch (err) {
      toast.error(err.msg || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-apple-gray-900">批量导入产品</h2>
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-apple-gray-200 bg-apple-gray-50 py-10 transition-colors hover:border-apple-blue hover:bg-apple-blue/5"
          onClick={() => fileRef.current?.click()}
        >
          <ArrowUpTrayIcon className="mb-2 h-8 w-8 text-apple-gray-300" />
          <p className="text-sm font-medium text-apple-gray-600">{fileName || '点击选择 Excel 文件'}</p>
          <p className="mt-1 text-xs text-apple-gray-400">支持 .xlsx / .xls，自动识别表头和合并单元格序号</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>

        {rows.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-apple-gray-100">
            <div className="flex items-center justify-between bg-apple-gray-50 px-4 py-2">
              <span className="text-xs font-medium text-apple-gray-600">预览（前 5 条）</span>
              <span className="text-xs text-apple-gray-400">共 {rows.length} 条</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-apple-gray-100">
                    {['产品组', 'SKU', '品名', 'FNSKU', '销售价', '采购成本', '净利润', '重量/g'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-apple-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-gray-50">
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-apple-gray-500">{r.groupId}</td>
                      <td className="px-3 py-2 font-medium text-apple-gray-900">{r.sku}</td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-apple-gray-700">{r.name}</td>
                      <td className="px-3 py-2 text-apple-gray-500">{r.fnsku}</td>
                      <td className="px-3 py-2">{r.price != null ? `$${r.price}` : '—'}</td>
                      <td className="px-3 py-2">{r.cost != null ? `¥${r.cost}` : '—'}</td>
                      <td className="px-3 py-2">{r.netProfit != null ? `¥${r.netProfit}` : '—'}</td>
                      <td className="px-3 py-2">{r.weight ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => { onClose(); setRows([]); setFileName(''); }} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">取消</button>
          <button onClick={handleImport} disabled={!rows.length || importing} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover disabled:opacity-50">
            {importing ? '导入中...' : `导入 ${rows.length} 条`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function ProductsPage() {
  const { currentShop } = useCurrentShop();
  const shopId = currentShop?._id;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [adding, setAdding] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchProducts = useCallback(async (p = 1, kw = '') => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await api.get('/product', { params: { shopId, keyword: kw, page: 1, pageSize: 9999 } });
      setProducts(res.data.products);
      setTotal(res.data.total);
      setTotalPages(1);
      setPage(1);
    } catch { toast.error('加载失败'); }
    finally { setLoading(false); }
  }, [shopId]);

  useEffect(() => { if (shopId) fetchProducts(1, ''); }, [shopId]);

  const reload = () => fetchProducts(page, search);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.sku.trim()) { toast.error('SKU 必填'); return; }
    if (!addForm.name.trim()) { toast.error('品名必填'); return; }
    setAdding(true);
    try {
      await api.post('/product', { ...addForm, shopId });
      toast.success('已新增');
      setShowAdd(false);
      fetchProducts(1, search);
    } catch (err) { toast.error(err.msg || '新增失败'); }
    finally { setAdding(false); }
  };

  const openEdit = (p) => {
    setEditId(p._id);
    const f = { ...EMPTY_FORM };
    Object.keys(EMPTY_FORM).forEach((k) => { f[k] = p[k] ?? ''; });
    setEditForm(f);
    setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.sku.trim()) { toast.error('SKU 必填'); return; }
    setSaving(true);
    try {
      await api.put(`/product/${editId}`, editForm);
      toast.success('已保存');
      setShowEdit(false);
      reload();
    } catch (err) { toast.error(err.msg || '保存失败'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/product/${deleteTarget._id}`);
      toast.success('已删除');
      setDeleteTarget(null);
      reload();
    } catch (err) { toast.error(err.msg || '删除失败'); }
    finally { setDeleting(false); }
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
          <h1 className="text-xl font-semibold text-apple-gray-900">产品管理</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">{currentShop?.name} · 共 {total} 个产品</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-apple-gray-200 px-3.5 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">
            <ArrowUpTrayIcon className="h-4 w-4" />批量导入
          </button>
          <button onClick={() => { setAddForm({ ...EMPTY_FORM }); setShowAdd(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-apple-blue px-3.5 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover active:scale-[0.97]">
            <PlusIcon className="h-4 w-4" />新增产品
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-apple-gray-400" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProducts(1, search)}
            placeholder="搜索 SKU、品名、FNSKU..."
            className="w-full rounded-lg border border-apple-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-apple-gray-400 focus:border-apple-blue focus:outline-none focus:ring-2 focus:ring-apple-blue/20"
          />
        </div>
        <button onClick={() => fetchProducts(1, search)} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover">搜索</button>
      </div>

      {/* Table — 横向可滚动 */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-apple-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-gray-200 border-t-apple-gray-900" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-apple-gray-400">{search ? '没有匹配的产品' : '暂无产品，点击新增或批量导入'}</p>
          </div>
        ) : (
          <>
            {/* 横向滚动容器 */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: COLUMNS.reduce((s, c) => s + c.width, 0) + 80 }}>
                <thead>
                  <tr className="border-b border-apple-gray-100 bg-apple-gray-50/80">
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        style={{ minWidth: col.width, width: col.width }}
                        className={`whitespace-nowrap px-3 py-3 font-medium text-apple-gray-400 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.key === 'groupId' ? 'pl-5' : ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="sticky right-0 bg-apple-gray-50/80 px-3 py-3 text-right font-medium text-apple-gray-400 shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-apple-gray-50">
                  {(() => {
                    // 预计算每个产品组的 rowSpan
                    const rowSpanMap = {};
                    products.forEach((p) => {
                      const key = p.groupId || p._id;
                      rowSpanMap[key] = (rowSpanMap[key] || 0) + 1;
                    });
                    const renderedGroups = new Set();

                    return products.map((p, rowIdx) => {
                      const groupKey = p.groupId || p._id;
                      const isFirstInGroup = !renderedGroups.has(groupKey);
                      if (isFirstInGroup) renderedGroups.add(groupKey);
                      const span = rowSpanMap[groupKey];

                      return (
                        <tr
                          key={p._id}
                          className={`group transition-colors hover:bg-apple-gray-50/50 ${isFirstInGroup && rowIdx > 0 ? 'border-t-2 border-apple-gray-200' : ''}`}
                        >
                          {/* 产品组列：只在第一行渲染，用 rowSpan 合并 */}
                          {isFirstInGroup && (
                            <td
                              rowSpan={span}
                              style={{ minWidth: 90, width: 90 }}
                              className="border-r border-apple-gray-100 pl-5 pr-3 align-middle"
                            >
                              {p.groupId ? (
                                <span className="inline-block rounded-md bg-apple-blue/10 px-2 py-1 text-xs font-semibold text-apple-blue text-center leading-tight">
                                  {p.groupId}
                                </span>
                              ) : null}
                            </td>
                          )}

                          {/* 其他列 */}
                          {COLUMNS.filter((c) => c.key !== 'groupId').map((col) => (
                            <td
                              key={col.key}
                              style={{ minWidth: col.width, width: col.width }}
                              className={`px-3 py-2.5 text-apple-gray-700 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                            >
                              {col.key === 'sku' ? (
                                <span className="font-medium text-apple-gray-900">{p.sku}</span>
                              ) : col.key === 'name' ? (
                                <span
                                  className="block truncate"
                                  style={{ maxWidth: col.width - 24 }}
                                  title={p.name}
                                >
                                  {p.name}
                                </span>
                              ) : (
                                <CellValue col={col} value={p[col.key]} />
                              )}
                            </td>
                          ))}

                          {/* 操作列 sticky */}
                          <td className="sticky right-0 bg-white px-3 py-2.5 shadow-[-4px_0_8px_rgba(0,0,0,0.04)] group-hover:bg-apple-gray-50/50">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-apple-gray-300 hover:bg-apple-gray-100 hover:text-apple-blue">
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteTarget(p)} className="rounded-lg p-1.5 text-apple-gray-300 hover:bg-red-50 hover:text-apple-red">
                                <TrashIcon className="h-4 w-4" />
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
            {/* 数据总数提示 */}
            <div className="border-t border-apple-gray-100 px-5 py-3 text-xs text-apple-gray-400">
              共 {total} 个产品
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <FormDialog open={showAdd} onClose={() => setShowAdd(false)} title="新增产品" tall maxWidth="max-w-2xl">
        <ProductForm form={addForm} setForm={setAddForm} onSubmit={handleAdd} submitText="创建" submitting={adding} onCancel={() => setShowAdd(false)} />
      </FormDialog>
      <FormDialog open={showEdit} onClose={() => setShowEdit(false)} title="编辑产品" tall maxWidth="max-w-2xl">
        <ProductForm form={editForm} setForm={setEditForm} onSubmit={handleSaveEdit} submitText="保存" submitting={saving} onCancel={() => setShowEdit(false)} />
      </FormDialog>
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="删除产品" message={`确定要删除 "${deleteTarget?.sku}" 吗？`}
        confirmText="删除" danger loading={deleting}
      />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} shopId={shopId} onSuccess={() => fetchProducts(1, search)} />
    </div>
  );
}
