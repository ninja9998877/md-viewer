import type { Plugin } from "unified";

const BLOCK = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "ul",
  "ol",
  "pre",
  "blockquote",
  "table",
  "hr",
]);

export function bodyLineOffset(source: string, body: string): number {
  if (body === source) return 0;
  const prefix = source.slice(0, Math.max(0, source.length - body.length));
  let n = 0;
  for (let i = 0; i < prefix.length; i++) {
    if (prefix.charCodeAt(i) === 10) n += 1;
  }
  return n;
}

export function rehypeSourceLine(offset: number): Plugin {
  return () => (tree: unknown) => {
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const n = node as {
        type?: string;
        tagName?: string;
        position?: { start?: { line?: number } };
        properties?: Record<string, unknown>;
        children?: unknown[];
      };
      if (n.type === "element" && n.tagName && BLOCK.has(n.tagName)) {
        const line = n.position?.start?.line;
        if (typeof line === "number") {
          n.properties = n.properties ?? {};
          n.properties["data-source-line"] = line + offset;
        }
      }
      n.children?.forEach(visit);
    };
    visit(tree);
  };
}

export function dataLineFromProps(props: Record<string, unknown>): number | undefined {
  const raw = props["data-source-line"] ?? props.dataSourceLine;
  const line = Number(raw);
  return Number.isFinite(line) && line > 0 ? line : undefined;
}

export interface PreviewScrollTarget {
  topLine: number;
  bottomLine: number;
  cursorLine: number;
  fraction: number;
  atStart: boolean;
  atEnd: boolean;
  totalLines: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function collectMapped(root: HTMLElement): { el: HTMLElement; line: number }[] {
  return [...root.querySelectorAll<HTMLElement>("[data-source-line]")]
    .map((el) => ({ el, line: Number(el.dataset.sourceLine) }))
    .filter((item) => Number.isFinite(item.line) && item.line > 0)
    .sort((a, b) => a.line - b.line);
}

function offsetOf(
  mapped: { el: HTMLElement; line: number }[],
  line: number,
  root: HTMLElement,
): { top: number; bottom: number } {
  const rootBox = root.getBoundingClientRect();
  const y = (el: HTMLElement) =>
    el.getBoundingClientRect().top - rootBox.top + root.scrollTop;

  let index = 0;
  for (let i = 0; i < mapped.length; i++) {
    if (mapped[i].line <= line) index = i;
    else break;
  }
  const cur = mapped[index];
  const nxt = mapped[index + 1];
  const curTop = y(cur.el);
  const curBottom = curTop + cur.el.offsetHeight;

  if (nxt && nxt.line > cur.line) {
    const nxtTop = y(nxt.el);
    const t = clamp((line - cur.line) / (nxt.line - cur.line), 0, 1);
    const top = curTop + (nxtTop - curTop) * t;
    return { top, bottom: top + Math.max(24, (nxtTop - curTop) * 0.15) };
  }
  return { top: curTop, bottom: curBottom };
}

export function scrollPreviewToLine(
  root: HTMLElement,
  target: PreviewScrollTarget,
): void {
  const max = root.scrollHeight - root.clientHeight;
  if (max <= 0) return;

  if (target.atStart) {
    root.scrollTop = 0;
    return;
  }
  if (target.atEnd) {
    root.scrollTop = max;
    return;
  }

  const mapped = collectMapped(root);
  if (mapped.length === 0) {
    root.scrollTop = max * target.fraction;
    return;
  }

  const top = offsetOf(mapped, target.topLine, root);
  const focusLine = clamp(
    target.cursorLine || target.bottomLine,
    target.topLine,
    Math.max(target.topLine, target.bottomLine),
  );
  const focus = offsetOf(mapped, focusLine, root);
  const lastVisible = offsetOf(mapped, target.bottomLine, root);
  const viewport = root.clientHeight;

  let scrollTop = top.top - 8;
  const needBottom = Math.max(focus.bottom, lastVisible.top + 48);
  if (needBottom - scrollTop > viewport - 12) {
    scrollTop = needBottom - viewport + 12;
  }
  if (focus.top < scrollTop + 8) {
    scrollTop = focus.top - 8;
  }

  root.scrollTop = clamp(scrollTop, 0, max);
}
