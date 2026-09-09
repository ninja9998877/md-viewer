import { Children, type ReactNode } from "react";
import { parseAlert, type AlertKind } from "../lib/markdown";
import { useI18n, type Messages } from "../i18n";

const ALERT_KEY: Record<AlertKind, keyof Messages> = {
  note: "alertNote",
  tip: "alertTip",
  important: "alertImportant",
  warning: "alertWarning",
  caution: "alertCaution",
};

export function AlertBlock({
  children,
  dataAlert,
  sourceLine,
}: {
  children: ReactNode;
  dataAlert?: string;
  sourceLine?: number;
}) {
  const { t } = useI18n();
  const parsed = parseAlert(children);
  const kind = (parsed?.kind || dataAlert?.toLowerCase()) as AlertKind | undefined;
  const lineAttr = sourceLine ? { "data-source-line": sourceLine } : {};
  if (!kind || !ALERT_KEY[kind]) {
    return (
      <blockquote className="quote" {...lineAttr}>
        {children}
      </blockquote>
    );
  }

  const rest = parsed?.rest ?? Children.toArray(children);
  return (
    <aside className={`alert alert--${kind}`} {...lineAttr}>
      <div className="alert__kicker">{t[ALERT_KEY[kind]]}</div>
      <div className="alert__body">{rest}</div>
    </aside>
  );
}
