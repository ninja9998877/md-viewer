import type { Locale, Messages } from "../i18n";
import type { PaperWidth, ReaderSettings } from "../lib/reader-settings";
import type { RecentFile } from "../lib/recent-files";

interface AppMenuProps {
  t: Messages;
  locale: Locale;
  recent: RecentFile[];
  canSave: boolean;
  tocOpen: boolean;
  isDark: boolean;
  reader: ReaderSettings;
  showAssociate: boolean;
  onOpen: () => void;
  onNew: () => void;
  onSave: () => void;
  onRecent: (path: string) => void;
  onToggleToc: () => void;
  onFont: (next: number) => void;
  onPaper: (paper: PaperWidth) => void;
  onToggleDark: () => void;
  onLocale: (locale: Locale) => void;
  onAssociate: () => void;
}

export function AppMenu({
  t,
  locale,
  recent,
  canSave,
  tocOpen,
  isDark,
  reader,
  showAssociate,
  onOpen,
  onNew,
  onSave,
  onRecent,
  onToggleToc,
  onFont,
  onPaper,
  onToggleDark,
  onLocale,
  onAssociate,
}: AppMenuProps) {
  return (
    <div className="app-menu" role="menu">
      <div className="app-menu__group">
        <button type="button" role="menuitem" onClick={onOpen}>
          {t.open}
        </button>
        <button type="button" role="menuitem" onClick={onNew}>
          {t.newFile}
        </button>
        {canSave ? (
          <button type="button" role="menuitem" onClick={onSave}>
            {t.save}
          </button>
        ) : null}
      </div>

      {recent.length > 0 ? (
        <>
          <div className="app-menu__sep" />
          <div className="app-menu__label">{t.recent}</div>
          <div className="app-menu__group">
            {recent.slice(0, 8).map((item) => (
              <button
                key={item.path}
                type="button"
                role="menuitem"
                title={item.path}
                onClick={() => onRecent(item.path)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="app-menu__sep" />
      <div className="app-menu__group">
        <button type="button" role="menuitem" className={tocOpen ? "is-on" : ""} onClick={onToggleToc}>
          {t.toc}
        </button>
      </div>

      <div className="app-menu__row">
        <span>{t.fontSize}</span>
        <div className="app-menu__pills">
          <button type="button" title={t.fontDown} onClick={() => onFont(Math.max(0.85, +(reader.fontScale - 0.08).toFixed(2)))}>
            A−
          </button>
          <button type="button" title={t.fontUp} onClick={() => onFont(Math.min(1.4, +(reader.fontScale + 0.08).toFixed(2)))}>
            A+
          </button>
        </div>
      </div>
      <div className="app-menu__row">
        <span>{t.paperWidth}</span>
        <div className="app-menu__pills">
          {(["narrow", "normal", "wide"] as PaperWidth[]).map((width) => (
            <button
              key={width}
              type="button"
              className={reader.paper === width ? "is-on" : ""}
              onClick={() => onPaper(width)}
            >
              {width === "narrow" ? t.paperNarrow : width === "wide" ? t.paperWide : t.paperNormal}
            </button>
          ))}
        </div>
      </div>
      <div className="app-menu__row">
        <span>{t.appearance}</span>
        <div className="app-menu__pills">
          <button type="button" className={!isDark ? "is-on" : ""} onClick={() => isDark && onToggleDark()}>
            {t.light}
          </button>
          <button type="button" className={isDark ? "is-on" : ""} onClick={() => !isDark && onToggleDark()}>
            {t.dark}
          </button>
        </div>
      </div>
      <div className="app-menu__row">
        <span>{t.language}</span>
        <div className="app-menu__pills">
          <button type="button" className={locale === "zh" ? "is-on" : ""} onClick={() => onLocale("zh")}>
            {t.langZh}
          </button>
          <button type="button" className={locale === "en" ? "is-on" : ""} onClick={() => onLocale("en")}>
            {t.langEn}
          </button>
        </div>
      </div>

      {showAssociate ? (
        <>
          <div className="app-menu__sep" />
          <div className="app-menu__group">
            <button type="button" role="menuitem" onClick={onAssociate}>
              {t.associate}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
