import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "../lib/platform";
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
  onZoomImage?: (src: string, alt: string) => void,
  onOpenRef?: (ref: string) => void,
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
      ...props
    }: {
      className?: string;
      children?: ReactNode;
      [key: string]: unknown;
    }) => {
      const isBlock =
        typeof className === "string" &&
        (className.includes("language-") || className.includes("hljs"));
      if (isBlock) {
        // Forward the fence's title (see `remarkCodeMeta`) down to the element
        // that PreBlock inspects; without this the label is dropped here.
        return (
          <code className={className} data-title={props["data-title"] as string | undefined}>
            {children}
          </code>
        );
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
      // A file citation wrapped by `rehypeFileRefs`, under a private scheme so
      // the WebView never tries to navigate it.
      if (href?.startsWith("moye-ref:")) {
        const ref = href.slice("moye-ref:".length);
        return (
          <a
            href={href}
            className="file-ref"
            onClick={(event) => {
              event.preventDefault();
              onOpenRef?.(ref);
            }}
          >
            {children}
          </a>
        );
      }
      const external = Boolean(href && /^https?:\/\//i.test(href));
      return (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer noopener" : undefined}
          onClick={
            external
              ? (event) => {
                  // Hand the URL to the system browser rather than letting the
                  // WebView navigate to it. Moye is local-only and ships
                  // without the INTERNET permission, so an in-app navigation
                  // could only fail; the browser is a different app and does
                  // its own networking. In a plain browser (web dev) leave the
                  // click alone.
                  if (!isTauri()) return;
                  event.preventDefault();
                  void openUrl(href as string).catch(() => {
                    /* no browser installed — nothing useful to say */
                  });
                }
              : undefined
          }
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
    img: ({ src, alt }: { src?: string; alt?: string }) => {
      const resolved = resolveImageSrc(src, filePath);
      return (
        <img
          src={resolved}
          alt={alt ?? ""}
          loading="lazy"
          className="md-img"
          // Pinch-zoom is disabled app-wide (it used to wedge the WebView in a
          // zoomed state the reader could not pan out of), so this is the only
          // way to actually enlarge a diagram on a phone.
          onClick={onZoomImage ? () => onZoomImage(resolved, alt ?? "") : undefined}
        />
      );
    },
  } as Components;
}
