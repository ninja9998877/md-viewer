import { downloadText } from "./platform";

export type ShareOutcome = "shared" | "copied" | "downloaded";

/** The user dismissed the share sheet — not an error, and not a reason to retry. */
function isAbort(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "AbortError"
  );
}

/**
 * Hand a document to the outside world, degrading gracefully.
 *
 * The system share sheet is the nicest target — on a phone it drops the
 * document straight into WeChat / Feishu / Mail — but whether a WebView host
 * implements it varies, so we fall back to the clipboard and finally to saving
 * a file. The caller gets back which route was taken so it can say so.
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
    /* fall through */
  }

  downloadText(filename, markdown);
  return "downloaded";
}
