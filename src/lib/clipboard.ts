import {
  readText as nativeReadText,
  writeText as nativeWriteText,
} from "@tauri-apps/plugin-clipboard-manager";
import { isTauri } from "./platform";

/**
 * Clipboard access that actually works in a WebView.
 *
 * `navigator.clipboard.readText()` is the obvious call and the wrong one here:
 * Android's WebView denies it even while the app is focused, so "read the
 * clipboard" failed every single time on a phone with a permission error the
 * reader could do nothing about. The Tauri plugin goes through the native
 * ClipboardManager instead, which is what the platform expects an app to use.
 *
 * The web build keeps the browser API — there is no plugin there — and the
 * share/menu paths still degrade gracefully if it is unavailable.
 */
export async function readClipboardText(): Promise<string> {
  if (isTauri()) return nativeReadText();
  return navigator.clipboard.readText();
}

export async function writeClipboardText(text: string): Promise<void> {
  if (isTauri()) {
    await nativeWriteText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}
