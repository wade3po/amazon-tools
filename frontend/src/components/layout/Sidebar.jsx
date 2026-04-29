import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CubeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmDialog from '../ui/ConfirmDialog';

const navLinks = [
  { to: '/dashboard', label: '商品抓取', icon: CubeIcon },
  { to: '/pdf', label: 'PDF 编辑', icon: DocumentTextIcon },
  { to: '/accounts', label: '账号管理', icon: UserGroupIcon },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowLogout(false);
  };

  const initials = user?.username ? user.username.slice(0, 1).toUpperCase() : '?';

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-apple-gray-100 px-5">
        <span className="text-lg">🛒</span>
        <span className="text-[13px] font-semibold tracking-tight text-apple-gray-900">Amazon 工具箱</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        {navLinks.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                active
                  ? 'bg-apple-gray-100 text-apple-gray-900'
                  : 'text-apple-gray-500 hover:bg-apple-gray-50 hover:text-apple-gray-900'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-apple-blue' : ''}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-apple-gray-100 p-3">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-apple-gray-600 to-apple-gray-900 text-[11px] font-semibold text-white">
            {initials}
          </div>
          <span className="flex-1 truncate text-xs font-medium text-apple-gray-700">{user?.username}</span>
          <button
            onClick={() => setShowLogout(true)}
            className="rounded-md p-1 text-apple-gray-300 transition-colors hover:bg-apple-gray-100 hover:text-apple-red"
            title="退出登录"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-52 flex-shrink-0 border-r border-apple-gray-100 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-apple-gray-100 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛒</span>
          <span className="text-sm font-semibold text-apple-gray-900">Amazon 工具箱</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-1.5 text-apple-gray-500 hover:bg-apple-gray-100" aria-label="Toggle menu">
          {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 shadow-2xl lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Logout confirm */}
      <ConfirmDialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        title="退出登录"
        message="确定要退出当前账号吗？"
        confirmText="退出"
        danger
      />
    </>
  );
}
