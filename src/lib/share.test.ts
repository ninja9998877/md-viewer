import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { downloadText, writeClipboardText, canShare, nativeShare, state } = vi.hoisted(() => ({
  downloadText: vi.fn(),
  writeClipboardText: vi.fn(),
  canShare: vi.fn(),
  nativeShare: vi.fn(),
  state: { tauri: false },
}));

vi.mock("./platform", () => ({ downloadText, isTauri: () => state.tauri }));
// Mocked so this file exercises the *fallback order*, not the clipboard wrapper
// or the plugin, and so no Tauri code is loaded into a node test.
vi.mock("./clipboard", () => ({ writeClipboardText }));
vi.mock("@vnidrop/tauri-plugin-share", () => ({ canShare, share: nativeShare }));

import { shareDocument } from "./share";

const opts = { title: "a.md", markdown: "# hi", filename: "a.md" };

function setNavigator(value: Record<string, unknown>): void {
  vi.stubGlobal("navigator", value);
}

beforeEach(() => {
  state.tauri = false;
  writeClipboardText.mockResolvedValue(undefined);
  canShare.mockResolvedValue(false);
  nativeShare.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  downloadText.mockClear();
  writeClipboardText.mockClear();
  canShare.mockClear();
  nativeShare.mockClear();
});

describe("the native sheet (inside the app)", () => {
  it("is the first choice when the platform offers it", async () => {
    // No embedded WebView implements the Web Share API, so without this the
    // share button can never open a sheet on a phone.
    state.tauri = true;
    canShare.mockResolvedValue(true);
    setNavigator({ userAgent: "Android" });
    expect(await shareDocument(opts)).toBe("shared");
    expect(nativeShare).toHaveBeenCalledWith({ title: "a.md", text: "# hi" });
    expect(writeClipboardText).not.toHaveBeenCalled();
  });

  it("falls through when the platform cannot share", async () => {
    state.tauri = true;
    canShare.mockResolvedValue(false);
    setNavigator({ userAgent: "Android" });
    expect(await shareDocument(opts)).toBe("copied");
    expect(nativeShare).not.toHaveBeenCalled();
  });

  it("falls through when the sheet throws", async () => {
    state.tauri = true;
    canShare.mockResolvedValue(true);
    nativeShare.mockRejectedValue(new Error("boom"));
    setNavigator({ userAgent: "Android" });
    expect(await shareDocument(opts)).toBe("copied");
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
