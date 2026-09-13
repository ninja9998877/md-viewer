/**
 * Where the reader had got to in a document, remembered per path.
 *
 * Stored as a heading id plus a pixel offset rather than a raw scroll offset:
 * the preview re-wraps on every font-size change, fold, and window resize, so a
 * scroll offset means nothing by the time it is read back. The id still points
 * at the same line.
 */
export interface ReadingPosition {
  id: string;
  offset: number;
}

const KEY = "md-viewer-reading-position";
/** Positions are tiny, but an unbounded map would still grow forever. */
const MAX = 60;

type PositionMap = Record<string, ReadingPosition>;

function load(): PositionMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PositionMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadReadingPosition(path: string | null): ReadingPosition | null {
  if (!path) return null;
  const position = load()[path];
  if (!position || typeof position.id !== "string" || !position.id) return null;
  return Number.isFinite(position.offset) ? position : null;
}

export function saveReadingPosition(path: string | null, position: ReadingPosition): void {
  if (!path || !position.id) return;
  const map = load();
  // Re-insert rather than overwrite, so key order stays oldest-first and the
  // cap below really does drop the least recently used entry.
  delete map[path];
  map[path] = { id: position.id, offset: position.offset };
  const paths = Object.keys(map);
  for (const stale of paths.slice(0, Math.max(0, paths.length - MAX))) {
    delete map[stale];
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}
