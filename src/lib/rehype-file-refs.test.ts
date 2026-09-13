import { describe, expect, it } from "vitest";
import { rehypeFileRefs } from "./rehype-file-refs";

interface Node {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
}

const paragraph = (value: string): Node => ({
  type: "root",
  children: [
    { type: "element", tagName: "p", properties: {}, children: [{ type: "text", value }] },
  ],
});

const codeBlock = (value: string): Node => ({
  type: "root",
  children: [
    {
      type: "element",
      tagName: "pre",
      properties: {},
      children: [
        {
          type: "element",
          tagName: "code",
          properties: {},
          children: [{ type: "text", value }],
        },
      ],
    },
  ],
});

function run(tree: Node): Node {
  rehypeFileRefs()(tree);
  return tree;
}

const links = (tree: Node): Node[] =>
  (tree.children?.[0].children ?? []).filter((child) => child.tagName === "a");

describe("rehypeFileRefs", () => {
  it("wraps a citation in an anchor under a private scheme", () => {
    const tree = run(paragraph("see src/App.tsx:190 now"));
    const [link] = links(tree);
    expect(link.properties?.href).toBe("moye-ref:src/App.tsx:190");
    expect(link.children?.[0].value).toBe("src/App.tsx:190");
  });

  it("keeps the surrounding prose intact", () => {
    const kids = run(paragraph("see src/App.tsx:190 now")).children?.[0].children ?? [];
    expect(kids[0].value).toBe("see ");
    expect(kids[kids.length - 1].value).toBe(" now");
  });

  it("accepts a column number", () => {
    const tree = run(paragraph("src/lib/find.ts:42:7"));
    expect(links(tree)[0].properties?.href).toBe("moye-ref:src/lib/find.ts:42:7");
  });

  it("finds several in one paragraph", () => {
    expect(links(run(paragraph("a/b.ts:1 and c/d.py:2")))).toHaveLength(2);
  });

  it("leaves prose colons alone", () => {
    // No file extension before the colon, so this is not a citation.
    expect(links(run(paragraph("注意:12 这里")))).toHaveLength(0);
  });

  it("leaves fenced code alone", () => {
    // Inside a code block a path is sample code, not a citation the reader can
    // act on — and linkifying it would fight the syntax highlighting.
    const tree = run(codeBlock("src/App.tsx:190"));
    expect(links(tree)).toHaveLength(0);
    expect(tree.children?.[0].children?.[0].children?.[0].type).toBe("text");
  });

  it("does not double-wrap something already linked", () => {
    const tree: Node = {
      type: "root",
      children: [
        {
          type: "element",
          tagName: "a",
          properties: { href: "https://example.com" },
          children: [{ type: "text", value: "src/App.tsx:190" }],
        },
      ],
    };
    expect(links(run(tree))).toHaveLength(0);
  });
});
