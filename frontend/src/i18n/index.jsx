import { createContext, useContext, useState, useCallback } from 'react';
import { locales } from './locales';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    // Try to detect from localStorage or browser language
    const saved = localStorage.getItem('tools-lang');
    if (saved && locales[saved]) return saved;
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) return 'zh';
    return 'en';
  });

  const switchLang = useCallback((newLang) => {
    if (locales[newLang]) {
      setLang(newLang);
      localStorage.setItem('tools-lang', newLang);
    }
  }, []);

  const t = useCallback((path, params) => {
    const keys = path.split('.');
    let value = locales[lang];
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return path; // fallback to key
      }
    }
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
    }
    return value || path;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang: switchLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
