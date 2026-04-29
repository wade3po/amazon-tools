import { useState, useEffect, useCallback } from 'react';
import { PencilSquareIcon, TrashIcon, PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormDialog from '../components/ui/FormDialog';
import ListToolbar from '../components/ui/ListToolbar';
import Pagination from '../components/ui/Pagination';

export default function AccountsPage() {
  const { user: currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAccounts = useCallback(async (p = page, kw = search) => {
    setLoading(true);
    try {
      const res = await api.get('/account', { params: { keyword: kw, page: p, pageSize } });
      setAccounts(res.data.accounts);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchAccounts(1, ''); }, []);

  const handleSearch = () => { fetchAccounts(1, search); };
  const handlePageChange = (p) => { fetchAccounts(p, search); };
  const reload = () => { fetchAccounts(page, search); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) { toast.error('Please fill all fields'); return; }
    setAdding(true);
    try {
      await api.post('/account', { username: newUsername.trim(), password: newPassword.trim() });
      toast.success('Created');
      setShowAdd(false);
      reload();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setAdding(false); }
  };

  const openAdd = () => { setNewUsername(''); setNewPassword(''); setShowNewPwd(false); setShowAdd(true); };

  const openEdit = (account) => {
    setEditId(account.id); setEditUsername(account.username); setEditPassword(''); setShowEditPwd(false); setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUsername.trim()) { toast.error('Username required'); return; }
    setSaving(true);
    try {
      const body = { username: editUsername.trim() };
      if (editPassword.trim()) body.password = editPassword.trim();
      await api.put(`/account/${editId}`, body);
      toast.success('Updated');
      setShowEdit(false);
      reload();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/account/${deleteTarget.id}`);
      toast.success('Deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setDeleting(false); }
  };

  const inputCls = "w-full rounded-lg border border-apple-gray-200 bg-apple-gray-50 px-3.5 py-2.5 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-all focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-gray-900">{'\u8D26\u53F7\u7BA1\u7406'}</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">{'\u7BA1\u7406\u7CFB\u7EDF\u767B\u5F55\u8D26\u53F7'}</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-apple-blue px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97]">
          <PlusIcon className="h-4 w-4" />{'\u65B0\u589E\u8D26\u53F7'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-apple-gray-200">
        <ListToolbar search={search} onSearchChange={setSearch} onSearch={handleSearch} placeholder={'\u641C\u7D22\u8D26\u53F7...'} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-gray-200 border-t-apple-gray-900" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-sm text-apple-gray-400">
            {search ? '\u6CA1\u6709\u5339\u914D\u7684\u8D26\u53F7' : '\u6682\u65E0\u8D26\u53F7'}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-100">
                  <th className="py-3 pl-5 pr-3 text-left text-xs font-medium text-apple-gray-400">{'\u8D26\u53F7'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-apple-gray-400">{'\u521B\u5EFA\u65F6\u95F4'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-apple-gray-400">{'\u66F4\u65B0\u65F6\u95F4'}</th>
                  <th className="py-3 pl-3 pr-5 text-right text-xs font-medium text-apple-gray-400">{'\u64CD\u4F5C'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-50">
                {accounts.map((account) => {
                  const isSelf = account.id === currentUser?.id;
                  return (
                    <tr key={account.id} className="group transition-colors hover:bg-apple-gray-50/50">
                      <td className="py-3.5 pl-5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-apple-gray-600 to-apple-gray-900 text-xs font-semibold text-white">
                            {account.username.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-apple-gray-900">{account.username}</span>
                            {isSelf && <span className="ml-2 rounded bg-apple-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-apple-blue">{'\u5F53\u524D\u767B\u5F55'}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-apple-gray-400">{new Date(account.createdAt).toLocaleString('zh-CN')}</td>
                      <td className="px-3 py-3.5 text-sm text-apple-gray-400">{new Date(account.updatedAt).toLocaleString('zh-CN')}</td>
                      <td className="py-3.5 pl-3 pr-5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => openEdit(account)} className="rounded-lg p-2 text-apple-gray-300 transition-all hover:bg-apple-gray-100 hover:text-apple-blue">
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          {!isSelf && (
                            <button onClick={() => setDeleteTarget(account)} className="rounded-lg p-2 text-apple-gray-300 transition-all hover:bg-red-50 hover:text-apple-red">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={handlePageChange} />
          </>
        )}
      </div>

      <FormDialog open={showAdd} onClose={() => setShowAdd(false)} title={'\u65B0\u589E\u8D26\u53F7'}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">{'\u8D26\u53F7'}</label>
            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder={'\u8F93\u5165\u8D26\u53F7'} autoFocus className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">{'\u5BC6\u7801'}</label>
            <div className="relative">
              <input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={'\u8F93\u5165\u5BC6\u7801'} className={inputCls + " pr-10"} />
              <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-400 hover:text-apple-gray-600">
                {showNewPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">{'\u53D6\u6D88'}</button>
            <button type="submit" disabled={adding} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-50">{adding ? '...' : '\u521B\u5EFA'}</button>
          </div>
        </form>
      </FormDialog>

      <FormDialog open={showEdit} onClose={() => setShowEdit(false)} title={'\u7F16\u8F91\u8D26\u53F7'}>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">{'\u8D26\u53F7'}</label>
            <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">{'\u65B0\u5BC6\u7801'}</label>
            <div className="relative">
              <input type={showEditPwd ? 'text' : 'password'} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder={'\u7559\u7A7A\u5219\u4E0D\u4FEE\u6539'} className={inputCls + " pr-10"} />
              <button type="button" onClick={() => setShowEditPwd(!showEditPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-400 hover:text-apple-gray-600">
                {showEditPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-apple-gray-400">{'\u4E0D\u586B\u5199\u5219\u4FDD\u6301\u539F\u5BC6\u7801'}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 hover:bg-apple-gray-50">{'\u53D6\u6D88'}</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-50">{saving ? '...' : '\u4FDD\u5B58'}</button>
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={'\u5220\u9664\u8D26\u53F7'}
        message={'\u786E\u5B9A\u8981\u5220\u9664\u8D26\u53F7\u300C' + (deleteTarget?.username || '') + '\u300D\u5417\uFF1F'}
        confirmText={'\u5220\u9664'}
        danger
        loading={deleting}
      />
    </div>
  );
}
