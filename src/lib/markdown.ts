import { Children, createElement, isValidElement, type ReactNode } from "react";

export type AlertKind = "note" | "tip" | "important" | "warning" | "caution";

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

const ALERT_RE =
  /^\s*(?:\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]|!(NOTE|TIP|IMPORTANT|WARNING|CAUTION))(?:[ \t]*\r?\n|[ \t]+|$)/i;

export function splitFrontmatter(source: string): {
  data: Record<string, string>;
  body: string;
} {
  const text = source.replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) return { data: {}, body: source };

  const match = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!match) return { data: {}, body: source };

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      // Double-quoted, so the escapes inside are real and have to be undone.
      //
      // Stripping the quotes alone is not enough, and that is not a nitpick:
      // 墨盒 (`mohe/src/core/format.ts`) always writes its values quoted and
      // escapes `\` and `"`. Without this, a title of `he said "hi"` — or any
      // title carrying a Windows path — shows up in the card as
      // `he said \"hi\": C:\\path\\x`. The file is right; the reader was wrong.
      //
      // Single pass with a replacer rather than a chain of `.replace` calls:
      // doing `\\` first would turn an escaped backslash into a plain one and
      // then `\"` would start eating quote characters that were never escaped.
      value = value.slice(1, -1).replace(/\\(["\\nt])/g, (_, ch: string) =>
        ch === "n" ? "\n" : ch === "t" ? "\t" : ch,
      );
    } else if (value.startsWith("'") && value.endsWith("'")) {
      // Single-quoted YAML has no escapes at all — the quote is doubled instead.
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    if (key) data[key] = value;
  }

  return { data, body: text.slice(match[0].length) };
}

export function slugify(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `h-${s || "section"}`;
}

export function uniqueSlug(text: string, used: Map<string, number>): string {
  let id = slugify(text);
  const n = used.get(id) ?? 0;
  used.set(id, n + 1);
  if (n > 0) id = `${id}-${n}`;
  return id;
}

export function headingPlainText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

export function extractToc(markdown: string): TocItem[] {
  const { body } = splitFrontmatter(markdown);
  const items: TocItem[] = [];
  const used = new Map<string, number>();
  let inFence = false;

  for (const line of body.split("\n")) {
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = headingPlainText(m[2]);
    if (!text) continue;
    items.push({
      level: m[1].length,
      text,
      id: uniqueSlug(text, used),
    });
  }
  return items;
}

export function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return getNodeText(props.children);
  }
  return "";
}

export function parseAlert(
  children: ReactNode,
): { kind: AlertKind; rest: ReactNode[] } | null {
  const arr = Children.toArray(children).filter((node) => {
    if (typeof node === "string") return node.trim().length > 0;
    return true;
  });
  if (arr.length === 0) return null;
  const first = arr[0];
  const text = getNodeText(first);
  const m = ALERT_RE.exec(text);
  if (!m) return null;
  const kind = (m[1] || m[2]).toLowerCase() as AlertKind;
  const leftover = text.slice(m[0].length).trim();
  const rest = leftover
    ? [createElement("p", { key: "alert-lead" }, leftover), ...arr.slice(1)]
    : arr.slice(1);
  return { kind, rest };
}

export function languageLabel(lang: string): string {
  const map: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TSX",
    jsx: "JSX",
    py: "Python",
    python: "Python",
    rb: "Ruby",
    rs: "Rust",
    rust: "Rust",
    go: "Go",
    sh: "Shell",
    bash: "Bash",
    zsh: "Zsh",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    toml: "TOML",
    md: "Markdown",
    markdown: "Markdown",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sql: "SQL",
    c: "C",
    cpp: "C++",
    java: "Java",
    kt: "Kotlin",
    swift: "Swift",
    diff: "Diff",
    text: "Text",
    mermaid: "Mermaid",
  };
  return map[lang.toLowerCase()] || lang || "Code";
}
