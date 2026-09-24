/**
 * Japanese.
 *
 * Not a transliteration of the English: where the two would read differently,
 * the Japanese phrasing wins. "読みましょう" rather than a literal rendering of
 * "Start reading", 「ヒント」 for GitHub's TIP alert (the convention Japanese
 * Markdown tooling already uses), and 「〜してください」 throughout — machine
 * translation tends to leave the blunt imperative English uses, which reads as
 * rude in a UI.
 *
 * Worth a native read before release; a translator can improve wording, but the
 * meanings here are deliberate rather than guessed.
 */
export const ja = {
  productName: "Moye",
  menu: "メニュー",
  open: "開く",
  recent: "最近使った項目",
  forgetHint: "長押しで削除",
  forgetConfirm: "この項目を削除しますか?",
  forget: "削除",
  cancel: "キャンセル",
  newFile: "新規",
  save: "保存",
  share: "共有",
  shareHint: "この文書を共有",
  shareCopied: "コピーしました — チャットに貼り付けてください",
  shareDownloaded: "新しいファイルとして保存しました",
  shareFailed: "共有できませんでした\n{message}",
  shareUnavailable: "このビルドでは共有もクリップボードへの書き込みもできません",
  opening: "開いています…",
  openTimeout: "ファイルの読み込みがタイムアウトしました — もう一度お試しください。",
  openInterrupted:
    "前回の読み込みが中断されました(Android が Moye を終了しました)。ファイルをもう一度選択してください。",
  // 共有文書の末尾に付く一行。宣伝文ではなく事実の記述: エージェントが書いた
  // 文書を読むためのもので、完全にローカルで動く。後半は marketing ではなく、
  // APK が INTERNET 権限を落としていることの説明でもある。
  shareFooter:
    "> 📖 **Moye** — エージェントが書いた Markdown を読むためのリーダー · 完全ローカル、ネットワークなし\n> iPhone でも同じように読めます → https://apps.apple.com/cn/app/id6811943403",
  snapshotOpened: "元のファイルにアクセスできないため、ローカルコピーを開きました",
  unsaved: "未保存",
  unsavedDoc: "無題の文書",
  untitled: "無題",
  fontDown: "文字を小さく",
  fontUp: "文字を大きく",
  paperWidth: "ページ幅",
  paperNarrow: "狭い",
  paperNormal: "標準",
  paperWide: "広い",
  toc: "目次",
  tocShortcut: "目次 (O)",
  tocEmpty: "この文書に見出しはありません",
  find: "検索",
  findPlaceholder: "この文書内を検索",
  findPrev: "前の一致",
  findNext: "次の一致",
  findClose: "検索を閉じる",
  findNoMatch: "一致なし",
  findCount: "{n}/{total}",
  ok: "OK",
  version: "バージョン",
  feedback: "問題を報告",
  iosApp: "iPhone 版",
  iosAppHint: "同じ文書をスマホでも —— App Store にあります",
  feedbackCopied: "診断情報をコピーしました — Issue に貼り付けてください",
  clipboard: "クリップボードを読む",
  clipboardTitle: "クリップボードのテキスト",
  clipboardEmpty: "クリップボードに読める内容がありません",
  clipboardOpened: "クリップボードの内容を開きました",
  clipboardFailed: "クリップボードを読み取れませんでした\n{message}",
  refCopied: "参照をコピーしました",
  lightboxClose: "画像を閉じる",
  lightboxHint: "ダブルタップで拡大 · ドラッグで移動 · Esc で閉じる",
  associate: "既定のアプリに設定",
  associateTitle: ".md ファイルを Moye で開く",
  light: "ライト",
  dark: "ダーク",
  edit: "編集",
  editDone: "完了",
  editHint: "編集 · E",
  fontSize: "文字サイズ",
  appearance: "外観",
  language: "言語",
  langZh: "中文",
  langZhHant: "繁體中文",
  langEn: "English",
  langJa: "日本語",
  langDe: "Deutsch",
  fileUpdated: "ファイルを更新しました",
  langSwitch: "あ",
  langSwitchTitle: "日本語に切り替え",
  confirmDiscard: "未保存の変更を破棄しますか?",
  openFailed: "ファイルを開けませんでした\n{message}",
  saveFailed: "保存できませんでした\n{message}",
  dropNeedMd: ".md または .markdown ファイルをドロップ",
  associated:
    "Moye を Markdown ファイルの既定のアプリに設定しました。ほかのアプリが開いてしまう場合は、エクスプローラーのウィンドウを閉じてからもう一度お試しください。",
  associateFailed: "既定のアプリに設定できませんでした\n{error}",
  lines: "{n} 行",
  chars: "{n} 文字",
  copy: "コピー",
  copied: "コピーしました",
  collapseCode: "折りたたむ",
  expandCode: "{n} 行すべて表示",
  mermaidError: "図を描画できませんでした",
  alertNote: "注記",
  alertTip: "ヒント",
  alertImportant: "重要",
  alertWarning: "警告",
  alertCaution: "注意",
  newDoc: "# 無題\n\n",
  welcome: `# 読んでみましょう

エージェントが書いた Markdown をドロップするか、メニューからファイルを開いてください。

このリーダーは**プレビューで開きます**。E で編集、Esc で戻る、O で目次です。

---

> [!TIP]
> 長い文書では目次を使ってください。コードブロックは折りたたまれた状態で始まり、図と数式はその場で描画されます。
`,
  // スマートフォンにはキーボードがないため、上の E / Esc / O は使えない。
  // App.tsx の welcome 分岐を参照。
  welcomeMobile: `# 読んでみましょう

メニューから Markdown ファイルを選ぶか、ほかのアプリから Moye に共有してください。

**このリーダーはプレビューで開きます。** 鉛筆アイコンで編集、目次はメニューにあります。クリップボードに内容があれば、メニューから直接読み込めます。

---

> [!TIP]
> 長い文書は目次から始めると便利です。コードブロックは折りたたまれた状態で始まり、図と数式はその場で描画されます。
`,
};
