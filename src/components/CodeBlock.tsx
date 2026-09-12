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

let mermaidTheme: "dark" | "neutral" | null = null;

function ensureMermaid(isDark: boolean) {
  const theme = isDark ? "dark" : "neutral";
  if (mermaidTheme === theme) return;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "strict",
    fontFamily: "inherit",
  });
  mermaidTheme = theme;
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
        ensureMermaid(isDark);
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
        <span className="code-card__lang">{languageLabel(lang)}</span>
        <span className="code-card__meta">{fmt(t.lines, { n: lineCount })}</span>
        <button type="button" className="code-card__copy" onClick={() => void copy()}>
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <div className={`code-card__body ${collapsed ? "is-collapsed" : ""}`}>
        <pre>{codeEl ?? children}</pre>
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
