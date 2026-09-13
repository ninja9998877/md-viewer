import { useEffect, useRef } from "react";
import { fmt, type Messages } from "../i18n";

interface FindBarProps {
  t: Messages;
  query: string;
  /** Total matches for the current query. */
  count: number;
  /** Zero-based index of the active match, or -1 when there is none. */
  index: number;
  onQuery: (query: string) => void;
  onStep: (delta: number) => void;
  onClose: () => void;
}

export function FindBar({ t, query, count, index, onQuery, onStep, onClose }: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Opening the bar should put the caret in it — otherwise the reader has to
  // tap the field, which on a phone means the keyboard covers the document.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const status = !query.trim()
    ? ""
    : count === 0
      ? t.findNoMatch
      : fmt(t.findCount, { n: index + 1, total: count });

  return (
    <div className="find-bar" role="search">
      <input
        ref={inputRef}
        className="find-bar__input"
        type="text"
        value={query}
        placeholder={t.findPlaceholder}
        aria-label={t.find}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onStep(event.shiftKey ? -1 : 1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      />
      <span className="find-bar__count" aria-live="polite">
        {status}
      </span>
      <button
        type="button"
        className="find-bar__btn"
        title={t.findPrev}
        aria-label={t.findPrev}
        disabled={count === 0}
        onClick={() => onStep(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="find-bar__btn"
        title={t.findNext}
        aria-label={t.findNext}
        disabled={count === 0}
        onClick={() => onStep(1)}
      >
        ↓
      </button>
      <button
        type="button"
        className="find-bar__btn"
        title={t.findClose}
        aria-label={t.findClose}
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
