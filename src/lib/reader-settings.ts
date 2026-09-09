const KEY = "md-viewer-reader";

export type PaperWidth = "narrow" | "normal" | "wide";

export interface ReaderSettings {
  fontScale: number;
  paper: PaperWidth;
}

const PAPER: Record<PaperWidth, string> = {
  narrow: "38rem",
  normal: "46rem",
  wide: "58rem",
};

export function loadReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { fontScale: 1, paper: "normal" };
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    const fontScale = Number(parsed.fontScale);
    const paper: PaperWidth =
      parsed.paper === "narrow" || parsed.paper === "wide" ? parsed.paper : "normal";
    return {
      fontScale: Number.isFinite(fontScale) ? Math.min(1.4, Math.max(0.85, fontScale)) : 1,
      paper,
    };
  } catch {
    return { fontScale: 1, paper: "normal" };
  }
}

export function saveReaderSettings(settings: ReaderSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function applyReaderSettings(settings: ReaderSettings): void {
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(settings.fontScale));
  root.style.setProperty("--paper-max", PAPER[settings.paper]);
}
