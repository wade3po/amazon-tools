import { useState, useEffect, useCallback } from 'react';
import { PencilSquareIcon, TrashIcon, PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormDialog from '../components/ui/FormDialog';

export default function AccountsPage() {
  const { user: currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 新增弹窗
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [adding, setAdding] = useState(false);

  // 编辑弹窗
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/account');
      setAccounts(res.data.accounts);
    } catch {
      toast.error('获取账号列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // 新增
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) { toast.error('请填写账号和密码'); return; }
    setAdding(true);
    try {
      await api.post('/account', { username: newUsername.trim(), password: newPassword.trim() });
      toast.success('账号创建成功');
      setShowAdd(false);
      fetchAccounts();
    } catch (err) { toast.error(err.response?.data?.message || '创建失败'); }
    finally { setAdding(false); }
  };

  const openAdd = () => { setNewUsername(''); setNewPassword(''); setShowNewPwd(false); setShowAdd(true); };

  // 编辑
  const openEdit = (account) => {
    setEditId(account.id); setEditUsername(account.username); setEditPassword(''); setShowEditPwd(false); setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUsername.trim()) { toast.error('账号不能为空'); return; }
    setSaving(true);
    try {
      const body = { username: editUsername.trim() };
      if (editPassword.trim()) body.password = editPassword.trim();
      await api.put(`/account/${editId}`, body);
      toast.success('已更新');
      setShowEdit(false);
      fetchAccounts();
    } catch (err) { toast.error(err.response?.data?.message || '更新失败'); }
    finally { setSaving(false); }
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/account/${deleteTarget.id}`);
      toast.success('已删除');
      setDeleteTarget(null);
      fetchAccounts();
    } catch (err) { toast.error(err.response?.data?.message || '删除失败'); }
    finally { setDeleting(false); }
  };

  const inputCls = "w-full rounded-lg border border-apple-gray-200 bg-apple-gray-50 px-3.5 py-2.5 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-all focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-gray-900">账号管理</h1>
          <p className="mt-0.5 text-sm text-apple-gray-500">管理系统登录账号</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-apple-blue px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97]">
          <PlusIcon className="h-4 w-4" />
          新增账号
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-apple-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-apple-gray-200 border-t-apple-gray-900" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center text-sm text-apple-gray-400">暂无账号</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-apple-gray-100">
                <th className="py-3 pl-5 pr-3 text-left text-xs font-medium text-apple-gray-400">账号</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-apple-gray-400">创建时间</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-apple-gray-400">更新时间</th>
                <th className="py-3 pl-3 pr-5 text-right text-xs font-medium text-apple-gray-400">操作</th>
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
                          {isSelf && <span className="ml-2 rounded bg-apple-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-apple-blue">当前登录</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-apple-gray-400">{new Date(account.createdAt).toLocaleString('zh-CN')}</td>
                    <td className="px-3 py-3.5 text-sm text-apple-gray-400">{new Date(account.updatedAt).toLocaleString('zh-CN')}</td>
                    <td className="py-3.5 pl-3 pr-5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => openEdit(account)} title="编辑"
                          className="rounded-lg p-2 text-apple-gray-300 transition-all hover:bg-apple-gray-100 hover:text-apple-blue">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        {!isSelf && (
                          <button onClick={() => setDeleteTarget(account)} title="删除"
                            className="rounded-lg p-2 text-apple-gray-300 transition-all hover:bg-red-50 hover:text-apple-red">
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
        )}
      </div>

      {/* ===== 新增账号弹窗 ===== */}
      <FormDialog open={showAdd} onClose={() => setShowAdd(false)} title="新增账号">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">账号</label>
            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="输入账号" autoFocus className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">密码</label>
            <div className="relative">
              <input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="输入密码" className={inputCls + " pr-10"} />
              <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-400 hover:text-apple-gray-600">
                {showNewPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50">
              取消
            </button>
            <button type="submit" disabled={adding} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-50">
              {adding ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </FormDialog>

      {/* ===== 编辑账号弹窗 ===== */}
      <FormDialog open={showEdit} onClose={() => setShowEdit(false)} title="编辑账号">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">账号</label>
            <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-apple-gray-600">新密码</label>
            <div className="relative">
              <input type={showEditPwd ? 'text' : 'password'} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="留空则不修改密码" className={inputCls + " pr-10"} />
              <button type="button" onClick={() => setShowEditPwd(!showEditPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-400 hover:text-apple-gray-600">
                {showEditPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-apple-gray-400">不填写则保持原密码不变</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-apple-gray-200 px-4 py-2 text-sm font-medium text-apple-gray-700 transition-colors hover:bg-apple-gray-50">
              取消
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-apple-blue px-4 py-2 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.97] disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </FormDialog>

      {/* ===== 删除确认弹窗 ===== */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="删除账号"
        message={`确定要删除账号「${deleteTarget?.username}」吗？此操作不可撤销。`}
        confirmText="删除"
        danger
        loading={deleting}
      />
    </div>
  );
}
