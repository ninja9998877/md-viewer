import type { Plugin } from "unified";

const SKIP = new Set(["code", "inlineCode", "math", "inlineMath", "html"]);

const MARK_RE =
  /(?<!~)~(?!~)([^~\n]+)~(?!~)|\^([^\^\n]+)\^/g;

function splitText(value: string): object[] {
  const nodes: object[] = [];
  let last = 0;
  MARK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARK_RE.exec(value))) {
    if (match.index > last) {
      nodes.push({ type: "text", value: value.slice(last, match.index) });
    }
    if (match[1] != null) {
      nodes.push({
        type: "sub",
        data: { hName: "sub" },
        children: [{ type: "text", value: match[1] }],
      });
    } else {
      nodes.push({
        type: "sup",
        data: { hName: "sup" },
        children: [{ type: "text", value: match[2] }],
      });
    }
    last = match.index + match[0].length;
  }
  if (last === 0) return [{ type: "text", value }];
  if (last < value.length) {
    nodes.push({ type: "text", value: value.slice(last) });
  }
  return nodes;
}

function walk(node: { type?: string; children?: unknown[]; value?: string }) {
  if (!node?.children || SKIP.has(node.type ?? "")) return;
  const next: unknown[] = [];
  for (const child of node.children) {
    const c = child as { type?: string; value?: string; children?: unknown[] };
    if (c?.type === "text" && typeof c.value === "string") {
      next.push(...splitText(c.value));
    } else {
      walk(c);
      next.push(c);
    }
  }
  node.children = next;
}

export const remarkSupersub: Plugin = () => {
  return (tree: unknown) => {
    walk(tree as { children?: unknown[] });
  };
};
