import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('请输入账号和密码');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      toast.success('登录成功');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.msg || err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-apple-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-4xl">🛒</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-apple-gray-900">
            Amazon 工具箱
          </h1>
          <p className="mt-1.5 text-sm text-apple-gray-500">
            请登录以继续
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-apple-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-apple-gray-700">
                账号
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入账号"
                autoComplete="username"
                autoFocus
                className="w-full rounded-xl border border-apple-gray-300 bg-apple-gray-50 px-3.5 py-2.5 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-colors focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-apple-gray-700">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                autoComplete="current-password"
                className="w-full rounded-xl border border-apple-gray-300 bg-apple-gray-50 px-3.5 py-2.5 text-sm text-apple-gray-900 placeholder:text-apple-gray-400 transition-colors focus:border-apple-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-apple-blue/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-apple-blue px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-apple-blue-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  登录中...
                </span>
              ) : (
                '登录'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
