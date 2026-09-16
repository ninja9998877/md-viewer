/**
 * A small, deliberately boring record of what the app was doing when something
 * went wrong.
 *
 * Every user-visible error already funnels through one place (`showAlert`), so
 * keeping the last one costs nothing and turns "I tapped it and nothing
 * happened" into something actionable. Nothing here leaves the device unless the
 * reader copies it out themselves — there is no telemetry in this app, and this
 * is not a back door for any.
 */
let lastError: string | null = null;

export function recordError(message: string): void {
  // Collapse whitespace: these strings are built for display and often carry
  // newlines that would break a one-line-per-field report.
  const cleaned = message.replace(/\s+/g, " ").trim();
  // Whitespace-only is not an error, it is the absence of one. Keeping the empty
  // string would print `lastError: ` and read as a field that failed to fill in,
  // rather than as "nothing went wrong".
  lastError = cleaned || null;
}

export function diagnosticsText(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  lines.push(`lastError: ${lastError ?? "(none)"}`);
  return lines.join("\n");
}
