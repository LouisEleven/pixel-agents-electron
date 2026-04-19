import { createContext, type ReactNode,useContext, useMemo, useState } from 'react';

import { type Locale, type TranslationKey, translations } from './i18n/utils';

export type { Locale };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const savedLocale = window.localStorage.getItem('pixel-agents-locale');
    if (savedLocale === 'en' || savedLocale === 'zh') return savedLocale;
  }

  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) {
    return 'zh';
  }

  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('pixel-agents-locale', nextLocale);
        }
      },
      t: (key, params) => {
        let text = translations[locale][key] ?? translations.en[key] ?? key;
        if (params) {
          for (const [paramKey, paramValue] of Object.entries(params)) {
            text = text.replace(`{${paramKey}}`, String(paramValue));
          }
        }
        return text;
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return value;
}
