import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { downloadText, writeClipboardText, nativeShare, state } = vi.hoisted(() => ({
  downloadText: vi.fn(),
  writeClipboardText: vi.fn(),
  nativeShare: vi.fn(),
  state: { tauri: false },
}));

vi.mock("./platform", () => ({ downloadText, isTauri: () => state.tauri }));
// Mocked so this file exercises the *fallback order*, not the clipboard wrapper
// or the plugin, and so no Tauri code is loaded into a node test.
vi.mock("./clipboard", () => ({ writeClipboardText }));
vi.mock("@vnidrop/tauri-plugin-share", () => ({ share: nativeShare }));

import { shareDocument } from "./share";
import { diagnosticsText } from "./diagnostics";

const opts = { title: "a.md", markdown: "# hi", filename: "a.md" };

function setNavigator(value: Record<string, unknown>): void {
  vi.stubGlobal("navigator", value);
}

beforeEach(() => {
  state.tauri = false;
  writeClipboardText.mockResolvedValue(undefined);
  nativeShare.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  downloadText.mockClear();
  writeClipboardText.mockClear();
  nativeShare.mockClear();
});

describe("the native sheet (inside the app)", () => {
  it("is the first choice when it works", async () => {
    // No embedded WebView implements the Web Share API, so without this the
    // share button can never open a sheet on a phone.
    state.tauri = true;
    setNavigator({ userAgent: "Android" });
    expect(await shareDocument(opts)).toBe("shared");
    expect(nativeShare).toHaveBeenCalledWith({ title: "a.md", text: "# hi" });
    expect(writeClipboardText).not.toHaveBeenCalled();
  });

  it("does not consult canShare first", async () => {
    // Gating on `canShare` was observed returning false once the app had been
    // picked as its own share target, which silently downgraded every later
    // share to the clipboard. The call itself is the only reliable probe.
    state.tauri = true;
    setNavigator({ userAgent: "Android" });
    await shareDocument(opts);
    expect(nativeShare).toHaveBeenCalledOnce();
  });

  it("records why it fell back, so a report can explain it", async () => {
    state.tauri = true;
    nativeShare.mockRejectedValue(new Error("activity is gone"));
    setNavigator({ userAgent: "Android" });
    expect(await shareDocument(opts)).toBe("copied");
    // A silent fall back is indistinguishable from a broken button.
    expect(diagnosticsText({})).toContain("share: activity is gone");
  });
});

describe("the browser routes", () => {
  it("uses the Web Share API when there is one", async () => {
    const webShare = vi.fn().mockResolvedValue(undefined);
    setNavigator({ userAgent: "Android", share: webShare });
    expect(await shareDocument(opts)).toBe("shared");
    expect(webShare).toHaveBeenCalledOnce();
  });

  it("treats a dismissed sheet as done, not as failure", async () => {
    const abort = Object.assign(new Error("dismissed"), { name: "AbortError" });
    setNavigator({ userAgent: "Android", share: vi.fn().mockRejectedValue(abort) });
    expect(await shareDocument(opts)).toBe("shared");
    // Falling through here would silently overwrite the clipboard of someone
    // who had just decided *not* to share.
    expect(writeClipboardText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard", async () => {
    setNavigator({
      userAgent: "Android",
      share: vi.fn().mockRejectedValue(new Error("not allowed")),
    });
    expect(await shareDocument(opts)).toBe("copied");
    expect(writeClipboardText).toHaveBeenCalledWith("# hi");
  });

  it("never claims a download on mobile", async () => {
    // The WebView drops an `<a download>` click on the floor, so reporting
    // success there is a lie the reader only disproves by hunting for a file
    // that was never written.
    writeClipboardText.mockRejectedValue(new Error("denied"));
    setNavigator({ userAgent: "Android" });
    expect(await shareDocument(opts)).toBe("unavailable");
    expect(downloadText).not.toHaveBeenCalled();
  });

  it("does download on desktop", async () => {
    writeClipboardText.mockRejectedValue(new Error("denied"));
    setNavigator({ userAgent: "Windows" });
    expect(await shareDocument(opts)).toBe("downloaded");
    expect(downloadText).toHaveBeenCalledOnce();
  });
});
