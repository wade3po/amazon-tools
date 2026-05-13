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
} from '@heroicons/react/24/outline';

const moduleLinks = {
  tools: [
    { to: '/dashboard', label: '商品抓取', icon: CubeIcon },
    { to: '/pdf', label: 'PDF 编辑', icon: DocumentTextIcon },
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

  return (
    <aside className="w-48 flex-shrink-0 border-r border-apple-gray-100 bg-white">
      <nav className="space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon }) => {
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
