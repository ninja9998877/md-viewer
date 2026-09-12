import { memo } from "react";
import type { TocItem } from "../lib/markdown";
import { useI18n } from "../i18n";

interface TocSidebarProps {
  items: TocItem[];
  activeId: string;
  onJump: (id: string) => void;
}

// Memoized so unrelated App renders (menu, theme, font size) don't rebuild the
// heading list.
export const TocSidebar = memo(function TocSidebar({ items, activeId, onJump }: TocSidebarProps) {
  const { t } = useI18n();
  if (items.length === 0) {
    return (
      <nav className="toc" aria-label={t.toc}>
        <div className="toc__title">{t.toc}</div>
        <p className="toc__empty">{t.tocEmpty}</p>
      </nav>
    );
  }

  return (
    <nav className="toc" aria-label={t.toc}>
      <div className="toc__title">{t.toc}</div>
      <ol className="toc__list">
        {items.map((item) => (
          <li
            key={item.id}
            className={`toc__item toc__item--l${item.level} ${
              item.id === activeId ? "is-active" : ""
            }`}
          >
            <button type="button" onClick={() => onJump(item.id)}>
              {item.text}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
});
