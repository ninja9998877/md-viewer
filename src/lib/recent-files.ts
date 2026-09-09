const KEY = "md-viewer-recent";
const MAX = 12;

export interface RecentFile {
  path: string;
  name: string;
  at: number;
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function isRealPath(path: string): boolean {
  return /[\\/]/.test(path) || /^[a-zA-Z]:/.test(path);
}

export function loadRecent(): RecentFile[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentFile[];
    return Array.isArray(parsed) ? parsed.filter((x) => x && x.path) : [];
  } catch {
    return [];
  }
}

export function rememberRecent(path: string | null): RecentFile[] {
  if (!path || !isRealPath(path)) return loadRecent();
  const next: RecentFile[] = [
    { path, name: fileName(path), at: Date.now() },
    ...loadRecent().filter((item) => item.path !== path),
  ].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
