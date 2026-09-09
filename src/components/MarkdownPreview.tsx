import { useMemo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import { getNodeText, splitFrontmatter, uniqueSlug } from "../lib/markdown";
import { remarkGithubAlerts } from "../lib/remark-github-alerts";
import { remarkHeadingIds } from "../lib/remark-heading-ids";
import { remarkSupersub } from "../lib/remark-supersub";
import { bodyLineOffset, dataLineFromProps, rehypeSourceLine } from "../lib/source-line";
import { AlertBlock } from "./AlertBlock";
import { FrontmatterCard } from "./FrontmatterCard";
import { PreBlock } from "./CodeBlock";

interface MarkdownPreviewProps {
  content: string;
  isDark: boolean;
}

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function heading(Tag: HeadingTag, idMap: Map<string, number>) {
  return ({
    children,
    id,
    ...props
  }: {
    children?: ReactNode;
    id?: string;
    [key: string]: unknown;
  }) => {
    const hid = id || uniqueSlug(getNodeText(children), idMap);
    const line = dataLineFromProps(props);
    return (
      <Tag id={hid} {...(line ? { "data-source-line": line } : {})}>
        {children}
      </Tag>
    );
  };
}

export function MarkdownPreview({ content, isDark }: MarkdownPreviewProps) {
  const { data, body } = useMemo(() => splitFrontmatter(content), [content]);
  const offset = useMemo(() => bodyLineOffset(content, body), [content, body]);
  const hasMatter = Object.keys(data).length > 0;

  const components = useMemo(() => {
    const idMap = new Map<string, number>();
    return {
      h1: heading("h1", idMap),
      h2: heading("h2", idMap),
      h3: heading("h3", idMap),
      h4: heading("h4", idMap),
      h5: heading("h5", idMap),
      h6: heading("h6", idMap),
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
      }) => {
        const dataAlert = String(
          node?.properties?.dataAlert ?? node?.properties?.["data-alert"] ?? "",
        );
        return (
          <AlertBlock dataAlert={dataAlert} sourceLine={dataLineFromProps(props)}>
            {children}
          </AlertBlock>
        );
      },
      a: ({
        href,
        children,
      }: {
        href?: string;
        children?: ReactNode;
      }) => {
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
        <img src={src} alt={alt ?? ""} loading="lazy" />
      ),
    } as Components;
  }, [isDark, content]);

  return (
    <div className="md-body">
      {hasMatter ? (
        <div data-source-line={1}>
          <FrontmatterCard data={data} />
        </div>
      ) : (
        <FrontmatterCard data={data} />
      )}
      <ReactMarkdown
        remarkPlugins={[
          [remarkGfm, { singleTilde: false }],
          remarkGithubAlerts,
          remarkMath,
          remarkSupersub,
          remarkHeadingIds,
        ]}
        rehypePlugins={[
          rehypeKatex,
          [rehypeHighlight, { ignoreMissing: true }],
          rehypeSourceLine(offset),
        ]}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
