import type { Plugin } from "unified";

type AlertKind = "note" | "tip" | "important" | "warning" | "caution";

const KINDS = new Set<AlertKind>(["note", "tip", "important", "warning", "caution"]);

const TEXT_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n)?/;

function plain(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if (n.type === "text") return n.value ?? "";
  if (Array.isArray(n.children)) return n.children.map(plain).join("");
  return "";
}

function asKind(raw: string): AlertKind | null {
  const k = raw.replace(/^!/, "").toLowerCase() as AlertKind;
  return KINDS.has(k) ? k : null;
}

function takeKind(paragraph: { type?: string; children?: any[] }): AlertKind | null {
  if (paragraph?.type !== "paragraph" || !paragraph.children?.length) return null;
  const kids = paragraph.children;
  const first = kids[0];

  if (first?.type === "text" && typeof first.value === "string") {
    const m = TEXT_RE.exec(first.value);
    if (!m) return null;
    first.value = first.value.slice(m[0].length);
    if (!first.value) kids.shift();
    return m[1].toLowerCase() as AlertKind;
  }

  if (first?.type === "linkReference" || first?.type === "link") {
    const kind = asKind(plain(first).trim());
    if (!kind) return null;
    kids.shift();
    if (kids[0]?.type === "text" && typeof kids[0].value === "string") {
      kids[0].value = kids[0].value.replace(/^[ \t]*\r?\n?/, "");
      if (!kids[0].value) kids.shift();
    }
    return kind;
  }

  return null;
}

export const remarkGithubAlerts: Plugin = () => {
  return (tree: any) => {
    const walk = (node: any) => {
      if (!node || !Array.isArray(node.children)) return;
      for (const child of node.children) {
        if (child?.type === "blockquote") {
          const firstPara = child.children?.find((c: any) => c?.type === "paragraph");
          const kind = firstPara ? takeKind(firstPara) : null;
          if (kind) {
            child.data = child.data ?? {};
            child.data.hProperties = {
              ...(child.data.hProperties ?? {}),
              dataAlert: kind,
            };
            if (firstPara.children?.length === 0) {
              child.children = child.children.filter((c: any) => c !== firstPara);
            }
          }
        }
        walk(child);
      }
    };
    walk(tree);
  };
};
