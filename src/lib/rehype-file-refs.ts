/**
 * Make `src/App.tsx:190` citations clickable.
 *
 * Agents cite files by path and line constantly, and in an ordinary reader those
 * citations are dead text: the reader has to retype them somewhere else. Wrapping
 * them in an anchor with a private `moye-ref:` scheme lets the app decide what
 * "open" means per platform while the WebView never tries to navigate anywhere.
 *
 * Runs after `rehype-sanitize`, exactly like `rehypeSourceLine`, so nothing needs
 * allow-listing. It skips `pre`/`code` subtrees, where a path is sample code
 * rather than a citation, and skips existing links.
 */
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** A path with an extension, a colon, and a line — `a/b.ts:12` or `a/b.ts:12:4`.
 *  Requiring the extension keeps prose like "note:12" out of it. */
const REF_RE = /([\w.@-]+(?:[\\/][\w.@-]+)*\.[A-Za-z0-9]{1,8}):(\d+(?::\d+)?)/g;

const SKIP_TAGS = new Set(["pre", "code", "a"]);

function linkify(value: string): HastNode[] | null {
  REF_RE.lastIndex = 0;
  if (!REF_RE.test(value)) return null;
  REF_RE.lastIndex = 0;

  const out: HastNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = REF_RE.exec(value)) !== null) {
    if (match.index > last) {
      out.push({ type: "text", value: value.slice(last, match.index) });
    }
    const label = `${match[1]}:${match[2]}`;
    out.push({
      type: "element",
      tagName: "a",
      properties: { href: `moye-ref:${label}`, className: ["file-ref"] },
      children: [{ type: "text", value: label }],
    });
    last = match.index + match[0].length;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

/**
 * `inherited` carries the skip decision down the tree rather than re-deriving it
 * per node. Syntax highlighting runs before this and splits a code block into
 * `<pre><code><span class="hljs-…">`, and the text actually holding the path sits
 * inside that `span` — which is not in `SKIP_TAGS` itself. Deciding per node
 * therefore linkified citations inside highlighted code, while plain unlabelled
 * code (no spans at all) was correctly left alone. That difference is why the
 * unit test, whose fixture is a bare `pre > code > text`, never saw it.
 */
function walk(node: HastNode, inherited = false): void {
  if (!node.children) return;
  const skip = inherited || (node.tagName !== undefined && SKIP_TAGS.has(node.tagName));
  const next: HastNode[] = [];
  for (const child of node.children) {
    if (!skip && child.type === "text" && typeof child.value === "string") {
      const parts = linkify(child.value);
      if (parts) {
        next.push(...parts);
        continue;
      }
    }
    if (child.type === "element") walk(child, skip);
    next.push(child);
  }
  node.children = next;
}

export function rehypeFileRefs() {
  return (tree: HastNode) => {
    walk(tree);
  };
}
