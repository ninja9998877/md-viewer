import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import mermaid from "mermaid";
import { getNodeText, languageLabel } from "../lib/markdown";
import { fmt, useI18n } from "../i18n";

const COLLAPSE_LINES = 28;

/**
 * Colour a unified-diff line by its role.
 *
 * Agents emit ```` ```diff ```` constantly, and with ordinary syntax
 * highlighting a removal looks much like an addition — the single thing a reader
 * needs to see at a glance is which lines are going away.
 */
function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "code-diff__file";
  if (line.startsWith("@@")) return "code-diff__hunk";
  if (line.startsWith("+")) return "code-diff__add";
  if (line.startsWith("-")) return "code-diff__del";
  return "code-diff__ctx";
}

let mermaidTheme: "dark" | "neutral" | null = null;

let mermaidFont: string | null = null;

/**
 * `fontFamily` has to be a real font stack, not `"inherit"`.
 *
 * Mermaid measures every label with a canvas *before* any SVG exists, and sizes
 * the `foreignObject` that holds the text from that measurement. `"inherit"` is
 * not a font it can resolve, so it measures in some default sans-serif while the
 * SVG then renders the page's serif stack — a wider font. The result was labels
 * with their last character clipped: "Measure it" drew as "Measure i", "Section
 * mounted?" as "Section mounted:". Passing the resolved stack makes the
 * measurement and the rendering agree.
 */
function ensureMermaid(isDark: boolean, fontFamily: string) {
  const theme = isDark ? "dark" : "neutral";
  if (mermaidTheme === theme && mermaidFont === fontFamily) return;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "strict",
    fontFamily: fontFamily || "sans-serif",
  });
  mermaidTheme = theme;
  mermaidFont = fontFamily;
}

export function MermaidBlock({ code, isDark }: { code: string; isDark: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!hostRef.current) return;
      setError(null);
      try {
        // Read the font off the host rather than hardcoding it: the diagram must
        // be measured in whatever the reader's theme actually renders it in.
        ensureMermaid(isDark, getComputedStyle(hostRef.current).fontFamily);
        const id = `mmd-${reactId}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && hostRef.current) {
          hostRef.current.innerHTML = svg;
          // Drop the pending marker on the node itself rather than through
          // state: the preview measures sections in a layout effect, which runs
          // before a state update could reach the DOM, and React never
          // re-renders this attribute otherwise (it is static in the JSX below).
          hostRef.current.removeAttribute("data-pending");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          if (hostRef.current) hostRef.current.innerHTML = "";
        }
      }
    };
    void render();
    return () => {
      cancelled = true;
    };
  }, [code, isDark, reactId]);

  const { t } = useI18n();
  if (error) {
    return (
      <div className="mermaid-card mermaid-card--error">
        <div className="alert__kicker">{t.mermaidError}</div>
        <pre>{error}</pre>
      </div>
    );
  }

  // `data-pending` tells the virtual list in MarkdownPreview that this
  // section's height is still a placeholder, so its near-zero measurement must
  // not be recorded as the real one. See `isPending` there.
  return <div className="mermaid-card" ref={hostRef} data-pending="true" />;
}

export function PreBlock({
  children,
  isDark,
  sourceLine,
}: {
  children?: ReactNode;
  isDark: boolean;
  sourceLine?: number;
}) {
  const codeEl = Children.toArray(children).find(isValidElement);
  const className =
    codeEl && isValidElement(codeEl)
      ? String((codeEl.props as { className?: string }).className || "")
      : "";
  const lang = /language-([A-Za-z0-9_+-]+)/.exec(className)?.[1] ?? "";
  // The fence's own label (`title="src/App.tsx"`), carried through by
  // `remarkCodeMeta`. More useful than the language when present.
  const title =
    codeEl && isValidElement(codeEl)
      ? String((codeEl.props as { "data-title"?: string })["data-title"] ?? "")
      : "";
  const raw = useMemo(() => {
    const text = codeEl && isValidElement(codeEl)
      ? getNodeText((codeEl.props as { children?: ReactNode }).children)
      : getNodeText(children);
    return text.replace(/\n$/, "");
  }, [codeEl, children]);

  const lineCount = useMemo(() => {
    if (!raw) return 1;
    return raw.split("\n").length;
  }, [raw]);

  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const canCollapse = lineCount > COLLAPSE_LINES;
  const collapsed = canCollapse && !expanded;

  if (lang === "mermaid") {
    return (
      <div data-source-line={sourceLine}>
        <MermaidBlock code={raw} isDark={isDark} />
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-card" data-source-line={sourceLine}>
      <div className="code-card__bar">
        <span className="code-card__lang" title={title || undefined}>
          {title || languageLabel(lang)}
        </span>
        <span className="code-card__meta">{fmt(t.lines, { n: lineCount })}</span>
        <button type="button" className="code-card__copy" onClick={() => void copy()}>
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <div className={`code-card__body ${collapsed ? "is-collapsed" : ""}`}>
        {lang === "diff" ? (
          <pre className="code-diff">
            {raw.split("\n").map((line, index) => (
              <span key={index} className={diffLineClass(line)}>
                {line || " "}
              </span>
            ))}
          </pre>
        ) : (
          <pre>{codeEl ?? children}</pre>
        )}
      </div>
      {canCollapse ? (
        <button
          type="button"
          className="code-card__more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t.collapseCode : fmt(t.expandCode, { n: lineCount })}
        </button>
      ) : null}
    </div>
  );
}
