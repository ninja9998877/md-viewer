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
import { rehypeSourceLine, scrollPreviewToLine, type PreviewScrollTarget } from "../lib/source-line";
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

function estimateHeight(section: DocSection): number {
  const lines = Math.max(1, section.endLine - section.startLine + 1);
  return Math.min(2200, Math.max(140, lines * 24));
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

export interface MarkdownPreviewHandle {
  scrollToHeading: (id: string) => void;
  syncToEditor: (target: PreviewScrollTarget) => void;
}

interface MarkdownPreviewProps {
  content: string;
  isDark: boolean;
  filePath?: string | null;
  scrollParentRef: RefObject<HTMLElement | null>;
}

export const MarkdownPreview = forwardRef<MarkdownPreviewHandle, MarkdownPreviewProps>(
  function MarkdownPreview({ content, isDark, filePath, scrollParentRef }, ref) {
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
          if (node.getBoundingClientRect().top < root.getBoundingClientRect().top + 8) {
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
        if (Number.isFinite(index)) applyHeight(node, index, node.offsetHeight);
      }
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const index = Number(el.dataset.sectionIndex);
          if (Number.isFinite(index)) applyHeight(el, index, el.offsetHeight);
        }
      });
      nodes.forEach((node) => ro.observe(node));
      return () => ro.disconnect();
    }, [range.start, range.end, applyHeight]);

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
      setRange({ start, end, padTop, padBottom });
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
      scrollToHeading: (id: string) => {
        const index = parsed.sections.findIndex((section) => section.headingIds.includes(id));
        if (index < 0) return;
        pendingJump.current = id;
        revealIndex(index);
        scrollToSectionIndex(index, "auto");
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
