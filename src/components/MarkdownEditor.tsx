import { useEffect, useRef } from "react";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

export interface EditorScrollInfo {
  topLine: number;
  bottomLine: number;
  cursorLine: number;
  fraction: number;
  atStart: boolean;
  atEnd: boolean;
  totalLines: number;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  onScroll?: (info: EditorScrollInfo) => void;
}

function lineAtY(view: EditorView, y: number, fallback: number): number {
  const rect = view.scrollDOM.getBoundingClientRect();
  const pos = view.posAtCoords({ x: rect.left + 24, y });
  if (pos == null) return fallback;
  return view.state.doc.lineAt(pos).number;
}

function readScroll(view: EditorView): EditorScrollInfo {
  const scroller = view.scrollDOM;
  const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
  const fraction = clamp01(scroller.scrollTop / max);
  const rect = scroller.getBoundingClientRect();
  const totalLines = Math.max(1, view.state.doc.lines);
  const topLine = lineAtY(view, rect.top + 8, 1);
  const bottomLine = lineAtY(view, rect.bottom - 12, totalLines);
  const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
  return {
    topLine,
    bottomLine: Math.max(topLine, bottomLine),
    cursorLine,
    fraction,
    atStart: scroller.scrollTop <= 2,
    atEnd: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 16,
    totalLines,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function MarkdownEditor({ value, onChange, isDark, onScroll }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onScrollRef = useRef(onScroll);
  onChangeRef.current = onChange;
  onScrollRef.current = onScroll;

  useEffect(() => {
    if (!containerRef.current) return;

    const initial = viewRef.current?.state.doc.toString() ?? value;
    viewRef.current?.destroy();

    const state = EditorState.create({
      doc: initial,
      extensions: [
        basicSetup,
        markdown(),
        isDark ? oneDark : [],
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.docChanged || update.geometryChanged) {
            onScrollRef.current?.(readScroll(update.view));
          }
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
          },
          ".cm-scroller": {
            fontFamily:
              "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    const onScrollerScroll = () => {
      onScrollRef.current?.(readScroll(view));
    };
    view.scrollDOM.addEventListener("scroll", onScrollerScroll, { passive: true });

    return () => {
      view.scrollDOM.removeEventListener("scroll", onScrollerScroll);
      view.destroy();
      if (viewRef.current === view) viewRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="editor-host" />;
}
