import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { openUrl, state } = vi.hoisted(() => ({
  openUrl: vi.fn(),
  state: { tauri: false },
}));

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));
vi.mock("./platform", () => ({ isTauri: () => state.tauri }));

import { ISSUES_URL, openFeedbackPage } from "./feedback";

beforeEach(() => {
  state.tauri = false;
  openUrl.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  openUrl.mockClear();
});

describe("ISSUES_URL", () => {
  it("is the repository's new-issue page over https", () => {
    // The opener plugin's default scope allows `http(s):` and nothing else, so a
    // non-https scheme here would be refused at runtime rather than at build.
    expect(ISSUES_URL).toBe("https://github.com/ninja9998877/md-viewer/issues/new");
    expect(ISSUES_URL.startsWith("https://")).toBe(true);
  });
});

describe("openFeedbackPage", () => {
  it("hands the URL to the opener inside the app", async () => {
    state.tauri = true;
    await openFeedbackPage();
    expect(openUrl).toHaveBeenCalledWith(ISSUES_URL);
  });

  it("opens a new tab outside the app", async () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    await openFeedbackPage();
    // `noopener,noreferrer` because the destination is a third party as far as
    // this window is concerned.
    expect(open).toHaveBeenCalledWith(ISSUES_URL, "_blank", "noopener,noreferrer");
    expect(openUrl).not.toHaveBeenCalled();
  });
});
