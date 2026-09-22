import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "./platform";

/** The numeric App Store id. Kept here so the URL is written once. */
export const IOS_APP_ID = "6811943403";

/**
 * Where the iPhone version lives.
 *
 * **The `/cn/` is load-bearing.** Without a storefront in the path,
 * `https://apps.apple.com/app/id…` is redirected to the App Store's "Today"
 * page — a generic landing page, not this app. Measured in a real browser:
 *
 *     /app/id6811943403                       → /cn/iphone/today   ✗
 *     /app/moye-markdown-reader/id6811943403  → /cn/iphone/today   ✗
 *     /cn/app/id6811943403                    → the app's page     ✓
 *
 * A plain HTTP fetch of the bare URL *does* return the right page, which is why
 * this is worth writing down: the obvious way to check it lies. Only loading it
 * in a browser shows where a person actually ends up.
 *
 * `/cn/` is deliberate rather than geo-detected. The app is Chinese-first and
 * listed in the Chinese storefront; hardcoding one storefront is honest about
 * who it is for, and someone in another region still lands on the app page
 * rather than on Today.
 */
export const IOS_APP_URL = `https://apps.apple.com/cn/app/id${IOS_APP_ID}`;

/**
 * Open the App Store page. Inside the app this goes to the system browser;
 * outside it is an ordinary new tab.
 *
 * One of only two outbound links in the whole app — the other is the issues
 * page in `feedback.ts`. Both are handed to the OS as a string. Nothing here
 * talks to the network, and this app would still work with the machine
 * unplugged; that is the product's central claim and it would be dishonest to
 * blur it just because the URL happens to be ours.
 */
export async function openIosAppPage(): Promise<void> {
  if (isTauri()) {
    await openUrl(IOS_APP_URL);
    return;
  }
  window.open(IOS_APP_URL, "_blank", "noopener,noreferrer");
}
