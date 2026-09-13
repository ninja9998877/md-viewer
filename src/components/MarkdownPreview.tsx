import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "katex/dist/katex.min.css";
import { parseDocument, type DocSection } from "../lib/markdown-sections";
import { remarkGithubAlerts } from "../lib/remark-github-alerts";
import { remarkHeadingIds } from "../lib/remark-heading-ids";
import { remarkSupersub } from "../lib/remark-supersub";
import {
  collectMapped,
  rehypeSourceLine,
  scrollPreviewToLine,
  type PreviewScrollTarget,
} from "../lib/source-line";
import { FrontmatterCard } from "./FrontmatterCard";
import { createMarkdownComponents } from "./markdown-components";
import { useI18n, type Locale } from "../i18n";

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary", "mark", "kbd", "sub", "sup"],
  attributes: {
    ...defaultSchema.attributes,
    div: ["className", "class"],
    span: [...(defaultSchema.attributes?.span ?? []), "className", "class"],
    code: [...(defaultSchema.attributes?.code ?? []), "className", "class"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className", "class"],
    details: ["open"],
    blockquote: [
      ...(defaultSchema.attributes?.blockquote ?? []),
      "dataAlert",
      "className",
      "class",
    ],
  },
};

/** Registry keys for the find highlights; the matching ::highlight() rules live
 *  in index.css and must use the same names. */
const FIND_HIGHLIGHT = "moye-find";
const FIND_HIGHLIGHT_ACTIVE = "moye-find-active";

// The CSS Custom Highlight API is newer than the DOM typings this project
// compiles against, so describe only the two pieces actually used rather than
// widening anything to `any`.
interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}
type HighlightCtor = new (...ranges: Range[]) => unknown;

function estimateHeight(section: DocSection): number {
  const lines = Math.max(1, section.endLine - section.startLine + 1);
  return Math.min(2200, Math.max(140, lines * 24));
}

/**
 * True while a section still contains a placeholder that has not settled.
 *
 * A Mermaid diagram renders into an empty host and only fills in after an async
 * pass, and an `<img>` reports a near-zero height until it loads. Measuring
 * either one records a height far below the truth, which overwrites the good
 * cached height, collapses the section — and because the virtual list unmounts
 * and remounts sections as the window moves, it collapses all over again every
 * time the reader scrolls back. That is the "bounces forever at the bottom"
 * report, and it is why it only happens in documents with certain blocks.
 */
function isPending(node: HTMLElement): boolean {
  if (node.querySelector("[data-pending]")) return true;
  for (const img of node.querySelectorAll("img")) {
    if (!img.complete) return true;
  }
  return false;
}

function visibleWindow(scrollTop: number, viewport: number, heights: number[], overscan: number) {
  let acc = 0;
  let start = 0;
  for (let i = 0; i < heights.length; i++) {
    if (acc + heights[i] > scrollTop) {
      start = i;
      break;
    }
    acc += heights[i];
    start = i;
  }
  start = Math.max(0, start - overscan);
  let padTop = 0;
  for (let i = 0; i < start; i++) padTop += heights[i];
  let end = start;
  let filled = padTop;
  while (end < heights.length && filled < scrollTop + viewport) {
    filled += heights[end];
    end += 1;
  }
  end = Math.min(heights.length, end + overscan);
  let padBottom = 0;
  for (let i = end; i < heights.length; i++) padBottom += heights[i];
  return { start, end, padTop, padBottom };
}

/**
 * Where the reader currently is, expressed as "this element sits this many
 * pixels from the top of the scroll container".
 *
 * Anchoring on an element id rather than a pixel offset is what makes it
 * survive a reflow: when the viewport changes (fold / unfold / window resize)
 * every section re-wraps and all the old offsets are meaningless, but the
 * heading ids are stable, so we can put the same line back under the reader's
 * eye. Apple calls this out as the thing that most often breaks on foldables.
 */
export interface PreviewAnchor {
  id: string;
  offset: number;
}

export interface MarkdownPreviewHandle {
  scrollToHeading: (id: string) => void;
  scrollToLine: (line: number) => void;
  syncToEditor: (target: PreviewScrollTarget) => void;
  captureAnchor: () => PreviewAnchor | null;
  /** Returns false while the anchor's section is still virtualized out, so a
   *  caller restoring a remembered position knows to retry. */
  restoreAnchor: (anchor: PreviewAnchor) => boolean;
}

interface MarkdownPreviewProps {
  content: string;
  isDark: boolean;
  filePath?: string | null;
  scrollParentRef: RefObject<HTMLElement | null>;
  /** Current find query, highlighted in place while the find bar is open. */
  findQuery?: string;
  /** Section holding the active match, so it can be tinted differently. */
  findSection?: number;
  /** Zero-based index of the active match among the hits in that section. */
  findOrdinal?: number;
}

const MarkdownPreviewInner = forwardRef<MarkdownPreviewHandle, MarkdownPreviewProps>(
  function MarkdownPreview(
    {
      content,
      isDark,
      filePath,
      scrollParentRef,
      findQuery = "",
      findSection = -1,
      findOrdinal = -1,
    },
    ref,
  ) {
    const { locale } = useI18n();
    const parsed = useMemo(() => parseDocument(content), [content]);
    const heightsRef = useRef<number[]>([]);
    const heightsByKey = useRef(new Map<string, number>());
    const sectionsRef = useRef(parsed.sections);
    const pendingJump = useRef<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const recomputeRaf = useRef(0);
    const syncingRef = useRef(false);
    const syncTimer = useRef(0);
    const [range, setRange] = useState({ start: 0, end: 6, padTop: 0, padBottom: 0 });
    sectionsRef.current = parsed.sections;

    const components = useMemo(
      () => createMarkdownComponents(isDark, parsed.idBySourceLine, filePath ?? null),
      [isDark, parsed.idBySourceLine, filePath],
    );

    const markSyncing = useCallback(() => {
      syncingRef.current = true;
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => {
        syncingRef.current = false;
      }, 160);
    }, []);

    useLayoutEffect(() => {
      const next = new Map<string, number>();
      for (const section of parsed.sections) {
        next.set(section.key, heightsByKey.current.get(section.key) ?? estimateHeight(section));
      }
      heightsByKey.current = next;
      heightsRef.current = parsed.sections.map((section) => next.get(section.key) ?? estimateHeight(section));
    }, [parsed.sections]);

    const recompute = useCallback(() => {
      const root = scrollParentRef.current;
      if (!root) return;
      const next = visibleWindow(root.scrollTop, root.clientHeight, heightsRef.current, 3);
      setRange((prev) =>
        prev.start === next.start &&
        prev.end === next.end &&
        prev.padTop === next.padTop &&
        prev.padBottom === next.padBottom
          ? prev
          : next,
      );
    }, [scrollParentRef]);

    const scheduleRecompute = useCallback(() => {
      if (recomputeRaf.current) return;
      recomputeRaf.current = requestAnimationFrame(() => {
        recomputeRaf.current = 0;
        recompute();
      });
    }, [recompute]);

    const applyHeight = useCallback(
      (node: HTMLElement, index: number, nextHeight: number) => {
        if (!nextHeight) return;
        const prev = heightsRef.current[index] ?? 0;
        if (Math.abs(nextHeight - prev) < 2) return;
        const delta = nextHeight - prev;
        heightsRef.current[index] = nextHeight;
        const key = sectionsRef.current[index]?.key;
        if (key) heightsByKey.current.set(key, nextHeight);
        const root = scrollParentRef.current;
        if (root && delta && !syncingRef.current) {
          // At the end there is nothing below the reader to hold their place, so
          // every write to `scrollTop` lands on the maximum — and the very
          // measurement that triggered it has just moved that maximum.
          // Compensating per section does not converge there: each write shifts
          // the window, the window renders and measures a different set of
          // sections, and those measurements shift it again. The reader sees the
          // list bounce at the bottom for as long as the document keeps handing
          // us new measurements. Pinning to the end is the same intent ("stay on
          // this content") written as a fixed point instead of a chase.
          const atEnd = root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
          if (atEnd) {
            root.scrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
          } else if (node.getBoundingClientRect().top < root.getBoundingClientRect().top + 8) {
            // A section above the viewport was measured differently from its
            // estimate, which pulls everything below it up or down. Applying
            // `delta` puts the reader back on the same content.
            root.scrollTop += delta;
          }
        }
        scheduleRecompute();
      },
      [scheduleRecompute, scrollParentRef],
    );

    useEffect(() => {
      const root = scrollParentRef.current;
      if (!root) return;
      recompute();
      const onScroll = () => {
        if (pendingJump.current) return;
        scheduleRecompute();
      };
      root.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        root.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (recomputeRaf.current) cancelAnimationFrame(recomputeRaf.current);
        window.clearTimeout(syncTimer.current);
      };
    }, [recompute, scheduleRecompute, parsed.sections, scrollParentRef]);

    useLayoutEffect(() => {
      const list = listRef.current;
      if (!list) return;
      const nodes = [...list.querySelectorAll<HTMLElement>("[data-section-index]")];
      for (const node of nodes) {
        const index = Number(node.dataset.sectionIndex);
        if (Number.isFinite(index) && !isPending(node)) {
          applyHeight(node, index, node.offsetHeight);
        }
      }
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const index = Number(el.dataset.sectionIndex);
          if (Number.isFinite(index) && !isPending(el)) {
            applyHeight(el, index, el.offsetHeight);
          }
        }
      });
      nodes.forEach((node) => ro.observe(node));
      return () => ro.disconnect();
    }, [range.start, range.end, applyHeight]);

    // Find hits are painted with the CSS Custom Highlight API rather than by
    // wrapping matches in <mark>. That DOM belongs to React, and mutating it
    // underneath React is exactly how you get "removeChild: the node to be
    // removed is not a child of this node" once the virtual list unmounts a
    // section mid-highlight. Ranges are read-only, so on a host without the API
    // the only loss is the tint — jumping to a match still works.
    useLayoutEffect(() => {
      const registry = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
      const Ctor = (globalThis as unknown as { Highlight?: HighlightCtor }).Highlight;
      if (!registry || !Ctor) return;
      registry.delete(FIND_HIGHLIGHT);
      registry.delete(FIND_HIGHLIGHT_ACTIVE);

      const needle = findQuery.trim().toLowerCase();
      const list = listRef.current;
      if (!needle || !list) return;

      const plain: Range[] = [];
      const active: Range[] = [];
      const sections = [...list.querySelectorAll<HTMLElement>("[data-section-index]")];
      for (const section of sections) {
        const index = Number(section.dataset.sectionIndex);
        const ranges: Range[] = [];
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const text = node.nodeValue ?? "";
          const lower = text.toLowerCase();
          let from = 0;
          for (;;) {
            const at = lower.indexOf(needle, from);
            if (at < 0) break;
            const range = document.createRange();
            range.setStart(node, at);
            range.setEnd(node, at + needle.length);
            ranges.push(range);
            from = at + needle.length;
          }
          node = walker.nextNode();
        }
        // Within the active section pick exactly one hit: the ordinal computed
        // from the source. Rendered text is not byte-identical to the source
        // (markdown syntax is stripped), so the ordinal is an approximation —
        // when it lands out of range, fall back to the first hit rather than
        // showing nothing as "current".
        let chosen = -1;
        if (index === findSection && ranges.length > 0) {
          chosen = findOrdinal >= 0 && findOrdinal < ranges.length ? findOrdinal : 0;
        }
        ranges.forEach((range, i) => {
          if (i === chosen) active.push(range);
          else plain.push(range);
        });
      }
      if (plain.length) registry.set(FIND_HIGHLIGHT, new Ctor(...plain));
      if (active.length) registry.set(FIND_HIGHLIGHT_ACTIVE, new Ctor(...active));
    }, [findQuery, findSection, findOrdinal, range, parsed.sections]);

    const sectionOffset = (index: number) => {
      let y = 0;
      for (let i = 0; i < index; i++) y += heightsRef.current[i] ?? 0;
      return y;
    };

    const scrollToSectionIndex = (index: number, behavior: ScrollBehavior, then?: () => void) => {
      const root = scrollParentRef.current;
      if (!root) return;
      const paper = root.querySelector(".paper") as HTMLElement | null;
      const paperTop = paper
        ? paper.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
        : 0;
      const innerTop = paper?.querySelector(".md-body") as HTMLElement | null;
      const matter = innerTop?.querySelector(".matter") as HTMLElement | null;
      const matterH = matter?.offsetHeight ?? 0;
      root.scrollTo({
        top: Math.max(0, paperTop + matterH + sectionOffset(index) - 12),
        behavior,
      });
      window.setTimeout(() => then?.(), behavior === "smooth" ? 280 : 40);
    };

    const revealIndex = (index: number) => {
      const start = Math.max(0, index - 1);
      const end = Math.min(parsed.sections.length, index + 3);
      let padTop = 0;
      for (let i = 0; i < start; i++) padTop += heightsRef.current[i] ?? 0;
      let padBottom = 0;
      for (let i = end; i < parsed.sections.length; i++) padBottom += heightsRef.current[i] ?? 0;
      // Same compare-and-skip as `recompute`: callers retry this until the
      // section is mounted, and a fresh object every time would re-render the
      // whole list on each attempt.
      setRange((prev) =>
        prev.start === start &&
        prev.end === end &&
        prev.padTop === padTop &&
        prev.padBottom === padBottom
          ? prev
          : { start, end, padTop, padBottom },
      );
    };

    useLayoutEffect(() => {
      const id = pendingJump.current;
      if (!id) return;
      const el = document.getElementById(id);
      const root = scrollParentRef.current;
      if (!el || !root) return;
      pendingJump.current = null;
      const top =
        el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 16;
      root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }, [range, parsed.sections, scrollParentRef]);

    useImperativeHandle(ref, () => ({
      captureAnchor: (): PreviewAnchor | null => {
        const root = scrollParentRef.current;
        if (!root) return null;
        const nodes = [...root.querySelectorAll<HTMLElement>(".md-body [id]")];
        if (nodes.length === 0) return null;
        const rootTop = root.getBoundingClientRect().top;
        // The last heading at or above the viewport top is the one the reader is
        // currently inside; everything after it is still ahead of them.
        let anchor: PreviewAnchor | null = null;
        for (const el of nodes) {
          const top = el.getBoundingClientRect().top - rootTop;
          if (top > 1) break;
          anchor = { id: el.id, offset: top };
        }
        const first = nodes[0];
        return anchor ?? { id: first.id, offset: first.getBoundingClientRect().top - rootTop };
      },
      restoreAnchor: (anchor: PreviewAnchor) => {
        const root = scrollParentRef.current;
        if (!root) return false;
        // A remembered position normally points at a section the virtual list
        // has not mounted — the reader was deep in the document while the list
        // starts at the top. Reveal that section first; the element only appears
        // once that render lands, so answer `false` and let the caller retry.
        const index = parsed.sections.findIndex((section) =>
          section.headingIds.includes(anchor.id),
        );
        if (index >= 0) revealIndex(index);
        const el = root.querySelector<HTMLElement>(`#${CSS.escape(anchor.id)}`);
        if (!el) return false;
        const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top;
        root.scrollTop += top - anchor.offset;
        // Re-window explicitly rather than relying on the scroll event: the
        // sections around the restored position may not be mounted at all, and
        // without this the reader lands on the spacer that stands in for them —
        // a restored position looking at a blank page.
        scheduleRecompute();
        return true;
      },
      scrollToHeading: (id: string) => {
        const index = parsed.sections.findIndex((section) => section.headingIds.includes(id));
        if (index < 0) return;
        pendingJump.current = id;
        revealIndex(index);
        scrollToSectionIndex(index, "auto");
      },
      scrollToLine: (line: number) => {
        const index = parsed.sections.findIndex(
          (section) => line >= section.startLine && line <= section.endLine,
        );
        if (index < 0) return;
        // Reveal the section first: its line markers do not exist in the DOM
        // until it is mounted, so scrolling straight away would aim at a stale
        // offset. `go` retries briefly while the virtual list catches up.
        pendingJump.current = null;
        revealIndex(index);
        let tries = 0;
        const go = () => {
          const root = scrollParentRef.current;
          if (!root) return;
          const mapped = collectMapped(root);
          let best: { el: HTMLElement; line: number } | null = null;
          for (const item of mapped) {
            if (item.line > line + 1) break;
            best = item; // sorted by line, so the last one at or above wins
          }
          if (!best) {
            if (tries++ < 6) window.setTimeout(go, 40);
            return;
          }
          const top =
            best.el.getBoundingClientRect().top -
            root.getBoundingClientRect().top +
            root.scrollTop -
            96;
          root.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        };
        requestAnimationFrame(go);
      },
      syncToEditor: (target: PreviewScrollTarget) => {
        const root = scrollParentRef.current;
        if (!root) return;
        markSyncing();
        if (target.atStart) {
          root.scrollTop = 0;
          scheduleRecompute();
          return;
        }
        if (target.atEnd) {
          root.scrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
          scheduleRecompute();
          return;
        }
        const line = target.cursorLine || target.topLine;
        const index = parsed.sections.findIndex(
          (section) => line >= section.startLine && line <= section.endLine,
        );
        if (index >= 0) {
          const approxTop = sectionOffset(index);
          const next = visibleWindow(approxTop, root.clientHeight, heightsRef.current, 3);
          const start = Math.min(next.start, Math.max(0, index - 1));
          const end = Math.max(next.end, Math.min(parsed.sections.length, index + 2));
          let padTop = 0;
          for (let i = 0; i < start; i++) padTop += heightsRef.current[i] ?? 0;
          let padBottom = 0;
          for (let i = end; i < parsed.sections.length; i++) padBottom += heightsRef.current[i] ?? 0;
          setRange({ start, end, padTop, padBottom });
        }
        requestAnimationFrame(() => {
          scrollPreviewToLine(root, target);
        });
      },
    }));

    const visible = parsed.sections.slice(range.start, range.end);
    const hasMatter = Object.keys(parsed.data).length > 0;

    return (
      <div className="md-body">
        {hasMatter ? (
          <div data-source-line={1}>
            <FrontmatterCard data={parsed.data} />
          </div>
        ) : (
          <FrontmatterCard data={parsed.data} />
        )}
        <div className="virtual-list" ref={listRef}>
          {range.padTop > 0 ? <div style={{ height: range.padTop }} aria-hidden /> : null}
          {visible.map((section, i) => {
            const index = range.start + i;
            return (
              <div key={section.key} data-section={section.key} data-section-index={index}>
                <SectionMarkdown section={section} components={components} isDark={isDark} locale={locale} />
              </div>
            );
          })}
          {range.padBottom > 0 ? <div style={{ height: range.padBottom }} aria-hidden /> : null}
        </div>
      </div>
    );
  },
);

// Without memo every App render — opening the menu, nudging the font size,
// toggling the theme — walks the whole document tree again. Contents only
// change on a real content edit, so this is pure win.
export const MarkdownPreview = memo(MarkdownPreviewInner);

const SectionMarkdown = memo(
  function SectionMarkdown({
    section,
    components,
  }: {
    section: DocSection;
    components: ReturnType<typeof createMarkdownComponents>;
    isDark: boolean;
    locale: Locale;
  }) {
    const offset = section.startLine - 1;
    return (
      <ReactMarkdown
        remarkPlugins={[
          [remarkGfm, { singleTilde: false }],
          remarkGithubAlerts,
          remarkMath,
          remarkSupersub,
          remarkHeadingIds,
        ]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          rehypeKatex,
          [rehypeHighlight, { ignoreMissing: true }],
          rehypeSourceLine(offset),
        ]}
        components={components}
      >
        {section.markdown}
      </ReactMarkdown>
    );
  },
  (prev, next) =>
    prev.section.key === next.section.key &&
    prev.section.markdown === next.section.markdown &&
    prev.section.startLine === next.section.startLine &&
    prev.isDark === next.isDark &&
    prev.locale === next.locale,
);
