import type { Plugin } from "unified";
import { uniqueSlug } from "./markdown";

function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if ((n.type === "text" || n.type === "inlineCode") && typeof n.value === "string") {
    return n.value;
  }
  if (Array.isArray(n.children)) return n.children.map(textOf).join("");
  return "";
}

export const remarkHeadingIds: Plugin = () => {
  return (tree: unknown) => {
    const used = new Map<string, number>();
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const n = node as {
        type?: string;
        depth?: number;
        data?: { hProperties?: Record<string, string> };
        children?: unknown[];
      };
      if (n.type === "heading" && typeof n.depth === "number") {
        const text = textOf(n).replace(/\s+/g, " ").trim();
        const id = uniqueSlug(text, used);
        n.data = n.data ?? {};
        n.data.hProperties = { ...(n.data.hProperties ?? {}), id };
      }
      n.children?.forEach(visit);
    };
    visit(tree);
  };
};
