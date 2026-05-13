import { useState, useEffect, useCallback } from 'react';
import { PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormDialog from '../components/ui/FormDialog';
import ListToolbar from '../components/ui/ListToolbar';
import Pagination from '../components/ui/Pagination';

const MARKETPLACES = ['US', 'CA', 'UK', 'DE', 'FR', 'IT', 'ES', 'JP', 'AU', 'IN', 'MX', 'BR', 'SG', 'AE', 'SA', 'NL', 'SE', 'PL', 'BE', 'TR'];

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', marketplace: '', note: '', labelFolder: '' });
  const [adding, setAdding] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', marketplace: '', note: '', labelFolder: '' });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchShops = useCallback(async (p = page, kw = search) => {
    setLoading(true);
    try {
      const res = await api.get('/shop', { params: { keyword: kw, page: p, pageSize } });
      setShops(res.data.shops);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchShops(1, ''); }, []);

  const handleSearch = () => { fetchShops(1, search); };
  const handlePageChange = (p) => { fetchShops(p, search); };
  const reload = () => { fetchShops(page, search); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) { toast.error('Name required'); return; }
    setAdding(true);
    try {
      await api.post('/shop', addForm);
      toast.success('Created');
      setShowAdd(false);
      reload();
      // 通知 Header 刷新店铺列表
      window.dispatchEvent(new Event('shopsUpdated'));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAdding(false); }
  };

  const openAdd = () => { setAddForm({ name: '', marketplace: '', note: '', labelFolder: '' }); setShowAdd(true); };

  const openEdit = (shop) => {
    setEditId(shop._id);
    setEditForm({ name: shop.name, marketplace: shop.marketplace || '', note: shop.note || '', labelFolder: shop.labelFolder || '' });
    setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await api.put(`/shop/${editId}`, editForm);
      toast.success('Updated');
      setShowEdit(false);
      reload();
      // 通知 Header 刷新店铺列表（店铺名可能变了）
      window.dispatchEvent(new Event('shopsUpdated'));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/shop/${deleteTarget._id}`);
      toast.success('Deleted');
      setDeleteTarget(null);
      reload();
      // 通知 Header 刷新店铺列表（会自动处理当前店铺被删的情况）
      window.dispatchEvent(new Event('shopsUpdated'));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setDeleting(false); }
  };

  const inputCls = "w-full rounded-lg border border-apple-gray-200 bg-apple-gray-50 px-3.5 py-2.5 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-all focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20";

  const shopForm = (form, setForm, onSubmit, submitText, submitting, onCancel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">{'\u5E97\u94FA\u540D\u79F0 *'}</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. US Main Store" autoFocus className={inputCls} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">{'\u7AD9\u70B9'}</label>
        <select value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} className={inputCls}>
          <option value="">{'\u4E0D\u9009\u62E9'}</option>
          {MARKETPLACES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">{'\u5907\u6CE8'}</label>
        <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={'\u53EF\u9009'} className={inputCls} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">标签文件夹路径</label>
        <input type="text" value={form.labelFolder || ''} onChange={(e) => setForm({ ...form, labelFolder: e.target.value })} placeholder="如：D:\labels\店铺名" className={inputCls} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">{'\u53D6\u6D88'}</button>
        <button type="submit" disabled={submitting} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-50">{submitting ? '...' : submitText}</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-gray-900">{'\u5E97\u94FA\u7BA1\u7406'}</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">{'\u7BA1\u7406\u4F60\u7684 Amazon \u5E97\u94FA'}</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-apple-blue px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97]">
          <PlusIcon className="h-4 w-4" />{'\u65B0\u589E\u5E97\u94FA'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-apple-gray-200">
        <ListToolbar search={search} onSearchChange={setSearch} onSearch={handleSearch} placeholder={'\u641C\u7D22\u5E97\u94FA\u540D\u79F0\u3001\u7AD9\u70B9...'} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-gray-200 border-t-apple-gray-900" />
          </div>
        ) : shops.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-apple-gray-400">{search ? '\u6CA1\u6709\u5339\u914D\u7684\u5E97\u94FA' : '\u6682\u65E0\u5E97\u94FA'}</p>
            {!search && <button onClick={openAdd} className="mt-3 text-sm font-medium text-apple-blue hover:text-apple-blue-hover">+ {'\u6DFB\u52A0\u7B2C\u4E00\u4E2A\u5E97\u94FA'}</button>}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-100">
                  <th className="py-3 pl-5 pr-3 text-left text-xs font-medium text-apple-gray-400">{'\u5E97\u94FA\u540D\u79F0'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-apple-gray-400">{'\u7AD9\u70B9'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-apple-gray-400">{'\u5907\u6CE8'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-apple-gray-400">{'\u521B\u5EFA\u65F6\u95F4'}</th>
                  <th className="py-3 pl-3 pr-5 text-right text-xs font-medium text-apple-gray-400">{'\u64CD\u4F5C'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-50">
                {shops.map((shop) => (
                  <tr key={shop._id} className="group transition-colors hover:bg-apple-gray-50/50">
                    <td className="py-3.5 pl-5 pr-3"><span className="text-sm font-medium text-apple-gray-900">{shop.name}</span></td>
                    <td className="px-3 py-3.5">
                      {shop.marketplace
                        ? <span className="inline-block rounded-md bg-apple-gray-100 px-2 py-0.5 text-xs font-medium text-apple-gray-700">{shop.marketplace}</span>
                        : <span className="text-sm text-apple-gray-300">{'\u2014'}</span>}
                    </td>
                    <td className="px-3 py-3.5 text-sm text-apple-gray-500">{shop.note || '\u2014'}</td>
                    <td className="px-3 py-3.5 text-sm text-apple-gray-400">{new Date(shop.createdAt).toLocaleString('zh-CN')}</td>
                    <td className="py-3.5 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => openEdit(shop)} className="rounded-lg p-2 text-apple-gray-300 transition-all hover:bg-apple-gray-100 hover:text-apple-blue"><PencilSquareIcon className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(shop)} className="rounded-lg p-2 text-apple-gray-300 transition-all hover:bg-red-50 hover:text-apple-red"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={handlePageChange} />
          </>
        )}
      </div>

      <FormDialog open={showAdd} onClose={() => setShowAdd(false)} title={'\u65B0\u589E\u5E97\u94FA'}>
        {shopForm(addForm, setAddForm, handleAdd, '\u521B\u5EFA', adding, () => setShowAdd(false))}
      </FormDialog>

      <FormDialog open={showEdit} onClose={() => setShowEdit(false)} title={'\u7F16\u8F91\u5E97\u94FA'}>
        {shopForm(editForm, setEditForm, handleSaveEdit, '\u4FDD\u5B58', saving, () => setShowEdit(false))}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={'\u5220\u9664\u5E97\u94FA'}
        message={'\u786E\u5B9A\u8981\u5220\u9664\u5E97\u94FA\u300C' + (deleteTarget?.name || '') + '\u300D\u5417\uFF1F'}
        confirmText={'\u5220\u9664'}
        danger
        loading={deleting}
      />
    </div>
  );
}
