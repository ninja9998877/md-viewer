import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "./platform";

/** The numeric App Store id. Kept here so the URL is written once. */
export const IOS_APP_ID = "6811943403";

/**
 * Where the iPhone version lives.
 *
 * **No storefront in the path, on purpose.** I had `/cn/` here for a while, with
 * a table of "measurements" justifying it — all of them taken from this machine,
 * which sits in China and therefore gets geolocated by Apple. They were real
 * observations of the wrong thing. The redirect to the "Today" page that I read
 * as "a storefront is required" was really this: **the app is not sold in
 * China.** Of 174 territories it is listed in, CHN is the only one missing, so
 * `/cn/` pointed at the one storefront that cannot sell it — the bare URL was
 * correct all along and I "fixed" it into the only case that genuinely breaks.
 *
 * Leaving the storefront out lets Apple send each visitor to a region that
 * actually has the app. A browser on this machine cannot verify that; it can
 * only verify the Chinese behavior, which is the case that must not be trusted.
 */
export const IOS_APP_URL = `https://apps.apple.com/app/id${IOS_APP_ID}`;

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
