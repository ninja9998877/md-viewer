/**
 * Traditional Chinese.
 *
 * Not a character-by-character conversion of the Simplified catalogue. The two
 * are separate App Store locales, and a Taiwanese reader notices vocabulary
 * before they notice glyphs: 檔案 not 文件, 儲存 not 保存, 選單 not 菜單,
 * 剪貼簿 not 剪貼板, 字級 not 字號. A mechanical conversion produces text that
 * looks Traditional and reads as foreign.
 */
export const zhHant = {
  productName: "墨頁",
  menu: "選單",
  open: "開啟",
  recent: "最近",
  forgetHint: "長按可刪除",
  forgetConfirm: "刪除這筆記錄?",
  forget: "刪除",
  cancel: "取消",
  newFile: "新增",
  save: "儲存",
  share: "分享",
  shareHint: "分享這份文件",
  shareCopied: "已複製到剪貼簿,到聊天視窗貼上即可",
  shareDownloaded: "已匯出為新檔案",
  shareFailed: "分享失敗\n{message}",
  shareUnavailable: "這個環境既不能分享,也寫不進剪貼簿",
  opening: "正在開啟…",
  openTimeout: "讀取逾時,請再試一次",
  openInterrupted: "上次開啟檔案被系統中斷了(墨頁被系統回收),請重新選擇一次",
  // 分享出去時附在正文末尾的署名,要在一行裡說清兩個賣點:為 Agent 而寫、
  // 以及純本機不連網。後半句不是宣傳語 —— APK 裡已經剝掉了 INTERNET 權限,
  // 見 scripts/patch-android-manifest.py。
  shareFooter: "> 📖 **墨頁 Moye** — 專為 Agent 設計的 Markdown 閱讀器 · 純本機,不連網",
  snapshotOpened: "原始檔案已失效,已開啟本機快照",
  unsaved: "未儲存",
  unsavedDoc: "未儲存的文件",
  untitled: "未命名文件",
  fontDown: "縮小字級",
  fontUp: "放大字級",
  paperWidth: "版面寬度",
  paperNarrow: "窄",
  paperNormal: "中",
  paperWide: "寬",
  toc: "目錄",
  tocShortcut: "目錄(O)",
  tocEmpty: "這份文件沒有標題",
  find: "搜尋",
  findPlaceholder: "在文件裡搜尋",
  findPrev: "上一個",
  findNext: "下一個",
  findClose: "關閉搜尋",
  findNoMatch: "沒有結果",
  findCount: "{n}/{total}",
  ok: "確定",
  version: "版本",
  feedback: "回報問題",
  iosApp: "iPhone 版",
  iosAppHint: "在手機上讀同一件事 —— 在 App Store 上",
  feedbackCopied: "診斷資訊已複製，貼到 Issue 裡就行",
  clipboard: "讀取剪貼簿",
  clipboardTitle: "剪貼簿內容",
  clipboardEmpty: "剪貼簿裡沒有文字",
  clipboardOpened: "已開啟剪貼簿內容",
  clipboardFailed: "讀取剪貼簿失敗\n{message}",
  refCopied: "引用已複製",
  lightboxClose: "關閉圖片",
  lightboxHint: "按兩下放大 · 拖曳平移 · Esc 關閉",
  associate: "設為預設",
  associateTitle: "把 .md 設為用墨頁開啟",
  light: "淺色",
  dark: "深色",
  edit: "編輯",
  editDone: "完成編輯",
  editHint: "編輯 · E",
  fontSize: "字級",
  appearance: "外觀",
  language: "語言",
  langZh: "中文",
  langZhHant: "繁體中文",
  langEn: "English",
  langJa: "日本語",
  langDe: "Deutsch",
  fileUpdated: "檔案已更新",
  langSwitch: "EN",
  langSwitchTitle: "Switch to English",
  confirmDiscard: "有未儲存的變更,確定要放棄嗎?",
  openFailed: "開啟檔案失敗\n{message}",
  saveFailed: "儲存失敗\n{message}",
  dropNeedMd: "請拖入 .md 或 .markdown 檔案",
  associated:
    "已把墨頁設為 .md 預設開啟方式。若仍用其他軟體開啟,請關掉檔案總管視窗後再按兩下一次。",
  associateFailed: "設定失敗\n{error}",
  lines: "{n} 行",
  chars: "{n} 字",
  copy: "複製",
  copied: "已複製",
  collapseCode: "收合程式碼",
  expandCode: "展開全部 {n} 行",
  mermaidError: "圖表無法轉譯",
  alertNote: "備註",
  alertTip: "提示",
  alertImportant: "重要",
  alertWarning: "警告",
  alertCaution: "注意",
  newDoc: "# 新文件\n\n",
  welcome: `# 開始閱讀

把 Agent 寫好的 Markdown 拖進來,或點左上角選單開啟。

這套閱讀器**預設就是預覽**。按 E 進入編輯,Esc 回到閱讀;O 開啟目錄。

---

> [!TIP]
> 長文件請先看目錄。程式碼區塊預設收合,圖表和公式會依原文轉譯。
`,
  // 手機沒有鍵盤,上面那段 E / Esc / O 在手機上無法照做,所以手機版另寫一份。
  welcomeMobile: `# 開始閱讀

用選單裡的「開啟」選一份 Markdown,或從其他應用程式直接分享到墨頁。

**預設就是預覽**。點右上角的鉛筆進入編輯,目錄在選單裡;剪貼簿有內容時,選單裡也能直接讀進來。

---

> [!TIP]
> 長文件先看目錄。程式碼區塊預設收合,圖表和公式會依原文轉譯。
`,
};
