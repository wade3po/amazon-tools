import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CubeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  TruckIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const moduleLinks = {
  tools: [
    { to: '/dashboard', label: '商品抓取', icon: CubeIcon },
    {
      label: 'PDF 工具',
      icon: DocumentTextIcon,
      children: [
        { to: '/pdf/editor', label: 'PDF 编辑', icon: PencilSquareIcon },
        { to: '/pdf/clean', label: 'FBA 标签清理', icon: ShieldCheckIcon },
      ],
    },
    { to: '/products', label: '产品管理', icon: TableCellsIcon },
    { to: '/ad', label: '广告管理', icon: MegaphoneIcon },
    { to: '/purchase', label: '采购管理', icon: ShoppingCartIcon },
    { to: '/stock', label: '库存管理', icon: ArchiveBoxIcon },
    { to: '/shipment', label: '发货清单', icon: TruckIcon },
  ],
  admin: [
    { to: '/shops', label: '店铺管理', icon: BuildingStorefrontIcon },
    { to: '/accounts', label: '账号管理', icon: UserGroupIcon },
    { to: '/settings', label: '系统配置', icon: Cog6ToothIcon },
  ],
};

export default function Sidebar({ activeModule }) {
  const location = useLocation();
  const links = moduleLinks[activeModule] || moduleLinks.tools;

  // 自动展开包含当前路由的子菜单
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const expanded = {};
    links.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) => location.pathname.startsWith(child.to));
        if (isChildActive) expanded[item.label] = true;
      }
    });
    return expanded;
  });

  const toggleMenu = (label) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="w-48 flex-shrink-0 border-r border-apple-gray-100 bg-white">
      <nav className="space-y-1 px-3 py-4">
        {links.map((item) => {
          if (item.children) {
            // 有子菜单的项
            const isExpanded = expandedMenus[item.label] || item.children.some((child) => location.pathname.startsWith(child.to));
            const Icon = item.icon;
            const isAnyChildActive = item.children.some((child) => location.pathname.startsWith(child.to));

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                    isAnyChildActive
                      ? 'text-apple-gray-900'
                      : 'text-apple-gray-500 hover:bg-apple-gray-50 hover:text-apple-gray-900'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isAnyChildActive ? 'text-apple-blue' : ''}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-apple-gray-100 pl-2">
                    {item.children.map(({ to, label, icon: ChildIcon }) => {
                      const active = location.pathname === to;
                      return (
                        <Link
                          key={to}
                          to={to}
                          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                            active
                              ? 'bg-apple-gray-100 text-apple-gray-900'
                              : 'text-apple-gray-500 hover:bg-apple-gray-50 hover:text-apple-gray-900'
                          }`}
                        >
                          <ChildIcon className={`h-[15px] w-[15px] ${active ? 'text-apple-blue' : ''}`} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // 普通链接
          const { to, label, icon: Icon } = item;
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
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
    </aside>
  );
}
