import { useI18n } from '../../i18n';
import { Globe } from 'lucide-react';

export default function LangSwitch() {
  const { lang, setLang } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
      title={lang === 'en' ? '切换中文' : 'Switch to English'}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{lang === 'en' ? '中文' : 'EN'}</span>
    </button>
  );
}
