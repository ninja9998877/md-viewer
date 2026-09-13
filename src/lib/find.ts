/**
 * In-document search.
 *
 * Matches are computed over the **source text**, never by scanning the rendered
 * DOM: the preview only keeps a window of sections mounted, so a DOM scan would
 * silently miss every hit outside that window — the reader would be told "no
 * results" for text that is plainly in the document. Source offsets are mapped
 * to line numbers instead, which is what the preview needs in order to scroll.
 */
export interface FindMatch {
  /** Offset into the source text. */
  start: number;
  end: number;
  /** 1-based line number, in the same numbering as `DocSection.startLine`. */
  line: number;
}

/** A runaway query (a single letter in a huge document) must not build a
 *  hundred thousand ranges; past this we simply stop counting. */
export const FIND_MAX_MATCHES = 500;

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Offset at which each line starts, for offset → line lookups. */
function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function lineOfOffset(starts: number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/**
 * Every occurrence of `query` in `text`, in document order.
 *
 * Uses a case-insensitive regex rather than `toLowerCase()` + `indexOf()`:
 * lowercasing can change a string's length (Turkish `İ` lowercases to two code
 * points), which would shift every offset after it and send the reader to the
 * wrong line.
 */
export function findMatches(text: string, query: string): FindMatch[] {
  const needle = query.trim();
  if (!needle) return [];

  const pattern = new RegExp(escapeRegExp(needle), "gi");
  const starts = lineStarts(text);
  const out: FindMatch[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null && out.length < FIND_MAX_MATCHES) {
    out.push({
      start: match.index,
      end: match.index + match[0].length,
      line: lineOfOffset(starts, match.index),
    });
    // A zero-length match cannot happen with an escaped literal, but guard the
    // loop anyway rather than trusting that.
    if (match.index === pattern.lastIndex) pattern.lastIndex++;
  }
  return out;
}
