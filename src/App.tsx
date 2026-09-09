import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readMarkdownFile, writeMarkdownFile } from "./lib/fs";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MarkdownEditor, type EditorScrollInfo } from "./components/MarkdownEditor";
import { MarkdownPreview, type MarkdownPreviewHandle } from "./components/MarkdownPreview";
import { TocSidebar } from "./components/TocSidebar";
import { parseDocument } from "./lib/markdown-sections";
import { applyReaderSettings, loadReaderSettings, saveReaderSettings, type PaperWidth, type ReaderSettings } from "./lib/reader-settings";
import { loadRecent, rememberRecent, type RecentFile } from "./lib/recent-files";
import {
  countLines,
  downloadText,
  fileNameOf,
  isMarkdownPath,
  isTauri,
  isTypingTarget,
} from "./lib/platform";

type ViewMode = "preview" | "split";

const WELCOME = `# 开始阅读

把 Agent 写好的 Markdown 拖进来，或点左上角打开。

这篇阅读器**默认就是预览**。按 E 进入编辑，Esc 回到阅读；O 打开目录。

---

> [!TIP]
> 长文档请先看左侧目录。代码块默认折叠，图表和公式会按原文渲染。
`;

function readTheme(): boolean {
  try {
    return localStorage.getItem("md-viewer-theme") === "dark";
  } catch {
    return false;
  }
}

export default function App() {
  const [content, setContent] = useState(WELCOME);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isDark, setIsDark] = useState(readTheme);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewContent, setPreviewContent] = useState(content);

  const contentRef = useRef(content);
  const filePathRef = useRef(filePath);
  const isDirtyRef = useRef(isDirty);
  const viewModeRef = useRef(viewMode);
  const readerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<MarkdownPreviewHandle>(null);
  const lastLaunchRef = useRef<string | null>(null);
  const lastEditorScroll = useRef<EditorScrollInfo>({
    topLine: 1,
    bottomLine: 1,
    cursorLine: 1,
    fraction: 0,
    atStart: true,
    atEnd: false,
    totalLines: 1,
  });
  const followEditor = useRef(true);
  const applyingPreviewScroll = useRef(false);
  const scrollRaf = useRef(0);

  contentRef.current = content;
  filePathRef.current = filePath;
  isDirtyRef.current = isDirty;
  viewModeRef.current = viewMode;

  const toc = useMemo(() => parseDocument(content).toc, [content]);
  const [recent, setRecent] = useState<RecentFile[]>(() => loadRecent());
  const [recentOpen, setRecentOpen] = useState(false);
  const [reader, setReader] = useState<ReaderSettings>(() => loadReaderSettings());
  const lineCount = useMemo(() => countLines(content), [content]);
  const fileName = fileNameOf(filePath);
  const displayName = isDirty ? `${fileName} •` : fileName;

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewContent(content), 80);
    return () => window.clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    applyReaderSettings(reader);
    saveReaderSettings(reader);
  }, [reader]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("md-viewer-theme", isDark ? "dark" : "light");
    } catch {
      /* ignore quota */
    }
  }, [isDark]);

  useEffect(() => {
    const title = `${isDirty ? "• " : ""}${fileName} — MD Viewer`;
    document.title = title;
    if (!isTauri()) return;
    void getCurrentWindow()
      .setTitle(title)
      .catch(() => undefined);
  }, [fileName, isDirty]);

  const confirmDiscard = useCallback(() => {
    if (!isDirtyRef.current) return true;
    return window.confirm("有未保存的更改，确定要放弃吗？");
  }, []);

  const loadText = useCallback((text: string, path: string | null, mode: ViewMode) => {
    setContent(text);
    setPreviewContent(text);
    setFilePath(path);
    setIsDirty(false);
    setViewMode(mode);
    setActiveHeading("");
    setProgress(0);
    if (readerRef.current) readerRef.current.scrollTop = 0;
  }, []);

  const loadPath = useCallback(
    async (path: string, mode: ViewMode = "preview") => {
      const text = await readMarkdownFile(path);
      loadText(text, path, mode);
      setRecent(rememberRecent(path));
    },
    [loadText],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const md = params.get("md");
    if (!md || !md.startsWith("/examples/") || !isMarkdownPath(md)) return;
    void fetch(md)
      .then((res) => {
        if (!res.ok) throw new Error(`无法加载 ${md}`);
        return res.text();
      })
      .then((text) => loadText(text, md, "preview"))
      .catch((err) => console.error(err));
  }, [loadText]);

  const handleOpen = useCallback(async () => {
    if (!confirmDiscard()) return;
    try {
      if (isTauri()) {
        const selected = await open({
          multiple: false,
          filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
        });
        if (selected && typeof selected === "string") {
          await loadPath(selected, "preview");
        }
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".md,.markdown,.txt";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        loadText(await file.text(), file.name, "preview");
      };
      input.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(`打开文件失败\n${message}`);
    }
  }, [confirmDiscard, loadPath, loadText]);

  const handleSaveAs = useCallback(async () => {
    const current = contentRef.current;
    try {
      if (!isTauri()) {
        downloadText(fileNameOf(filePathRef.current), current);
        setIsDirty(false);
        return;
      }
      const selected = await save({
        filters: [{ name: "Markdown", extensions: ["md"] }],
        defaultPath: filePathRef.current || "untitled.md",
      });
      if (selected) {
        await writeMarkdownFile(selected, current);
        setFilePath(selected);
        setIsDirty(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(`保存失败\n${message}`);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const path = filePathRef.current;
    if (!path || path === fileNameOf(path)) {
      await handleSaveAs();
      return;
    }
    try {
      await writeMarkdownFile(path, contentRef.current);
      setIsDirty(false);
    } catch {
      await handleSaveAs();
    }
  }, [handleSaveAs]);

  const handleNew = useCallback(() => {
    if (!confirmDiscard()) return;
    loadText("# 新文档\n\n", null, "split");
  }, [confirmDiscard, loadText]);

  const handleContentChange = useCallback((next: string) => {
    setContent(next);
    setIsDirty(true);
  }, []);

  const applyEditorScroll = useCallback((info: EditorScrollInfo) => {
    lastEditorScroll.current = info;
    followEditor.current = true;
    if (viewModeRef.current !== "split") return;
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      const pane = readerRef.current;
      if (!pane || viewModeRef.current !== "split") return;
      applyingPreviewScroll.current = true;
      previewRef.current?.syncToEditor(info);
      window.setTimeout(() => {
        applyingPreviewScroll.current = false;
      }, 40);
    });
  }, []);

  const jumpTo = useCallback((id: string) => {
    previewRef.current?.scrollToHeading(id);
    setActiveHeading(id);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;

    const openLaunch = async (path: string) => {
      if (lastLaunchRef.current === path) return;
      lastLaunchRef.current = path;
      try {
        await loadPath(path, "preview");
      } catch (err) {
        console.error("Failed to open launch file:", err);
      }
    };

    const unlisten = listen<string>("open-file", (event) => {
      if (!cancelled) void openLaunch(event.payload);
    });

    return () => {
      cancelled = true;
      void unlisten.then((fn) => fn());
    };
  }, [loadPath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const typing = isTypingTarget(e.target);

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void handleOpen();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNew();
        return;
      }
      if (e.key === "Escape" && viewModeRef.current === "split") {
        setViewMode("preview");
        return;
      }
      if (typing || mod) return;
      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setViewMode((m) => (m === "preview" ? "split" : "preview"));
        return;
      }
      if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        setTocOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNew, handleOpen, handleSave]);

  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const openDroppedFile = async (file: File) => {
      if (!confirmDiscard()) return;
      if (!isMarkdownPath(file.name)) {
        window.alert("请拖入 .md 或 .markdown 文件");
        return;
      }
      loadText(await file.text(), file.name, "preview");
    };

    if (isTauri()) {
      void getCurrentWindow()
        .onDragDropEvent(async (event) => {
          if (event.payload.type !== "drop") return;
          const path = event.payload.paths[0];
          if (!path) return;
          if (!isMarkdownPath(path)) {
            window.alert("请拖入 .md 或 .markdown 文件");
            return;
          }
          if (!confirmDiscard()) return;
          try {
            await loadPath(path, "preview");
          } catch (err) {
            console.error(err);
          }
        })
        .then((fn) => {
          if (cancelled) fn();
          else unlisten = fn;
        })
        .catch(() => undefined);
    } else {
      const onDrop = (e: DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) void openDroppedFile(file);
      };
      window.addEventListener("drop", onDrop);
      unlisten = () => window.removeEventListener("drop", onDrop);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
      unlisten?.();
    };
  }, [confirmDiscard, loadPath, loadText]);

  useEffect(() => {
    const root = readerRef.current;
    if (!root) return;
    const nodes = [
      ...root.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"),
    ];
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveHeading(visible[0].target.id);
      },
      { root, rootMargin: "0px 0px -62% 0px", threshold: [0, 1] },
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [previewContent, viewMode, tocOpen]);

  useEffect(() => {
    if (viewMode !== "split" || !followEditor.current) return;
    applyEditorScroll(lastEditorScroll.current);
  }, [previewContent, viewMode, applyEditorScroll]);

  const onReaderScroll = () => {
    const el = readerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max <= 0 ? 1 : el.scrollTop / max);
    if (!applyingPreviewScroll.current) followEditor.current = false;
  };

  const cyclePaper = () => {
    const order: PaperWidth[] = ["narrow", "normal", "wide"];
    const next = order[(order.indexOf(reader.paper) + 1) % order.length];
    setReader((s) => ({ ...s, paper: next }));
  };

  const enterEdit = () => {
    followEditor.current = true;
    setViewMode("split");
  };
  const exitEdit = () => setViewMode("preview");

  const onPreviewDoubleClick = () => {
    if (viewMode !== "preview") return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) return;
    enterEdit();
  };

  return (
    <div className={`app ${viewMode === "split" ? "is-split" : "is-reading"} ${tocOpen ? "has-toc" : ""}`}>
      <div className="read-progress" style={{ transform: `scaleX(${progress})` }} />

      <header className="chrome">
        <div className="chrome__left">
          <button type="button" onClick={() => void handleOpen()}>
            打开
          </button>
          {recent.length > 0 ? (
            <div className="recent-wrap">
              <button type="button" className={recentOpen ? "is-on" : ""} onClick={() => setRecentOpen((v) => !v)}>
                最近
              </button>
              {recentOpen ? (
                <ul className="recent-menu">
                  {recent.map((item) => (
                    <li key={item.path}>
                      <button
                        type="button"
                        title={item.path}
                        onClick={() => {
                          setRecentOpen(false);
                          if (!confirmDiscard()) return;
                          void loadPath(item.path, "preview");
                        }}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <button type="button" onClick={handleNew}>
            新建
          </button>
          {viewMode === "split" ? (
            <button type="button" onClick={() => void handleSave()}>
              保存
            </button>
          ) : null}
        </div>

        <div className="chrome__title" title={filePath ?? "未保存的文档"}>
          {displayName}
          {isDirty ? <span className="chrome__dirty">未保存</span> : null}
        </div>

        <div className="chrome__right">
          <button type="button" title="缩小字号" onClick={() => setReader((s) => ({ ...s, fontScale: Math.max(0.85, +(s.fontScale - 0.08).toFixed(2)) }))}>
            A−
          </button>
          <button type="button" title="放大字号" onClick={() => setReader((s) => ({ ...s, fontScale: Math.min(1.4, +(s.fontScale + 0.08).toFixed(2)) }))}>
            A+
          </button>
          <button type="button" title="纸面宽度" onClick={cyclePaper}>
            {reader.paper === "narrow" ? "窄" : reader.paper === "wide" ? "宽" : "中"}
          </button>
          <button
            type="button"
            className={tocOpen ? "is-on" : ""}
            onClick={() => setTocOpen((v) => !v)}
            title="目录（O）"
          >
            目录
          </button>
          <button type="button" onClick={() => setIsDark((v) => !v)}>
            {isDark ? "浅色" : "深色"}
          </button>
          {viewMode === "preview" ? (
            <button type="button" className="chrome__ghost" onClick={enterEdit}>
              编辑
            </button>
          ) : (
            <button type="button" className="chrome__done" onClick={exitEdit}>
              完成编辑
            </button>
          )}
        </div>
      </header>

      <div className="workspace">
        {tocOpen ? (
          <TocSidebar items={toc} activeId={activeHeading} onJump={jumpTo} />
        ) : null}

        {viewMode === "split" ? (
          <div className="editor-pane">
            <MarkdownEditor
              value={content}
              onChange={handleContentChange}
              isDark={isDark}
              onScroll={applyEditorScroll}
            />
          </div>
        ) : null}

        <div
          className="reader"
          ref={readerRef}
          onScroll={onReaderScroll}
          onDoubleClick={onPreviewDoubleClick}
        >
          <article className="paper">
            <MarkdownPreview
              ref={previewRef}
              content={previewContent}
              isDark={isDark}
              filePath={filePath}
              scrollParentRef={readerRef}
            />
          </article>

          {viewMode === "preview" ? (
            <button type="button" className="floating-edit" onClick={enterEdit}>
              编辑 · E
            </button>
          ) : null}
        </div>
      </div>

      {viewMode === "split" ? (
        <footer className="status-bar">
          <span>{filePath || "未保存的文档"}</span>
          <span>{lineCount} 行</span>
          <span>{content.length} 字</span>
        </footer>
      ) : null}
    </div>
  );
}
