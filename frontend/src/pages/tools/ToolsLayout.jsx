import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Search, Type, FileText, AlignLeft,
  Package, Barcode, ScanLine,
  Image, MapPin, Receipt,
  Sparkles, Wrench, DollarSign, GitCompare, X
} from 'lucide-react';
import { I18nProvider, useI18n } from '../../i18n';
import LangSwitch from './LangSwitch';
import SeoHead from './SeoHead';
import FeedbackWidget from './FeedbackWidget';

const NOTICE_KEY = 'ai_notice_count';
const MAX_SHOW = 5;

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
      { path: '/tools/profit-calculator', nameKey: 'profitCalc.title', icon: DollarSign, badge: 'New' },
      { path: '/tools/batch-renamer', nameKey: 'batchRenamer.title', icon: Image },
      { path: '/tools/variation-diff', nameKey: 'variationDiff.title', icon: GitCompare },
      { path: '/tools/image-compliance', nameKey: 'imageCompliance.title', icon: Image },
      { path: '/tools/address-formatter', nameKey: 'addressFormatter.title', icon: MapPin },
      { path: '/tools/invoice-cleaner', nameKey: 'invoiceCleaner.title', icon: Receipt },
    ],
  },
];

function ToolsLayoutInner() {
  const location = useLocation();
  const { t } = useI18n();

  // 弹窗：最多显示 5 次
  const [showNotice, setShowNotice] = useState(false);
  useEffect(() => {
    const count = parseInt(localStorage.getItem(NOTICE_KEY) || '0', 10);
    if (count < MAX_SHOW) {
      setShowNotice(true);
      localStorage.setItem(NOTICE_KEY, String(count + 1));
    }
  }, []);

  const closeNotice = () => setShowNotice(false);

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <SeoHead />
      <FeedbackWidget />

      {/* 亚马逊新规公告弹窗 */}
      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* 顶部色带 */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-orange-400" />

            {/* 关闭按钮 */}
            <button
              onClick={closeNotice}
              className="absolute top-4 right-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 space-y-4">
              {/* 标题 */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">新规</span>
                    <span className="text-[11px] text-gray-400">2026年7月</span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-gray-900">亚马逊 AI 合成人像披露要求</h2>
                </div>
              </div>

              {/* 内容 */}
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 leading-relaxed space-y-2">
                <p>亚马逊要求，含 AI 合成人物的商品图片，必须在上传前为图片写入以下 XMP 元数据标记：</p>
                <code className="block rounded-lg bg-gray-900 px-3 py-2 text-xs font-mono text-green-400">
                  contains-synthetic-performer
                </code>
                <p className="text-xs text-gray-500">否则商品可能被下架或受到处罚。</p>
              </div>

              {/* 公众号引导 */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900 mb-1">🎁 免费领取桌面工具</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  关注下方公众号，回复「AI标记」即可领取批量写入工具，支持整个文件夹一键处理。
                </p>
                {/* 二维码占位 */}
                <div className="mt-3 flex justify-center">
                  <div className="h-28 w-28 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-xs text-gray-400">
                    公众号二维码
                  </div>
                </div>
              </div>

              <button
                onClick={closeNotice}
                className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
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
