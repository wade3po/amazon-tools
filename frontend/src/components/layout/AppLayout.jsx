import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

function resolveModule(pathname) {
  const adminPaths = ['/shops', '/accounts'];
  if (adminPaths.some((p) => pathname.startsWith(p))) return 'admin';
  return 'tools';
}

const moduleFirstPage = {
  tools: '/dashboard',
  admin: '/shops',
};

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeModule, setActiveModule] = useState(() => resolveModule(location.pathname));

  // 路由变化时同步模块
  useEffect(() => {
    setActiveModule(resolveModule(location.pathname));
  }, [location.pathname]);

  const handleSwitchModule = (key) => {
    setActiveModule(key);
    navigate(moduleFirstPage[key] || '/dashboard');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-apple-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-apple-gray-300 border-t-apple-gray-900" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen flex-col bg-apple-gray-50">
      <Header activeModule={activeModule} onSwitchModule={handleSwitchModule} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeModule={activeModule} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
