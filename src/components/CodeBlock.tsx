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
        if (!cancelled && hostRef.current) hostRef.current.innerHTML = svg;
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

  if (error) {
    return (
      <div className="mermaid-card mermaid-card--error">
        <div className="alert__kicker">图表无法渲染</div>
        <pre>{error}</pre>
      </div>
    );
  }

  return <div className="mermaid-card" ref={hostRef} />;
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
        <span className="code-card__meta">{lineCount} 行</span>
        <button type="button" className="code-card__copy" onClick={() => void copy()}>
          {copied ? "已复制" : "复制"}
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
          {expanded ? "收起代码" : `展开全部 ${lineCount} 行`}
        </button>
      ) : null}
    </div>
  );
}
