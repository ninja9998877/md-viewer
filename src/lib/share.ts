import { downloadText } from "./platform";

export type ShareOutcome = "shared" | "copied" | "downloaded" | "unavailable";

/** The user dismissed the share sheet — not an error, and not a reason to retry. */
function isAbort(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "AbortError"
  );
}

/** True on the Android / iOS builds, where the browser fallbacks do not apply:
 *  a WebView silently drops the `<a download>` click, so a "saved a file" claim
 *  there is one the reader can only disprove by hunting for the file. */
function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Last-resort clipboard write.
 *
 * `navigator.clipboard` needs a secure context *and* a focused document, and the
 * host WebView does not reliably provide both. The legacy `execCommand("copy")`
 * path needs neither and still works in Android's WebView, which is the host
 * that matters here.
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
 * The system share sheet is the nicest target — on a phone it drops the document
 * straight into WeChat / Feishu / Mail — but no embedded WebView implements the
 * Web Share API (Chromium ships it to Chrome, not to WebView hosts) and Tauri
 * has no share plugin. On mobile this realistically ends at the clipboard, and
 * the caller is told which route was taken so it can say so honestly rather than
 * claim a success that did not happen.
 */
export async function shareDocument(opts: {
  title: string;
  markdown: string;
  filename: string;
}): Promise<ShareOutcome> {
  const { title, markdown, filename } = opts;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text: markdown });
      return "shared";
    } catch (err) {
      // Dismissing the sheet throws too. Reporting a failure there would be
      // wrong, and falling through would silently overwrite the clipboard of
      // someone who just decided *not* to share.
      if (isAbort(err)) return "shared";
      // Anything else means share is unavailable in this host: try the next one.
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown);
      return "copied";
    }
  } catch {
    /* fall through to the legacy path */
  }

  if (legacyCopy(markdown)) return "copied";

  if (isMobile()) return "unavailable";

  downloadText(filename, markdown);
  return "downloaded";
}
