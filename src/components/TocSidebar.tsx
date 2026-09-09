import type { TocItem } from "../lib/markdown";

interface TocSidebarProps {
  items: TocItem[];
  activeId: string;
  onJump: (id: string) => void;
}

export function TocSidebar({ items, activeId, onJump }: TocSidebarProps) {
  if (items.length === 0) {
    return (
      <nav className="toc" aria-label="目录">
        <div className="toc__title">目录</div>
        <p className="toc__empty">这篇文档没有标题</p>
      </nav>
    );
  }

  return (
    <nav className="toc" aria-label="目录">
      <div className="toc__title">目录</div>
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
}
