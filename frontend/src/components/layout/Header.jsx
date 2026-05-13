import { useNavigate } from 'react-router-dom';
import {
  BuildingStorefrontIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import api from '../../lib/api';

const modules = [
  { key: 'tools', label: '工具箱', icon: WrenchScrewdriverIcon },
  { key: 'admin', label: '管理后台', icon: Cog6ToothIcon },
];

export default function Header({ activeModule, onSwitchModule }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  // 店铺切换
  const [shops, setShops] = useState([]);
  const [currentShop, setCurrentShop] = useState(null);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const shopRef = useRef(null);

  const loadShops = useCallback(() => {
    api.get('/shop?pageSize=100').then((res) => {
      const list = res.data.shops || [];
      setShops(list);
      const savedId = localStorage.getItem('currentShopId');
      const saved = list.find((s) => s._id === savedId);
      if (saved) {
        setCurrentShop(saved);
        localStorage.setItem('currentShop', JSON.stringify(saved));
      } else if (list.length > 0) {
        // 当前选中的店铺已不存在（被删除），自动切到第一个
        setCurrentShop(list[0]);
        localStorage.setItem('currentShopId', list[0]._id);
        localStorage.setItem('currentShop', JSON.stringify(list[0]));
        window.dispatchEvent(new Event('shopChanged'));
      } else {
        // 没有任何店铺了
        setCurrentShop(null);
        localStorage.removeItem('currentShopId');
        localStorage.removeItem('currentShop');
        window.dispatchEvent(new Event('shopChanged'));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  // 监听店铺列表变更事件（新增/删除店铺时触发）
  useEffect(() => {
    const handler = () => loadShops();
    window.addEventListener('shopsUpdated', handler);
    return () => window.removeEventListener('shopsUpdated', handler);
  }, [loadShops]);

  useEffect(() => {
    function handleClick(e) {
      if (shopRef.current && !shopRef.current.contains(e.target)) {
        setShopDropdownOpen(false);
      }
    }
    if (shopDropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shopDropdownOpen]);

  const handleSelectShop = (shop) => {
    setCurrentShop(shop);
    localStorage.setItem('currentShopId', shop._id);
    localStorage.setItem('currentShop', JSON.stringify(shop));
    setShopDropdownOpen(false);
    window.dispatchEvent(new Event('shopChanged'));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowLogout(false);
  };

  const initials = user?.username ? user.username.slice(0, 1).toUpperCase() : '?';

  return (
    <>
      <header className="sticky top-0 z-50 flex h-12 items-center border-b border-apple-gray-100 bg-white/90 px-5 backdrop-blur-xl">
        {/* 模块切换 */}
        <div className="flex items-center gap-1">
          {modules.map((mod) => {
            const active = activeModule === mod.key;
            return (
              <button
                key={mod.key}
                onClick={() => onSwitchModule(mod.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-apple-gray-900 text-white'
                    : 'text-apple-gray-500 hover:bg-apple-gray-100 hover:text-apple-gray-900'
                }`}
              >
                <mod.icon className={`h-4 w-4 ${active ? 'text-white' : ''}`} />
                {mod.label}
              </button>
            );
          })}
        </div>

        {/* 右侧 */}
        <div className="ml-auto flex items-center gap-3">
          {/* 店铺切换 */}
          <div className="relative" ref={shopRef}>
            <button
              onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-apple-gray-200 bg-apple-gray-50 px-3 py-1.5 text-[13px] font-medium text-apple-gray-700 transition-all hover:border-apple-gray-300 hover:bg-white"
            >
              <BuildingStorefrontIcon className="h-4 w-4 text-apple-gray-400" />
              <span className="max-w-[120px] truncate">{currentShop?.name || '暂无店铺'}</span>
              <ChevronDownIcon className="h-3.5 w-3.5 text-apple-gray-400" />
            </button>

            {shopDropdownOpen && (
              <div className="absolute right-0 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-apple-gray-200 bg-white shadow-lg">
                {shops.length === 0 ? (
                  <div className="px-3 py-3 text-center text-[13px] text-apple-gray-400">暂无店铺，请先新增</div>
                ) : (
                  shops.map((shop) => {
                    const isActive = currentShop?._id === shop._id;
                    return (
                      <button
                        key={shop._id}
                        onClick={() => handleSelectShop(shop)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'bg-apple-blue/5 text-apple-blue'
                            : 'text-apple-gray-700 hover:bg-apple-gray-50'
                        }`}
                      >
                        <BuildingStorefrontIcon className={`h-4 w-4 ${isActive ? 'text-apple-blue' : 'text-apple-gray-400'}`} />
                        {shop.name}
                        {shop.marketplace && (
                          <span className="ml-auto text-[11px] text-apple-gray-400">{shop.marketplace}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 用户 */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-apple-gray-600 to-apple-gray-900 text-[11px] font-semibold text-white">
              {initials}
            </div>
            <span className="text-xs font-medium text-apple-gray-700">{user?.username}</span>
            <button
              onClick={() => setShowLogout(true)}
              className="rounded-md p-1 text-apple-gray-300 transition-colors hover:bg-apple-gray-100 hover:text-apple-red"
              title="退出登录"
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

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
