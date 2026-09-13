import { afterEach, describe, expect, it, vi } from "vitest";

const { downloadText } = vi.hoisted(() => ({ downloadText: vi.fn() }));
vi.mock("./platform", () => ({ downloadText }));

import { shareDocument } from "./share";

const opts = { title: "a.md", markdown: "# hi", filename: "a.md" };

function setNavigator(value: Record<string, unknown>): void {
  vi.stubGlobal("navigator", value);
}

afterEach(() => {
  vi.unstubAllGlobals();
  downloadText.mockClear();
});

describe("shareDocument", () => {
  it("prefers the system share sheet", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ userAgent: "Android", share });
    expect(await shareDocument(opts)).toBe("shared");
    expect(share).toHaveBeenCalledOnce();
  });

  it("treats a dismissed sheet as done, not as failure", async () => {
    const abort = Object.assign(new Error("dismissed"), { name: "AbortError" });
    const writeText = vi.fn();
    setNavigator({
      userAgent: "Android",
      share: vi.fn().mockRejectedValue(abort),
      clipboard: { writeText },
    });
    expect(await shareDocument(opts)).toBe("shared");
    // Falling through here would silently overwrite the clipboard of someone
    // who had just decided *not* to share.
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when the sheet is unusable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({
      userAgent: "Android",
      share: vi.fn().mockRejectedValue(new Error("not allowed")),
      clipboard: { writeText },
    });
    expect(await shareDocument(opts)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("# hi");
  });

  it("never claims a download on mobile", async () => {
    // The WebView drops an `<a download>` click on the floor, so reporting
    // success there is a lie the reader only disproves by hunting for a file
    // that was never written.
    setNavigator({ userAgent: "Android" });
    expect(await shareDocument(opts)).toBe("unavailable");
    expect(downloadText).not.toHaveBeenCalled();
  });

  it("does download on desktop", async () => {
    setNavigator({ userAgent: "Windows" });
    expect(await shareDocument(opts)).toBe("downloaded");
    expect(downloadText).toHaveBeenCalledOnce();
  });
});
