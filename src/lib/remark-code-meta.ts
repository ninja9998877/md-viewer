/**
 * Carry a fenced code block's info string through to the rendered element.
 *
 * Agents label their code blocks — ```` ```ts title="src/App.tsx" ```` — and that
 * label is the most useful thing to print above the code, because it answers
 * "which file is this?" for a reader who did not write it. remark-rehype drops
 * `meta`, so stash it in `hProperties`, which does survive into the hast tree.
 */
interface MdastNode {
  type?: string;
  meta?: string | null;
  data?: { hProperties?: Record<string, unknown> };
  children?: MdastNode[];
}

/**
 * Two conventions are in the wild: an explicit `title="..."`, and a bare path as
 * the first word (```` ```ts src/App.tsx ````). A bare word only counts when it
 * looks like a path — otherwise ```` ```js node ```` would be labelled "node".
 */
function titleFromMeta(meta: string): string {
  const quoted = /title="([^"]*)"/.exec(meta)?.[1];
  if (quoted) return quoted.trim();
  const bare = /^(\S*[\\/]\S+)/.exec(meta.trim())?.[1];
  return bare ? bare.trim() : "";
}

function walk(node: MdastNode): void {
  if (node.type === "code" && typeof node.meta === "string") {
    const title = titleFromMeta(node.meta);
    if (title) {
      node.data = node.data ?? {};
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        "data-title": title,
      };
    }
  }
  for (const child of node.children ?? []) walk(child);
}

export function remarkCodeMeta() {
  return (tree: MdastNode) => {
    walk(tree);
  };
}
