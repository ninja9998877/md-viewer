import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import { dataLineFromProps } from "../lib/source-line";
import { resolveImageSrc } from "../lib/resolve-image";
import { AlertBlock } from "./AlertBlock";
import { PreBlock } from "./CodeBlock";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function heading(
  Tag: HeadingTag,
  idBySourceLine: Record<number, string>,
) {
  return ({
    children,
    id,
    ...props
  }: {
    children?: ReactNode;
    id?: string;
    [key: string]: unknown;
  }) => {
    const line = dataLineFromProps(props);
    const hid = (line ? idBySourceLine[line] : undefined) || id;
    return (
      <Tag {...(hid ? { id: hid } : {})} {...(line ? { "data-source-line": line } : {})}>
        {children}
      </Tag>
    );
  };
}

export function createMarkdownComponents(
  isDark: boolean,
  idBySourceLine: Record<number, string>,
  filePath: string | null,
): Components {
  return {
    h1: heading("h1", idBySourceLine),
    h2: heading("h2", idBySourceLine),
    h3: heading("h3", idBySourceLine),
    h4: heading("h4", idBySourceLine),
    h5: heading("h5", idBySourceLine),
    h6: heading("h6", idBySourceLine),
    pre: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => (
      <PreBlock isDark={isDark} sourceLine={dataLineFromProps(props)}>
        {children}
      </PreBlock>
    ),
    code: ({
      className,
      children,
    }: {
      className?: string;
      children?: ReactNode;
    }) => {
      const isBlock =
        typeof className === "string" &&
        (className.includes("language-") || className.includes("hljs"));
      if (isBlock) {
        return <code className={className}>{children}</code>;
      }
      return <code className="inline-code">{children}</code>;
    },
    blockquote: ({
      children,
      node,
      ...props
    }: {
      children?: ReactNode;
      node?: { properties?: Record<string, unknown> };
      [key: string]: unknown;
    }) => (
      <AlertBlock
        dataAlert={String(
          node?.properties?.dataAlert ?? node?.properties?.["data-alert"] ?? "",
        )}
        sourceLine={dataLineFromProps(props)}
      >
        {children}
      </AlertBlock>
    ),
    a: ({ href, children }: { href?: string; children?: ReactNode }) => {
      const external = Boolean(href && /^https?:\/\//i.test(href));
      return (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer noopener" : undefined}
        >
          {children}
        </a>
      );
    },
    table: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      [key: string]: unknown;
    }) => {
      const line = dataLineFromProps(props);
      return (
        <div className="table-wrap" {...(line ? { "data-source-line": line } : {})}>
          <table>{children}</table>
        </div>
      );
    },
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <img src={resolveImageSrc(src, filePath)} alt={alt ?? ""} loading="lazy" />
    ),
  } as Components;
}
