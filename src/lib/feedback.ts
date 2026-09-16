import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "./platform";

/**
 * Where a problem report goes.
 *
 * The desktop build has no store listing, so feedback is a new issue on the
 * repository instead. Kept on its own and named after what it is, because it is
 * the one identifier that has to be right.
 */
export const ISSUES_URL = "https://github.com/ninja9998877/md-viewer/issues/new";

/** Open the new-issue page. Outside the app this is an ordinary new tab. */
export async function openFeedbackPage(): Promise<void> {
  if (isTauri()) {
    await openUrl(ISSUES_URL);
    return;
  }
  window.open(ISSUES_URL, "_blank", "noopener,noreferrer");
}
