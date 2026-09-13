import { beforeEach, describe, expect, it } from "vitest";
import { loadReadingPosition, saveReadingPosition } from "./reading-position";

beforeEach(() => localStorage.clear());

describe("reading positions", () => {
  it("round-trips a position per path", () => {
    saveReadingPosition("/a.md", { id: "h-x", offset: -120 });
    expect(loadReadingPosition("/a.md")).toEqual({ id: "h-x", offset: -120 });
    expect(loadReadingPosition("/b.md")).toBeNull();
  });

  it("ignores a document with no path", () => {
    saveReadingPosition(null, { id: "h", offset: 0 });
    expect(loadReadingPosition(null)).toBeNull();
  });

  it("refuses an anchor with no id", () => {
    saveReadingPosition("/a.md", { id: "", offset: 10 });
    expect(loadReadingPosition("/a.md")).toBeNull();
  });

  it("survives a corrupted store", () => {
    localStorage.setItem("md-viewer-reading-position", "{not json");
    expect(loadReadingPosition("/a.md")).toBeNull();
    saveReadingPosition("/a.md", { id: "h", offset: 1 });
    expect(loadReadingPosition("/a.md")?.offset).toBe(1);
  });

  it("drops the oldest once past the cap", () => {
    for (let i = 0; i < 70; i++) {
      saveReadingPosition(`/f${i}.md`, { id: "h", offset: i });
    }
    expect(loadReadingPosition("/f0.md")).toBeNull();
    expect(loadReadingPosition("/f69.md")?.offset).toBe(69);
  });

  it("counts a re-save as recent use", () => {
    for (let i = 0; i < 60; i++) {
      saveReadingPosition(`/f${i}.md`, { id: "h", offset: i });
    }
    // Touch the oldest, then push the store one past its cap: the entry that
    // should fall off is the one after it, not the one just used.
    saveReadingPosition("/f0.md", { id: "h", offset: 999 });
    saveReadingPosition("/new.md", { id: "h", offset: 1 });
    expect(loadReadingPosition("/f0.md")?.offset).toBe(999);
    expect(loadReadingPosition("/f1.md")).toBeNull();
  });
});
