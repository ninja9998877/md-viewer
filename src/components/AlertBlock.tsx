import { Children, type ReactNode } from "react";
import { ALERT_META, parseAlert, type AlertKind } from "../lib/markdown";

export function AlertBlock({
  children,
  dataAlert,
  sourceLine,
}: {
  children: ReactNode;
  dataAlert?: string;
  sourceLine?: number;
}) {
  const parsed = parseAlert(children);
  const kind = (parsed?.kind || dataAlert?.toLowerCase()) as AlertKind | undefined;
  const lineAttr = sourceLine ? { "data-source-line": sourceLine } : {};
  if (!kind || !ALERT_META[kind]) {
    return (
      <blockquote className="quote" {...lineAttr}>
        {children}
      </blockquote>
    );
  }

  const rest = parsed?.rest ?? Children.toArray(children);
  const meta = ALERT_META[kind];
  return (
    <aside className={`alert alert--${kind}`} {...lineAttr}>
      <div className="alert__kicker">{meta.label}</div>
      <div className="alert__body">{rest}</div>
    </aside>
  );
}
