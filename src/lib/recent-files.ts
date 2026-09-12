import { fileNameOf } from "./platform";

const KEY = "md-viewer-recent";
const SNAP_KEY = "md-viewer-snapshot";
const MAX = 12;
/** Per-document ceiling for a snapshot. Markdown written by an Agent is rarely
 *  above a few hundred KB, and anything larger is not worth the budget. */
const SNAP_DOC_MAX = 256 * 1024;
/** Total ceiling. localStorage is roughly 5 MB per origin and the recents index
 *  shares it, so stay well clear of the edge. */
const SNAP_TOTAL_MAX = 2 * 1024 * 1024;

export interface RecentFile {
  path: string;
  name: string;
  at: number;
}

interface Snapshot {
  name: string;
  text: string;
}

type SnapshotMap = Record<string, Snapshot>;

function isRealPath(path: string): boolean {
  return /[\\/]/.test(path) || /^[a-zA-Z]:/.test(path);
}

/**
 * True when `path` can be reopened by a later process without help.
 *
 * Android cannot promise that for `content://`. The file picker in
 * tauri-plugin-dialog 2.7.3 uses ACTION_GET_CONTENT (it carries a literal
 * `// TODO: ACTION_OPEN_DOCUMENT ??`), which grants read access only to the
 * receiving activity and *cannot* grant a persistable permission — only
 * ACTION_OPEN_DOCUMENT can. Neither that plugin nor tauri-plugin-fs ever calls
 * takePersistableUriPermission, and the fs reader is
 * `contentResolver.openAssetFileDescriptor`, which needs a live grant. iOS has
 * the same problem with security-scoped `file://` URLs. A plain desktop path is
 * durable, so nothing is ever copied there.
 */
export function isDurablePath(path: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:\/\//i.test(path);
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

/**
 * `resolvedName` is the display name obtained from the native side (see
 * `resolveFileName`). It matters on Android, where `path` is a `content://` URI
 * whose own text carries no readable file name.
 */
export function rememberRecent(path: string | null, resolvedName?: string): RecentFile[] {
  if (!path || !isRealPath(path)) return loadRecent();
  const next: RecentFile[] = [
    { path, name: resolvedName?.trim() || fileNameOf(path), at: Date.now() },
    ...loadRecent().filter((item) => item.path !== path),
  ].slice(0, MAX);
  persist(next);
  return next;
}

/**
 * Drop one entry. Used when reopening fails and no snapshot exists: on Android
 * the `content://` grant and on iOS the security-scoped one both die with the
 * process, so a stale entry would otherwise sit in the menu failing forever.
 */
export function forgetRecent(path: string): RecentFile[] {
  const next = loadRecent().filter((item) => item.path !== path);
  persist(next);
  dropSnapshot(path);
  return next;
}

function persist(entries: RecentFile[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota */
  }
}

function loadSnapshots(): SnapshotMap {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SnapshotMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistSnapshots(map: SnapshotMap): void {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

/**
 * Keep a local copy of a document whose real path we will not be able to reopen
 * later (see `isDurablePath`). Called right after a successful read. Without it
 * a recent entry outlives the grant that made it openable, and tapping it fails
 * forever — which is exactly what an app update looks like, since an update is
 * a restart.
 */
export function saveSnapshot(path: string, name: string, text: string): void {
  if (isDurablePath(path)) return;
  if (text.length > SNAP_DOC_MAX) {
    dropSnapshot(path);
    return;
  }
  const map = loadSnapshots();
  map[path] = { name, text };
  // Bound the store by recency. The recents list is the order of record, so a
  // snapshot for a document that has fallen off it is dropped here too.
  const keep: SnapshotMap = {};
  let total = 0;
  for (const candidate of [path, ...loadRecent().map((item) => item.path)]) {
    const snap = map[candidate];
    if (!snap || keep[candidate]) continue;
    if (total + snap.text.length > SNAP_TOTAL_MAX) continue;
    keep[candidate] = snap;
    total += snap.text.length;
  }
  persistSnapshots(keep);
}

/** The local copy taken by `saveSnapshot`, or null when there is none. */
export function loadSnapshot(path: string): Snapshot | null {
  const snap = loadSnapshots()[path];
  return snap && typeof snap.text === "string" ? snap : null;
}

export function dropSnapshot(path: string): void {
  const map = loadSnapshots();
  if (!(path in map)) return;
  delete map[path];
  persistSnapshots(map);
}
