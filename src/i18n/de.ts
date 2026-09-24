/**
 * German.
 *
 * Uses "du" rather than "Sie". This is a personal tool, not a corporate one,
 * and German software convention has moved to the informal address for apps of
 * this kind; "Sie" here would read as a bank's terms of service. Where a
 * pronoun can be avoided without contorting the sentence, it is.
 */
export const de = {
  productName: "Moye",
  menu: "Menü",
  open: "Öffnen",
  recent: "Zuletzt",
  forgetHint: "Zum Löschen halten",
  forgetConfirm: "Diesen Eintrag löschen?",
  forget: "Löschen",
  cancel: "Abbrechen",
  newFile: "Neu",
  save: "Speichern",
  share: "Teilen",
  shareHint: "Dieses Dokument teilen",
  shareCopied: "Kopiert – im Chat einfügen",
  shareDownloaded: "Als neue Datei gespeichert",
  shareFailed: "Teilen fehlgeschlagen\n{message}",
  shareUnavailable: "Diese Version kann weder teilen noch in die Zwischenablage schreiben",
  opening: "Wird geöffnet…",
  openTimeout: "Zeitüberschreitung beim Lesen – bitte erneut versuchen.",
  openInterrupted:
    "Das letzte Öffnen wurde unterbrochen (Android hat Moye beendet). Bitte die Datei erneut auswählen.",
  // Die Zeile am Ende eines geteilten Dokuments. Keine Werbung, sondern eine
  // Tatsachenbehauptung: für Dokumente aus Agenten gebaut, vollständig lokal.
  shareFooter:
    "> 📖 **Moye** — ein Markdown-Reader für Dokumente aus Agenten · vollständig lokal, ohne Netzwerk\n> So lesen auf dem iPhone → https://apps.apple.com/cn/app/id6811943403",
  snapshotOpened: "Das Original ist nicht erreichbar – lokale Kopie geöffnet",
  unsaved: "Ungespeichert",
  unsavedDoc: "Unbenanntes Dokument",
  untitled: "Unbenannt",
  fontDown: "Kleinerer Text",
  fontUp: "Größerer Text",
  paperWidth: "Seitenbreite",
  paperNarrow: "Schmal",
  paperNormal: "Mittel",
  paperWide: "Breit",
  toc: "Inhalt",
  tocShortcut: "Inhalt (O)",
  tocEmpty: "Dieses Dokument hat keine Überschriften",
  find: "Suchen",
  findPlaceholder: "In diesem Dokument suchen",
  findPrev: "Vorheriger Treffer",
  findNext: "Nächster Treffer",
  findClose: "Suche schließen",
  findNoMatch: "Keine Treffer",
  findCount: "{n}/{total}",
  ok: "OK",
  version: "Version",
  feedback: "Problem melden",
  iosApp: "iPhone-App",
  iosAppHint: "Dieselben Dokumente auf dem Telefon — im App Store",
  feedbackCopied: "Diagnose kopiert – in das Issue einfügen",
  clipboard: "Zwischenablage lesen",
  clipboardTitle: "Text aus der Zwischenablage",
  clipboardEmpty: "Kein Text in der Zwischenablage",
  clipboardOpened: "Inhalt der Zwischenablage geöffnet",
  clipboardFailed: "Zwischenablage konnte nicht gelesen werden\n{message}",
  refCopied: "Verweis kopiert",
  lightboxClose: "Bild schließen",
  lightboxHint: "Doppeltippen zum Zoomen · ziehen zum Verschieben · Esc zum Schließen",
  associate: "Als Standard",
  associateTitle: ".md-Dateien mit Moye öffnen",
  light: "Hell",
  dark: "Dunkel",
  edit: "Bearbeiten",
  editDone: "Fertig",
  editHint: "Bearbeiten · E",
  fontSize: "Schriftgröße",
  appearance: "Darstellung",
  language: "Sprache",
  langZh: "中文",
  langZhHant: "繁體中文",
  langEn: "English",
  langJa: "日本語",
  langDe: "Deutsch",
  fileUpdated: "Datei aktualisiert",
  langSwitch: "EN",
  langSwitchTitle: "Switch to English",
  confirmDiscard: "Ungespeicherte Änderungen verwerfen?",
  openFailed: "Datei konnte nicht geöffnet werden\n{message}",
  saveFailed: "Speichern fehlgeschlagen\n{message}",
  dropNeedMd: ".md- oder .markdown-Datei ablegen",
  associated:
    "Moye ist jetzt die Standard-App für Markdown-Dateien. Falls eine andere App sie weiterhin öffnet, schließe die Explorer-Fenster und versuche es erneut.",
  associateFailed: "Standard-App konnte nicht festgelegt werden\n{error}",
  lines: "{n} Zeilen",
  chars: "{n} Zeichen",
  copy: "Kopieren",
  copied: "Kopiert",
  collapseCode: "Einklappen",
  expandCode: "Alle {n} Zeilen anzeigen",
  mermaidError: "Diagramm konnte nicht dargestellt werden",
  alertNote: "Hinweis",
  alertTip: "Tipp",
  alertImportant: "Wichtig",
  alertWarning: "Warnung",
  alertCaution: "Vorsicht",
  newDoc: "# Unbenannt\n\n",
  welcome: `# Loslesen

Markdown aus einem Agenten hierher ziehen – oder über das Menü oben links öffnen.

Dieser Reader **startet in der Vorschau**. E zum Bearbeiten, Esc zurück, O für den Inhalt.

---

> [!TIP]
> Bei langen Dokumenten zuerst den Inhalt ansehen. Codeblöcke sind eingeklappt, Diagramme und Formeln werden an Ort und Stelle dargestellt.
`,
  // Auf dem Telefon gibt es keine Tastatur, die Hinweise oben wären dort also
  // nicht befolgbar. Siehe den welcome-Zweig in App.tsx.
  welcomeMobile: `# Loslesen

Über das Menü eine Markdown-Datei wählen oder eine aus einer anderen App an Moye teilen.

**Dieser Reader startet in der Vorschau.** Zum Bearbeiten auf den Stift tippen, der Inhalt liegt im Menü. Was in der Zwischenablage liegt, lässt sich dort direkt einlesen.

---

> [!TIP]
> Bei langen Dokumenten zuerst den Inhalt ansehen. Codeblöcke sind eingeklappt, Diagramme und Formeln werden an Ort und Stelle dargestellt.
`,
};
