import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { readMarkdownFile, writeMarkdownFile } from "./lib/fs";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MarkdownEditor, type EditorScrollInfo } from "./components/MarkdownEditor";
import {
  MarkdownPreview,
  type MarkdownPreviewHandle,
  type PreviewAnchor,
} from "./components/MarkdownPreview";
import { TocSidebar } from "./components/TocSidebar";
import { AppMenu } from "./components/AppMenu";
import { parseDocument } from "./lib/markdown-sections";
import { applyReaderSettings, loadReaderSettings, saveReaderSettings, type ReaderSettings } from "./lib/reader-settings";
import {
  forgetRecent,
  loadRecent,
  loadSnapshot,
  rememberRecent,
  saveSnapshot,
  type RecentFile,
} from "./lib/recent-files";
import { shareDocument } from "./lib/share";
import {
  countLines,
  downloadText,
  fileNameOf,
  isMarkdownPath,
  isTauri,
  isTypingTarget,
  isWindows,
} from "./lib/platform";
import { en, fmt, useI18n, zh } from "./i18n";

type ViewMode = "preview" | "split";

function readTheme(): boolean {
  try {
    return localStorage.getItem("md-viewer-theme") === "dark";
  } catch {
    return false;
  }
}

export default function App() {
  const { t, locale, setLocale } = useI18n();
  const [content, setContent] = useState(t.welcome);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isDark, setIsDark] = useState(readTheme);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeHeading, setActiveHeading] = useState("");
  const [previewContent, setPreviewContent] = useState(content);

  const contentRef = useRef(content);
  const filePathRef = useRef(filePath);
  const isDirtyRef = useRef(isDirty);
  const viewModeRef = useRef(viewMode);
  const readerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;
  const [reader, setReader] = useState<ReaderSettings>(() => loadReaderSettings());
  const lineCount = useMemo(() => countLines(content), [content]);
  const fileName = fileNameOf(filePath, t.untitled);
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
    if (!menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuWrapRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  useEffect(() => {
    const title = `${isDirty ? "• " : ""}${fileName} — ${t.productName}`;
    document.title = title;
    if (!isTauri()) return;
    void getCurrentWindow()
      .setTitle(title)
      .catch(() => undefined);
  }, [fileName, isDirty, t.productName]);

  useEffect(() => {
    if (contentRef.current === zh.welcome || contentRef.current === en.welcome) {
      setContent(t.welcome);
      setPreviewContent(t.welcome);
    }
  }, [locale, t.welcome]);

  const confirmDiscard = useCallback(() => {
    if (!isDirtyRef.current) return true;
    return window.confirm(t.confirmDiscard);
  }, [t.confirmDiscard]);

  const loadText = useCallback((text: string, path: string | null, mode: ViewMode) => {
    setContent(text);
    setPreviewContent(text);
    setFilePath(path);
    setIsDirty(false);
    setViewMode(mode);
    setActiveHeading("");
    if (readerRef.current) readerRef.current.scrollTop = 0;
    if (progressRef.current) progressRef.current.style.transform = "scaleX(0)";
  }, []);

  const loadPath = useCallback(
    async (path: string, mode: ViewMode = "preview") => {
      const text = await readMarkdownFile(path);
      loadText(text, path, mode);
      const label = fileNameOf(path, t.untitled);
      setRecent(rememberRecent(path, label));
      // A no-op for plain paths, which is every path on desktop — see
      // `isDurablePath`. On mobile the grant behind a `content://` or a
      // security-scoped `file://` dies with this process, so the copy is the
      // only thing that will let a later launch reopen this document.
      saveSnapshot(path, label, text);
    },
    [loadText, t.untitled],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const md = params.get("md");
    if (!md || !md.startsWith("/examples/") || !isMarkdownPath(md)) return;
    void fetch(md)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${md}`);
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
      window.alert(fmt(t.openFailed, { message }));
    }
  }, [confirmDiscard, loadPath, loadText, t.openFailed]);

  const handleSaveAs = useCallback(async () => {
    const current = contentRef.current;
    try {
      if (!isTauri()) {
        downloadText(fileNameOf(filePathRef.current, t.untitled), current);
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
      window.alert(fmt(t.saveFailed, { message }));
    }
  }, [t.saveFailed, t.untitled]);

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
    loadText(t.newDoc, null, "split");
  }, [confirmDiscard, loadText, t.newDoc]);

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
      }, 160);
    });
  }, []);

  const jumpTo = useCallback((id: string) => {
    previewRef.current?.scrollToHeading(id);
    setActiveHeading(id);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    const openLaunch = async (path: string) => {
      if (lastLaunchRef.current === path) return;
      lastLaunchRef.current = path;
      try {
        await loadPath(path, "preview");
      } catch (err) {
        console.error("Failed to open launch file:", err);
      }
    };

    void (async () => {
      // Register the listener *before* draining the queue. Reversed, an event
      // arriving between the two would be dropped and the file never opened.
      const stop = await listen<string>("open-file", (event) => {
        if (!cancelled) void openLaunch(event.payload);
      });
      if (cancelled) {
        stop();
        return;
      }
      unlisten = stop;
      try {
        // Backstop for the launch path: the backend queues files passed on the
        // command line instead of racing the webview with an event.
        const paths = await invoke<string[]>("take_launch_files");
        if (cancelled) return;
        const path = paths.filter(Boolean).pop();
        if (path) void openLaunch(path);
      } catch (err) {
        console.error("Failed to read launch files:", err);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [loadPath]);

  useEffect(() => {
    if (!isTauri()) return;
    void invoke("watch_markdown", { path: filePath });
  }, [filePath]);

  // Keep the reader's place across a viewport change — resizing the window,
  // dragging it to a display with different scaling, or a foldable changing
  // posture. Without this the text re-wraps and the same scrollTop lands
  // somewhere the reader has never been.
  useEffect(() => {
    let anchor: PreviewAnchor | null = null;
    let debounce = 0;

    const onResize = () => {
      // Capture once per burst, while the pre-reflow layout is still on screen.
      if (debounce === 0) anchor = previewRef.current?.captureAnchor() ?? null;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        debounce = 0;
        const captured = anchor;
        anchor = null;
        if (!captured) return;
        // Section heights are re-measured asynchronously after a reflow, so
        // restore now and once more after those measurements land.
        previewRef.current?.restoreAnchor(captured);
        window.setTimeout(() => previewRef.current?.restoreAnchor(captured), 260);
      }, 180);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(debounce);
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    const unlisten = listen<string>("file-changed", async (event) => {
      if (cancelled) return;
      const path = event.payload;
      if (!path || path !== filePathRef.current || isDirtyRef.current) return;
      try {
        const text = await readMarkdownFile(path);
        if (cancelled || path !== filePathRef.current || isDirtyRef.current) return;
        if (text === contentRef.current) return;
        const scroll = readerRef.current?.scrollTop ?? 0;
        setContent(text);
        setPreviewContent(text);
        requestAnimationFrame(() => {
          if (readerRef.current) readerRef.current.scrollTop = scroll;
        });
        setToast(t.fileUpdated);
      } catch (err) {
        console.error(err);
      }
    });
    return () => {
      cancelled = true;
      void unlisten.then((fn) => fn());
    };
  }, [t.fileUpdated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
      if (e.key === "Escape") {
        if (menuOpenRef.current) {
          setMenuOpen(false);
          return;
        }
        if (viewModeRef.current === "split") {
          setViewMode("preview");
        }
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
        window.alert(t.dropNeedMd);
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
            window.alert(t.dropNeedMd);
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
  }, [confirmDiscard, loadPath, loadText, t.dropNeedMd]);

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
    if (viewMode !== "split") return;
    followEditor.current = true;
    applyEditorScroll(lastEditorScroll.current);
  }, [viewMode, applyEditorScroll]);

  const onReaderScroll = () => {
    const el = readerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const p = max <= 0 ? 1 : el.scrollTop / max;
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
    if (!applyingPreviewScroll.current) followEditor.current = false;
  };

  const handleAssociate = async () => {
    try {
      await invoke("associate_markdown_files");
      window.alert(t.associated);
    } catch (err) {
      window.alert(fmt(t.associateFailed, { error: String(err) }));
    }
  };

  const handleShare = async () => {
    // Read through the ref, not the closed-over `content`: this handler is
    // created on every render but the value it needs is whatever is on screen
    // right now, including edits made since the last render.
    const markdown = `${contentRef.current}\n\n---\n\n${t.shareFooter}\n`;
    const name = fileNameOf(filePathRef.current, t.untitled);
    try {
      const outcome = await shareDocument({ title: name, markdown, filename: name });
      if (outcome === "copied") setToast(t.shareCopied);
      else if (outcome === "downloaded") setToast(t.shareDownloaded);
      // "shared" needs no toast — the share sheet was its own feedback.
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(fmt(t.shareFailed, { message }));
    }
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
      <div className="read-progress" ref={progressRef} />

      {toast ? <div className="live-toast">{toast}</div> : null}

      <header className="chrome">
        <div className="chrome__left">
          <div className="menu-wrap" ref={menuWrapRef}>
            <button
              type="button"
              className={menuOpen ? "is-on" : ""}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {t.menu}
            </button>
            {menuOpen ? (
              <AppMenu
                t={t}
                locale={locale}
                recent={recent}
                canSave={viewMode === "split"}
                tocOpen={tocOpen}
                isDark={isDark}
                reader={reader}
                showAssociate={isTauri() && isWindows()}
                onOpen={() => {
                  setMenuOpen(false);
                  void handleOpen();
                }}
                onNew={() => {
                  setMenuOpen(false);
                  handleNew();
                }}
                onSave={() => {
                  setMenuOpen(false);
                  void handleSave();
                }}
                onRecent={(path) => {
                  setMenuOpen(false);
                  if (!confirmDiscard()) return;
                  void loadPath(path, "preview").catch((err) => {
                    // The stored path is unreachable — the file picker's grant
                    // does not survive the process that received it, so an entry
                    // carried over from an earlier launch can never reopen. Fall
                    // back to the copy taken when it was first read; if there is
                    // none, say so and drop the entry instead of leaving a menu
                    // item that silently does nothing.
                    const snap = loadSnapshot(path);
                    if (snap) {
                      loadText(snap.text, path, "preview");
                      setRecent(rememberRecent(path, snap.name));
                      setToast(t.snapshotOpened);
                      return;
                    }
                    const message = err instanceof Error ? err.message : String(err);
                    setRecent(forgetRecent(path));
                    window.alert(fmt(t.openFailed, { message }));
                  });
                }}
                onToggleToc={() => {
                  setMenuOpen(false);
                  setTocOpen((v) => !v);
                }}
                onFont={(next) => setReader((s) => ({ ...s, fontScale: next }))}
                onPaper={(paper) => setReader((s) => ({ ...s, paper }))}
                onToggleDark={() => setIsDark((v) => !v)}
                onLocale={setLocale}
                onAssociate={() => {
                  setMenuOpen(false);
                  void handleAssociate();
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="chrome__title" title={filePath ?? t.unsavedDoc}>
          {displayName}
          {isDirty ? <span className="chrome__dirty">{t.unsaved}</span> : null}
        </div>

        <div className="chrome__right">
          <button
            type="button"
            className="chrome__ghost"
            title={t.shareHint}
            onClick={() => void handleShare()}
          >
            {t.share}
          </button>
          {viewMode === "preview" ? (
            <button type="button" className="chrome__ghost" onClick={enterEdit}>
              {t.edit}
            </button>
          ) : (
            <button type="button" className="chrome__done" onClick={exitEdit}>
              {t.editDone}
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
              {t.editHint}
            </button>
          ) : null}
        </div>
      </div>

      {viewMode === "split" ? (
        <footer className="status-bar">
          <span>{filePath || t.unsavedDoc}</span>
          <span>{fmt(t.lines, { n: lineCount })}</span>
          <span>{fmt(t.chars, { n: content.length })}</span>
        </footer>
      ) : null}
    </div>
  );
}
