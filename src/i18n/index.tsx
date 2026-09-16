import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { de } from "./de";
import { en } from "./en";
import { ja } from "./ja";
import { zh } from "./zh";
import { zhHant } from "./zh-Hant";

export type Locale = "zh" | "zh-Hant" | "en" | "ja" | "de";
export type Messages = typeof zh;

const KEY = "moye-locale";
const catalog: Record<Locale, Messages> = { zh, "zh-Hant": zhHant, en, ja, de };

/** Shown on the language buttons. Short because five full names do not fit in a
 *  narrow menu — and each is written in its own language, so these are the same
 *  in every UI language and deliberately do not live in the catalogues. */
export const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中",
  "zh-Hant": "繁",
  en: "EN",
  ja: "日",
  de: "DE",
};

export const LOCALES = Object.keys(LOCALE_LABELS) as Locale[];

/**
 * Which Chinese, if it is Chinese at all.
 *
 * There are two Chinese catalogues and they are not interchangeable, so a bare
 * `zh` is not enough: `zh-TW`, `zh-HK` and `zh-MO` read Traditional, and so does
 * anything tagged `Hant`. Everything else Chinese — `zh`, `zh-CN`, `zh-SG`,
 * `zh-Hans` — reads Simplified.
 */
function chineseVariant(tag: string): Locale {
  if (tag.includes("hant") || /^zh-(tw|hk|mo)\b/.test(tag)) return "zh-Hant";
  return "zh";
}

/**
 * The reader's preferred language, out of the ones actually shipped.
 *
 * `navigator.languages` is in preference order, so it is walked in order rather
 * than searched: someone whose list is `["en-GB", "ja-JP"]` wants English, and a
 * `.some()` over the array would have handed them Japanese. Anything with no
 * catalogue falls through to English, which is also what an unknown language
 * gets — a settled default rather than a guess.
 */
export function detectLocale(): Locale {
  const langs =
    typeof navigator !== "undefined" && navigator.languages?.length
      ? navigator.languages
      : typeof navigator !== "undefined"
        ? [navigator.language]
        : ["en"];

  for (const item of langs) {
    const tag = item.toLowerCase();
    if (tag.startsWith("zh")) return chineseVariant(tag);
    if (tag.startsWith("ja")) return "ja";
    if (tag.startsWith("de")) return "de";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return detectLocale();
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? `{${name}}` : String(vars[name]),
  );
}

/**
 * True for the placeholder document shown before anything is opened.
 *
 * Every catalogue ships its own welcome text, so this has to cover all of them:
 * comparing against a hardcoded pair left the newer locales unrecognised, which
 * showed up twice — the welcome page was treated as a real document (so "save"
 * was offered for it), and switching language refused to re-translate it.
 */
export function isWelcomeText(text: string): boolean {
  return Object.values(catalog).some(
    (messages) => text === messages.welcome || text === messages.welcomeMobile,
  );
}

interface I18nValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  useEffect(() => {
    // The document language drives font selection and hyphenation, so each
    // locale gets the full tag rather than the two-letter one — and the two
    // Chinese variants must stay distinct here, or the browser picks the wrong
    // glyph forms.
    const tag: Record<Locale, string> = {
      zh: "zh-CN",
      "zh-Hant": "zh-Hant",
      en: "en",
      ja: "ja",
      de: "de",
    };
    document.documentElement.lang = tag[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  // Cycles rather than flipping, so it stays correct as catalogues are added.
  const toggleLocale = useCallback(() => {
    const at = LOCALES.indexOf(locale);
    setLocale(LOCALES[(at + 1) % LOCALES.length] ?? "en");
  }, [locale, setLocale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: catalog[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { zh, en };
