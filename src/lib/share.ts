import { share } from "@vnidrop/tauri-plugin-share";
import { downloadText, isMobile, isTauri } from "./platform";
import { writeClipboardText } from "./clipboard";
import { recordError } from "./diagnostics";

export type ShareOutcome = "shared" | "copied" | "downloaded" | "unavailable";

/** The user dismissed the share sheet — not an error, and not a reason to retry. */
function isAbort(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "AbortError"
  );
}

/**
 * Last-resort clipboard write.
 *
 * Used only when the native clipboard route is unavailable — `execCommand`
 * needs neither a secure context nor a focused document, which is exactly what
 * a WebView is bad at providing.
 */
function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    // Keep it off-screen without `display: none`, which would make it
    // unselectable and therefore uncopyable.
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Hand a document to the outside world, degrading gracefully.
 *
 * The share sheet is the point: on a phone it drops the document straight into
 * WeChat / Feishu / Mail, which is the whole reason someone shares a document
 * rather than copying it. No embedded WebView implements the Web Share API —
 * Chromium ships it to Chrome, not to WebView hosts — so inside the app this
 * goes through a native plugin instead, and only browsers get the web API.
 *
 * The content is shared as text, not as a file, on purpose: the text carries the
 * Moye attribution line, and a shared `.md` file would not.
 */
export async function shareDocument(opts: {
  title: string;
  markdown: string;
  filename: string;
}): Promise<ShareOutcome> {
  const { title, markdown, filename } = opts;

  // 1. The native sheet, inside the app.
  //
  // Deliberately does not gate on the plugin's `canShare`: that is one more IPC
  // that can go wrong, and it was observed returning false after the app had
  // been chosen as its own share target — which quietly downgraded every later
  // share to the clipboard. Attempting the share and treating a throw as "not
  // available" is both simpler and harder to wedge.
  if (isTauri()) {
    try {
      await share({ title, text: markdown });
      return "shared";
    } catch (err) {
      // Record why, always. A silent fall back to the clipboard looks exactly
      // like "the share button is broken", and the diagnostics report is the
      // only way to tell those apart after the fact.
      recordError(`share: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. The Web Share API, which exists in real browsers but not in a WebView.
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text: markdown });
      return "shared";
    } catch (err) {
      // Dismissing the sheet throws too. Reporting a failure there would be
      // wrong, and falling through would silently overwrite the clipboard of
      // someone who just decided *not* to share.
      if (isAbort(err)) return "shared";
    }
  }

  // 3. The clipboard, through the native manager inside the app.
  try {
    await writeClipboardText(markdown);
    return "copied";
  } catch {
    /* fall through to the legacy path */
  }

  if (legacyCopy(markdown)) return "copied";

  if (isMobile()) return "unavailable";

  downloadText(filename, markdown);
  return "downloaded";
}
