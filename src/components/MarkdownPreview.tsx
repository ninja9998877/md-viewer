import {
  forwardRef,
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
    const parsed = useMemo(() => parseDocument(content), [content]);
    const heightsRef = useRef<number[]>([]);
    const pendingJump = useRef<string | null>(null);
    const [range, setRange] = useState({ start: 0, end: 6, padTop: 0, padBottom: 0 });
    const bumpRef = useRef(0);
    const [, setBump] = useState(0);

    const components = useMemo(
      () => createMarkdownComponents(isDark, parsed.idBySourceLine, filePath ?? null),
      [isDark, parsed.idBySourceLine, filePath],
    );

    useLayoutEffect(() => {
      heightsRef.current = parsed.sections.map((section, i) =>
        heightsRef.current[i] && parsed.sections.length === heightsRef.current.length
          ? heightsRef.current[i]
          : estimateHeight(section),
      );
    }, [parsed.sections]);

    const recompute = useCallback(() => {
      const root = scrollParentRef.current;
      if (!root) return;
      const next = visibleWindow(root.scrollTop, root.clientHeight, heightsRef.current, 2);
      setRange((prev) =>
        prev.start === next.start &&
        prev.end === next.end &&
        prev.padTop === next.padTop &&
        prev.padBottom === next.padBottom
          ? prev
          : next,
      );
    }, [scrollParentRef]);

    useEffect(() => {
      const root = scrollParentRef.current;
      if (!root) return;
      recompute();
      const onScroll = () => {
        if (pendingJump.current) return;
        recompute();
      };
      root.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        root.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }, [recompute, parsed.sections, scrollParentRef]);

    const measure = (index: number) => (node: HTMLDivElement | null) => {
      if (!node) return;
      const h = node.offsetHeight;
      if (!h) return;
      if (Math.abs(h - (heightsRef.current[index] ?? 0)) > 4) {
        heightsRef.current[index] = h;
        bumpRef.current += 1;
        if (bumpRef.current % 2 === 0) setBump((n) => n + 1);
        else recompute();
      }
    };

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
        if (target.atStart) {
          root.scrollTop = 0;
          return;
        }
        if (target.atEnd) {
          root.scrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
          return;
        }
        const line = target.cursorLine || target.topLine;
        const index = parsed.sections.findIndex(
          (section) => line >= section.startLine && line <= section.endLine,
        );
        if (index >= 0) {
          const start = Math.max(0, index - 1);
          const end = Math.min(parsed.sections.length, index + 3);
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
        <div className="virtual-list">
          {range.padTop > 0 ? <div style={{ height: range.padTop }} aria-hidden /> : null}
          {visible.map((section, i) => {
            const index = range.start + i;
            return (
              <div key={section.key} ref={measure(index)} data-section={section.key}>
                <SectionMarkdown section={section} components={components} />
              </div>
            );
          })}
          {range.padBottom > 0 ? <div style={{ height: range.padBottom }} aria-hidden /> : null}
        </div>
      </div>
    );
  },
);

function SectionMarkdown({
  section,
  components,
}: {
  section: DocSection;
  components: ReturnType<typeof createMarkdownComponents>;
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
}
