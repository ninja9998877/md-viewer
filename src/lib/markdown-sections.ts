import {
  headingPlainText,
  splitFrontmatter,
  uniqueSlug,
  type TocItem,
} from "./markdown";
import { bodyLineOffset } from "./source-line";

export interface DocSection {
  key: string;
  startLine: number;
  endLine: number;
  markdown: string;
  headingId?: string;
  headingText?: string;
  headingLevel?: number;
  headingIds: string[];
}

export interface ParsedDoc {
  data: Record<string, string>;
  offset: number;
  sections: DocSection[];
  toc: TocItem[];
  idBySourceLine: Record<number, string>;
}

interface HeadingHit {
  index: number;
  level: number;
  text: string;
  id: string;
  sourceLine: number;
}

const LONG_SECTION = 380;

function scanHeadings(bodyLines: string[], offset: number): {
  toc: TocItem[];
  idBySourceLine: Record<number, string>;
  headings: HeadingHit[];
} {
  const used = new Map<string, number>();
  const toc: TocItem[] = [];
  const idBySourceLine: Record<number, string> = {};
  const headings: HeadingHit[] = [];
  let inFence = false;

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = headingPlainText(m[2]);
    if (!text) continue;
    const id = uniqueSlug(text, used);
    const sourceLine = offset + i + 1;
    toc.push({ level: m[1].length, text, id });
    idBySourceLine[sourceLine] = id;
    headings.push({ index: i, level: m[1].length, text, id, sourceLine });
  }
  return { toc, idBySourceLine, headings };
}

function makeSection(
  bodyLines: string[],
  offset: number,
  from: number,
  to: number,
  headings: HeadingHit[],
  heading?: HeadingHit,
): DocSection {
  const markdown = bodyLines.slice(from, to).join("\n");
  const nested = headings.filter((h) => h.index >= from && h.index < to);
  return {
    key: heading?.id ?? `intro-${from}`,
    startLine: offset + from + 1,
    endLine: offset + to,
    markdown,
    headingId: heading?.id,
    headingText: heading?.text,
    headingLevel: heading?.level,
    headingIds: nested.map((h) => h.id),
  };
}

function splitByLevels(
  bodyLines: string[],
  offset: number,
  headings: HeadingHit[],
  levels: number[],
): DocSection[] {
  const cuts = headings.filter((h) => levels.includes(h.level));
  if (cuts.length === 0) {
    return [makeSection(bodyLines, offset, 0, bodyLines.length, headings)];
  }
  const sections: DocSection[] = [];
  if (cuts[0].index > 0) {
    sections.push(makeSection(bodyLines, offset, 0, cuts[0].index, headings));
  }
  for (let i = 0; i < cuts.length; i++) {
    const start = cuts[i].index;
    const end = i + 1 < cuts.length ? cuts[i + 1].index : bodyLines.length;
    sections.push(makeSection(bodyLines, offset, start, end, headings, cuts[i]));
  }
  return sections;
}

function subsplitLong(
  section: DocSection,
  bodyLines: string[],
  offset: number,
  headings: HeadingHit[],
): DocSection[] {
  const lines = section.endLine - section.startLine + 1;
  if (lines <= LONG_SECTION) return [section];
  const deeper = (section.headingLevel ?? 1) + 1;
  if (deeper > 6) return [section];
  const from = section.startLine - offset - 1;
  const to = section.endLine - offset;
  const inner = headings.filter(
    (h) => h.index > from && h.index < to && h.level === deeper,
  );
  if (inner.length < 1) return [section];

  const parts: DocSection[] = [];
  const firstCut = inner[0].index;
  if (firstCut > from) {
    parts.push(
      makeSection(bodyLines, offset, from, firstCut, headings, {
        index: from,
        level: section.headingLevel ?? 1,
        text: section.headingText ?? "",
        id: section.headingId ?? section.key,
        sourceLine: section.startLine,
      }),
    );
  }
  for (let i = 0; i < inner.length; i++) {
    const start = inner[i].index;
    const end = i + 1 < inner.length ? inner[i + 1].index : to;
    parts.push(makeSection(bodyLines, offset, start, end, headings, inner[i]));
  }
  return parts.length ? parts : [section];
}

export function parseDocument(source: string): ParsedDoc {
  const { data, body } = splitFrontmatter(source);
  const offset = bodyLineOffset(source, body);
  const bodyLines = body.length === 0 ? [] : body.split("\n");
  const { toc, idBySourceLine, headings } = scanHeadings(bodyLines, offset);

  const splitLevels = headings.some((h) => h.level <= 2)
    ? [1, 2]
    : headings.some((h) => h.level === 3)
      ? [1, 2, 3]
      : [];

  let sections =
    splitLevels.length === 0
      ? [makeSection(bodyLines, offset, 0, bodyLines.length, headings)]
      : splitByLevels(bodyLines, offset, headings, splitLevels);

  sections = sections.flatMap((section) =>
    subsplitLong(section, bodyLines, offset, headings),
  );

  return { data, offset, sections, toc, idBySourceLine };
}

export function extractDocumentToc(source: string): TocItem[] {
  return parseDocument(source).toc;
}
