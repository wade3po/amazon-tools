import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Search, Type, FileText, AlignLeft,
  Package, Barcode, ScanLine,
  Image, MapPin, Receipt,
  Sparkles, Wrench
} from 'lucide-react';
import { I18nProvider, useI18n } from '../../i18n';
import LangSwitch from './LangSwitch';
import SeoHead from './SeoHead';
import FeedbackWidget from './FeedbackWidget';

const toolCategories = [
  {
    labelKey: 'nav.seoListing',
    tools: [
      { path: '/tools/search-terms', nameKey: 'searchTerms.title', icon: Search, badge: 'Hot' },
      { path: '/tools/title-optimizer', nameKey: 'titleOptimizer.title', icon: Type },
      { path: '/tools/flat-file-cleaner', nameKey: 'flatFile.title', icon: FileText },
      { path: '/tools/listing-formatter', nameKey: 'listingFormatter.title', icon: AlignLeft },
    ],
  },
  {
    labelKey: 'nav.fbaPdf',
    tools: [
      { path: '/tools/box-label-resizer', nameKey: 'boxLabel.title', icon: Package },
      { path: '/tools/fnsku-splitter', nameKey: 'fnskuSplitter.title', icon: ScanLine },
      { path: '/tools/barcode-generator', nameKey: 'barcode.title', icon: Barcode },
    ],
  },
  {
    labelKey: 'nav.advanced',
    tools: [
      { path: '/tools/image-compliance', nameKey: 'imageCompliance.title', icon: Image },
      { path: '/tools/address-formatter', nameKey: 'addressFormatter.title', icon: MapPin },
      { path: '/tools/invoice-cleaner', nameKey: 'invoiceCleaner.title', icon: Receipt },
    ],
  },
];

function ToolsLayoutInner() {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <SeoHead />
      <FeedbackWidget />
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r border-gray-200/80 bg-white px-3 py-6">
        <div className="mb-6 px-3">
          <Link to="/tools" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold text-gray-900">{t('nav.brand')}</span>
          </Link>
        </div>

        <nav className="space-y-5">
          {toolCategories.map((cat) => (
            <div key={cat.labelKey}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {t(cat.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {cat.tools.map((tool) => {
                  const isActive = location.pathname === tool.path;
                  const Icon = tool.icon;
                  return (
                    <li key={tool.path}>
                      <Link
                        to={tool.path}
                        className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        <span className="truncate">{t(tool.nameKey)}</span>
                        {tool.badge && (
                          <span className="ml-auto rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                            {tool.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-8 mx-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-semibold text-gray-700">{t('common.free')}</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {t('common.freeDesc')}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-end border-b border-gray-200/80 bg-white/80 backdrop-blur-md px-8 py-3">
          <LangSwitch />
        </div>

        <div className="mx-auto max-w-5xl px-8 py-8">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="mx-auto max-w-5xl px-8 py-8">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-violet-600">
                    <Wrench className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{t('nav.brand')}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t('footer.desc')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">{t('footer.seoTools')}</p>
                <ul className="space-y-1.5">
                  <li><Link to="/tools/search-terms" className="text-xs text-gray-500 hover:text-blue-600">{t('searchTerms.title')}</Link></li>
                  <li><Link to="/tools/title-optimizer" className="text-xs text-gray-500 hover:text-blue-600">{t('titleOptimizer.title')}</Link></li>
                  <li><Link to="/tools/flat-file-cleaner" className="text-xs text-gray-500 hover:text-blue-600">{t('flatFile.title')}</Link></li>
                  <li><Link to="/tools/listing-formatter" className="text-xs text-gray-500 hover:text-blue-600">{t('listingFormatter.title')}</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">{t('footer.fbaTools')}</p>
                <ul className="space-y-1.5">
                  <li><Link to="/tools/box-label-resizer" className="text-xs text-gray-500 hover:text-blue-600">{t('boxLabel.title')}</Link></li>
                  <li><Link to="/tools/fnsku-splitter" className="text-xs text-gray-500 hover:text-blue-600">{t('fnskuSplitter.title')}</Link></li>
                  <li><Link to="/tools/barcode-generator" className="text-xs text-gray-500 hover:text-blue-600">{t('barcode.title')}</Link></li>
                  <li><Link to="/tools/image-compliance" className="text-xs text-gray-500 hover:text-blue-600">{t('imageCompliance.title')}</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 border-t border-gray-100 pt-4 flex items-center justify-between">
              <p className="text-[11px] text-gray-400">{t('footer.copyright')}</p>
              <p className="text-[11px] text-gray-400">{t('footer.noData')}</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function ToolsLayout() {
  return (
    <I18nProvider>
      <ToolsLayoutInner />
    </I18nProvider>
  );
}
