// Locale provider only. Edit interface copy in ./locales/en.ts and ./locales/zh-TW.ts.
import en from "./locales/en";
import zhTW from "./locales/zh-TW";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "zh-TW";

// Keep the key stable so upgrades retain the user's language preference.
const STORAGE_KEY = "color-palette-locale";
const messages = { en, "zh-TW": zhTW } as const;

export type MessageKey = keyof typeof messages.en;
type Translator = (
  key: MessageKey,
  values?: Record<string, string | number>,
) => string;
interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
}
const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "zh-TW" ? "zh-TW" : "en";
  } catch {
    return "en";
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* session-only fallback */
    }
  }, [locale]);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values = {}) => {
        let text: string = messages[locale][key];
        for (const [name, replacement] of Object.entries(values)) {
          text = text.replaceAll(`{${name}}`, String(replacement));
        }
        return text;
      },
    }),
    [locale],
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
