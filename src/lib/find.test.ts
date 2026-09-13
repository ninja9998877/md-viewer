import { describe, expect, it } from "vitest";
import { FIND_MAX_MATCHES, findMatches } from "./find";

describe("findMatches", () => {
  it("reports every occurrence with its line number", () => {
    const text = "alpha\nbeta alpha\ngamma";
    const hits = findMatches(text, "alpha");
    expect(hits.map((hit) => hit.line)).toEqual([1, 2]);
    expect(hits[1].start).toBe(text.indexOf("alpha", 1));
  });

  it("matches case-insensitively without shifting offsets", () => {
    // The `İ` lowercases to two code points, so a toLowerCase()+indexOf()
    // implementation would slice the wrong text for every match after it. This
    // is the regression that choice exists to prevent.
    const text = "İstanbul CODE code";
    const hits = findMatches(text, "code");
    expect(hits).toHaveLength(2);
    expect(text.slice(hits[0].start, hits[0].end)).toBe("CODE");
    expect(text.slice(hits[1].start, hits[1].end)).toBe("code");
  });

  it("returns nothing for a blank query", () => {
    expect(findMatches("anything", "   ")).toEqual([]);
  });

  it("does not overlap matches", () => {
    expect(findMatches("aaaa", "aa")).toHaveLength(2);
  });

  it("treats the query as a literal, not a pattern", () => {
    expect(findMatches("a.c abc", "a.c")).toHaveLength(1);
    expect(findMatches("(((", "(")).toHaveLength(3);
  });

  it("caps a runaway result set", () => {
    expect(findMatches("x".repeat(FIND_MAX_MATCHES * 3), "x")).toHaveLength(
      FIND_MAX_MATCHES,
    );
  });

  it("counts lines in CJK text", () => {
    const hits = findMatches("第一行\n第二行代码\n第三行", "代码");
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(2);
  });

  it("numbers the first line as 1", () => {
    expect(findMatches("hit", "hit")[0].line).toBe(1);
  });
});
