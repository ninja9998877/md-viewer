import { describe, expect, it } from "vitest";
import { remarkCodeMeta } from "./remark-code-meta";

interface Node {
  type: string;
  meta?: string | null;
  data?: { hProperties?: Record<string, unknown> };
  children?: Node[];
}

const fenced = (meta: string): Node => ({
  type: "root",
  children: [{ type: "code", meta, children: [] }],
});

const titleOf = (tree: Node): unknown => tree.children?.[0].data?.hProperties?.["data-title"];

function run(tree: Node): Node {
  remarkCodeMeta()(tree);
  return tree;
}

describe("remarkCodeMeta", () => {
  it("reads an explicit title", () => {
    expect(titleOf(run(fenced('title="src/App.tsx"')))).toBe("src/App.tsx");
  });

  it("reads a bare path", () => {
    expect(titleOf(run(fenced("src/util/date.ts")))).toBe("src/util/date.ts");
  });

  it("does not mistake a bare word for a path", () => {
    // ```js node  — "node" is a word, not a file the reader can open.
    expect(titleOf(run(fenced("node")))).toBeUndefined();
  });

  it("prefers the explicit title when both are present", () => {
    expect(titleOf(run(fenced('src/a.ts title="b.ts"')))).toBe("b.ts");
  });

  it("leaves a fence with no meta untouched", () => {
    expect(titleOf(run(fenced("")))).toBeUndefined();
  });

  it("reaches code blocks nested in other nodes", () => {
    const tree: Node = {
      type: "root",
      children: [
        { type: "blockquote", children: [{ type: "code", meta: 'title="a.ts"', children: [] }] },
      ],
    };
    run(tree);
    expect(tree.children?.[0].children?.[0].data?.hProperties?.["data-title"]).toBe("a.ts");
  });
});
