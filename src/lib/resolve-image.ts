import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

/** Join a directory and a relative path, keeping whichever separator the
 *  directory already uses. Exported so file-reference links resolve the same
 *  way images do. */
export function joinPath(dir: string, rel: string): string {
  const left = dir.replace(/[\\/]+$/, "");
  const right = rel.replace(/^[\\/]+/, "");
  const sep = dir.includes("\\") ? "\\" : "/";
  return `${left}${sep}${right}`;
}

export function resolveImageSrc(src: string | undefined, filePath: string | null): string {
  if (!src) return "";
  if (/^(https?:|data:|blob:|asset:|tauri:)/i.test(src)) return src;
  if (!filePath) return src;
  if (!isTauri()) return src;

  const dir = filePath.replace(/[\\/][^\\/]+$/, "");
  const abs =
    src.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(src) ? src : joinPath(dir, src);
  try {
    return convertFileSrc(abs);
  } catch {
    return src;
  }
}
