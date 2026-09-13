import { beforeEach, describe, expect, it } from "vitest";
import {
  forgetRecent,
  isDurablePath,
  loadRecent,
  loadSnapshot,
  rememberRecent,
  saveSnapshot,
} from "./recent-files";

beforeEach(() => localStorage.clear());

describe("isDurablePath", () => {
  it("trusts plain filesystem paths", () => {
    expect(isDurablePath("D:\\notes\\a.md")).toBe(true);
    expect(isDurablePath("/home/me/a.md")).toBe(true);
    expect(isDurablePath("\\\\server\\share\\a.md")).toBe(true);
  });

  it("does not trust the grants Android and iOS hand out", () => {
    // The whole reason snapshots exist: these read fine now and fail forever
    // after the process that received them goes away.
    expect(isDurablePath("content://media/external/file/1000000123")).toBe(false);
    expect(isDurablePath("file:///var/mobile/a.md")).toBe(false);
  });
});

describe("snapshots", () => {
  it("keeps a copy only for paths that need one", () => {
    saveSnapshot("D:\\a.md", "a.md", "hello");
    expect(loadSnapshot("D:\\a.md")).toBeNull();

    saveSnapshot("content://d/1", "b.md", "hello");
    expect(loadSnapshot("content://d/1")?.text).toBe("hello");
  });

  it("stores the display name alongside the text", () => {
    // content:// paths carry no readable name, so the snapshot is the only
    // place the real one can come from on a later launch.
    saveSnapshot("content://d/2", "会议纪要.md", "body");
    expect(loadSnapshot("content://d/2")?.name).toBe("会议纪要.md");
  });

  it("refuses a document above the per-document cap", () => {
    saveSnapshot("content://big", "big.md", "x".repeat(300 * 1024));
    expect(loadSnapshot("content://big")).toBeNull();
  });

  it("stays inside the total budget, newest first", () => {
    const doc = "y".repeat(200 * 1024);
    for (let i = 0; i < 12; i++) {
      const path = `content://doc/${i}`;
      rememberRecent(path, `doc${i}.md`);
      saveSnapshot(path, `doc${i}.md`, doc);
    }
    expect(loadSnapshot("content://doc/11")).not.toBeNull();
    expect(loadSnapshot("content://doc/0")).toBeNull();
  });

  it("is dropped together with the entry", () => {
    rememberRecent("content://d/9", "d.md");
    saveSnapshot("content://d/9", "d.md", "body");
    forgetRecent("content://d/9");
    expect(loadSnapshot("content://d/9")).toBeNull();
    expect(loadRecent()).toHaveLength(0);
  });
});

describe("rememberRecent", () => {
  it("puts the newest first and de-duplicates", () => {
    rememberRecent("/a.md", "a.md");
    rememberRecent("/b.md", "b.md");
    rememberRecent("/a.md", "a.md");
    expect(loadRecent().map((entry) => entry.path)).toEqual(["/a.md", "/b.md"]);
  });

  it("prefers the natively resolved name", () => {
    rememberRecent("content://media/external/file/1000000123", "真实名字.md");
    expect(loadRecent()[0].name).toBe("真实名字.md");
  });

  it("ignores something that is not a path at all", () => {
    expect(rememberRecent("clipboard", "x")).toHaveLength(0);
    expect(rememberRecent(null, "x")).toHaveLength(0);
  });
});
