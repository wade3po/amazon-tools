import { Link } from 'react-router-dom';
import {
  Search, Type, FileText, AlignLeft,
  Package, ScanLine, Barcode,
  Image, MapPin, Receipt,
  ArrowRight, Zap, Shield, Globe
} from 'lucide-react';
import { useI18n } from '../../i18n';

const tools = [
  {
    categoryKey: 'home.seoCategory',
    descKey: 'home.seoDesc',
    items: [
      { path: '/tools/search-terms', nameKey: 'searchTerms.title', descKey: 'searchTerms.homeDesc', icon: Search, color: 'from-blue-500 to-cyan-500', badge: 'Most Popular' },
      { path: '/tools/title-optimizer', nameKey: 'titleOptimizer.title', descKey: 'titleOptimizer.homeDesc', icon: Type, color: 'from-violet-500 to-purple-500' },
      { path: '/tools/flat-file-cleaner', nameKey: 'flatFile.title', descKey: 'flatFile.homeDesc', icon: FileText, color: 'from-emerald-500 to-teal-500' },
      { path: '/tools/listing-formatter', nameKey: 'listingFormatter.title', descKey: 'listingFormatter.homeDesc', icon: AlignLeft, color: 'from-orange-500 to-amber-500' },
    ],
  },
  {
    categoryKey: 'home.fbaCategory',
    descKey: 'home.fbaDesc',
    items: [
      { path: '/tools/box-label-resizer', nameKey: 'boxLabel.title', descKey: 'boxLabel.homeDesc', icon: Package, color: 'from-rose-500 to-pink-500' },
      { path: '/tools/fnsku-splitter', nameKey: 'fnskuSplitter.title', descKey: 'fnskuSplitter.homeDesc', icon: ScanLine, color: 'from-sky-500 to-blue-500' },
      { path: '/tools/barcode-generator', nameKey: 'barcode.title', descKey: 'barcode.homeDesc', icon: Barcode, color: 'from-indigo-500 to-violet-500' },
    ],
  },
  {
    categoryKey: 'home.advCategory',
    descKey: 'home.advDesc',
    items: [
      { path: '/tools/image-compliance', nameKey: 'imageCompliance.title', descKey: 'imageCompliance.homeDesc', icon: Image, color: 'from-fuchsia-500 to-pink-500' },
      { path: '/tools/address-formatter', nameKey: 'addressFormatter.title', descKey: 'addressFormatter.homeDesc', icon: MapPin, color: 'from-lime-500 to-green-500' },
      { path: '/tools/invoice-cleaner', nameKey: 'invoiceCleaner.title', descKey: 'invoiceCleaner.homeDesc', icon: Receipt, color: 'from-amber-500 to-yellow-500' },
    ],
  },
];

export default function ToolsHomePage() {
  const { t } = useI18n();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-8 py-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtNHYySDB2LTJoMzZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-500/20">
            <Zap className="h-3 w-3" />
            {t('home.badge')}
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t('home.title')}
          </h1>
          <p className="mt-3 max-w-xl text-base text-gray-400 leading-relaxed">
            {t('home.subtitle')}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Shield className="h-4 w-4 text-green-400" />
              <span>{t('common.privacySafe')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>{t('common.instantResults')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Globe className="h-4 w-4 text-blue-400" />
              <span>{t('common.worksOffline')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Categories */}
      {tools.map((category) => (
        <section key={category.categoryKey}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t(category.categoryKey)}</h2>
            <p className="text-sm text-gray-500">{t(category.descKey)}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {category.items.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{t(tool.nameKey)}</h3>
                        {tool.badge && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{t(tool.descKey)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:text-gray-600 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
