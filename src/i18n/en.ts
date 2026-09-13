export const en = {
  productName: "Moye",
  menu: "Menu",
  open: "Open",
  recent: "Recent",
  forgetHint: "Hold to delete",
  forgetConfirm: "Delete this entry?",
  forget: "Delete",
  cancel: "Cancel",
  newFile: "New",
  save: "Save",
  share: "Share",
  shareHint: "Share this document",
  shareCopied: "Copied — paste it into your chat",
  shareDownloaded: "Saved as a new file",
  shareFailed: "Could not share\n{message}",
  shareUnavailable: "This build cannot share, and the clipboard is unreachable",
  opening: "Opening…",
  openTimeout: "Timed out reading the file — try again.",
  openInterrupted:
    "The last open was interrupted (Android reclaimed Moye). Please pick the file again.",
  // Attribution appended to the end of a shared document: one line carrying both
  // selling points — written for Agents, and purely local with no networking.
  // The second half is not marketing copy: the APK strips the INTERNET
  // permission, see scripts/patch-android-manifest.py.
  // Deliberately linkless: there is no website yet and the desktop repo is not
  // public, so a URL here would just be a dead end. The emoji stands in for an
  // icon so nothing has to be hosted — every Markdown renderer can show it.
  shareFooter: "> 📖 **Moye** — a Markdown reader built for Agents · fully local, no network",
  snapshotOpened: "The original is unreachable — opened the local copy",
  unsaved: "Unsaved",
  unsavedDoc: "Untitled document",
  untitled: "Untitled",
  fontDown: "Smaller text",
  fontUp: "Larger text",
  paperWidth: "Page width",
  paperNarrow: "Narrow",
  paperNormal: "Medium",
  paperWide: "Wide",
  toc: "Contents",
  tocShortcut: "Contents (O)",
  tocEmpty: "This document has no headings",
  find: "Find",
  findPlaceholder: "Find in this document",
  findPrev: "Previous match",
  findNext: "Next match",
  findClose: "Close find",
  findNoMatch: "No results",
  findCount: "{n}/{total}",
  ok: "OK",
  version: "Version",
  diagnostics: "Copy diagnostics",
  clipboard: "Read clipboard",
  clipboardTitle: "Clipboard text",
  clipboardEmpty: "Nothing to read on the clipboard",
  clipboardOpened: "Opened the clipboard contents",
  clipboardFailed: "Could not read the clipboard\n{message}",
  refCopied: "Reference copied",
  diagnosticsCopied: "Diagnostics copied",
  lightboxClose: "Close image",
  lightboxHint: "Double-tap to zoom · drag to pan · Esc to close",
  associate: "Set default",
  associateTitle: "Open .md files with Moye",
  light: "Light",
  dark: "Dark",
  edit: "Edit",
  editDone: "Done",
  editHint: "Edit · E",
  fontSize: "Type size",
  appearance: "Appearance",
  language: "Language",
  langZh: "中文",
  langEn: "English",
  fileUpdated: "File updated",
  langSwitch: "中",
  langSwitchTitle: "切换到中文",
  confirmDiscard: "Discard unsaved changes?",
  openFailed: "Could not open the file\n{message}",
  saveFailed: "Could not save\n{message}",
  dropNeedMd: "Drop a .md or .markdown file",
  associated:
    "Moye is now the default app for Markdown files. If another app still opens them, close File Explorer windows and try again.",
  associateFailed: "Could not set the default app\n{error}",
  lines: "{n} lines",
  chars: "{n} chars",
  copy: "Copy",
  copied: "Copied",
  collapseCode: "Collapse",
  expandCode: "Show all {n} lines",
  mermaidError: "Could not render diagram",
  alertNote: "Note",
  alertTip: "Tip",
  alertImportant: "Important",
  alertWarning: "Warning",
  alertCaution: "Caution",
  newDoc: "# Untitled\n\n",
  welcome: `# Start reading

Drop in Markdown from an Agent, or open a file from the menu.

This reader **starts in preview**. Press E to edit, Esc to go back; O for the table of contents.

---

> [!TIP]
> Use the contents list for long docs. Code blocks start collapsed; diagrams and formulas render in place.
`,
};
