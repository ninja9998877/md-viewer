import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_LABELS, type Locale, type Messages } from "../i18n";
import type { PaperWidth, ReaderSettings } from "../lib/reader-settings";
import type { RecentFile } from "../lib/recent-files";

/** How long a press must last before it turns into a delete prompt. Long enough
 *  not to fire while scrolling the list, short enough not to feel stuck. */
const LONG_PRESS_MS = 500;

/** Full language names, for the tooltip and the accessible name only. Written in
 *  each language, so they are not translated either. */
const LANGUAGE_NAMES: Record<Locale, string> = {
  zh: "中文",
  "zh-Hant": "繁體中文",
  en: "English",
  ja: "日本語",
  de: "Deutsch",
};

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
  onFind: () => void;
  onRecent: (path: string) => void;
  onForgetRecent: (path: string) => void;
  version: string;
  onClipboard: () => void;
  onFeedback: () => void;
  /** Opens the iPhone app's App Store page in the browser. */
  onIosApp: () => void;
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
  onFind,
  onRecent,
  onForgetRecent,
  version,
  onClipboard,
  onFeedback,
  onIosApp,
  onToggleToc,
  onFont,
  onPaper,
  onToggleDark,
  onLocale,
  onAssociate,
}: AppMenuProps) {
  // Which recent entry is currently asking to be deleted. A long press (or a
  // right-click) arms it, and the row then swaps to a confirmation instead of
  // deleting outright: dropping an entry also drops the local snapshot, which
  // for a `content://` document may be the only readable copy left.
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const pressTimer = useRef(0);
  // Set once a press has been consumed by the long-press handler, so letting go
  // does not also open the document underneath.
  const consumed = useRef(false);

  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

  const armDelete = (path: string) => {
    consumed.current = true;
    setPendingDelete(path);
  };

  const startPress = (path: string) => {
    consumed.current = false;
    window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => armDelete(path), LONG_PRESS_MS);
  };

  const cancelPress = () => window.clearTimeout(pressTimer.current);

  return (
    <div className="app-menu" role="menu">
      <div className="app-menu__group">
        <button type="button" role="menuitem" onClick={onOpen}>
          {t.open}
        </button>
        {/* The friendliest way for an Agent to hand over a document: no file
            system involved, just paste. */}
        <button type="button" role="menuitem" onClick={onClipboard}>
          {t.clipboard}
        </button>
        <button type="button" role="menuitem" onClick={onNew}>
          {t.newFile}
        </button>
        {canSave ? (
          <button type="button" role="menuitem" onClick={onSave}>
            {t.save}
          </button>
        ) : null}
        {/* The only way in on a phone: there is no Ctrl+F on a touch keyboard. */}
        <button type="button" role="menuitem" onClick={onFind}>
          {t.find}
        </button>
      </div>

      {recent.length > 0 ? (
        <>
          <div className="app-menu__sep" />
          <div className="app-menu__label">
            {t.recent}
            <span className="app-menu__hint">{t.forgetHint}</span>
          </div>
          <div className="app-menu__group">
            {recent.slice(0, 8).map((item) =>
              pendingDelete === item.path ? (
                <div key={item.path} className="app-menu__confirm">
                  <span className="app-menu__confirm-text">{t.forgetConfirm}</span>
                  <div className="app-menu__pills">
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => {
                        setPendingDelete(null);
                        onForgetRecent(item.path);
                      }}
                    >
                      {t.forget}
                    </button>
                    <button type="button" onClick={() => setPendingDelete(null)}>
                      {t.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={item.path}
                  type="button"
                  role="menuitem"
                  className="app-menu__recent"
                  title={item.path}
                  onPointerDown={() => startPress(item.path)}
                  // A press that turns into a scroll fires pointercancel, and one
                  // that slides off the row fires pointerleave — both must drop
                  // the timer, or scrolling the list would start deleting things.
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onContextMenu={(event) => {
                    // Right-click on desktop, and Android's own long-press menu
                    // on touch: both should arm the prompt rather than open the
                    // platform menu.
                    event.preventDefault();
                    cancelPress();
                    armDelete(item.path);
                  }}
                  onClick={() => {
                    if (consumed.current) {
                      consumed.current = false;
                      return;
                    }
                    onRecent(item.path);
                  }}
                >
                  {item.name}
                </button>
              ),
            )}
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
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              // The full name goes in the tooltip and the accessible name; the
              // button shows the short form, because five full names do not fit.
              // Each is written in its own language, so it is not translated.
              title={LANGUAGE_NAMES[code]}
              aria-label={LANGUAGE_NAMES[code]}
              className={locale === code ? "is-on" : ""}
              onClick={() => onLocale(code)}
            >
              {LOCALE_LABELS[code]}
            </button>
          ))}
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

      <div className="app-menu__sep" />
      {/* The only thing in this menu that is not about the document on screen.
          Kept to one line and put in its own group at the bottom: this is a
          free, MIT-licensed desktop app pointing at a paid phone app, and a
          reader who came here to read should not have to step over it.

          It opens the App Store page in the browser. That is a URL handoff, not
          a request from this app — nothing here talks to the network, and this
          is the same mechanism the "open link" button in a document uses. */}
      <div className="app-menu__group">
        <button type="button" role="menuitem" onClick={onIosApp} title={t.iosAppHint}>
          {t.iosApp}
        </button>
        <button type="button" role="menuitem" onClick={onFeedback}>
          {t.feedback}
        </button>
      </div>
      {/* Which build is on this device — the first thing worth knowing when a
          bug report arrives, and impossible to tell apart otherwise. */}
      <div className="app-menu__version">
        {t.productName} {version}
      </div>
    </div>
  );
}
