import { describe, expect, it, beforeEach } from "vitest";
import { diagnosticsText, recordError } from "./diagnostics";

beforeEach(() => {
  // `lastError` is module state with no reset, by design — the report is meant to
  // survive. Clear it by recording nothing so each case starts from "(none)".
  recordError("");
});

describe("diagnosticsText", () => {
  it("is one line per field, in insertion order", () => {
    expect(diagnosticsText({ app: "Moye 1.0", locale: "en" })).toBe(
      "app: Moye 1.0\nlocale: en\nlastError: (none)",
    );
  });

  it("collapses whitespace so a multi-line error cannot break the layout", () => {
    // These strings come from `showAlert` and are built for display; a raw
    // newline in one would silently split a field across two lines.
    recordError("  failed\n\n  to open  the file ");
    expect(diagnosticsText({})).toBe("lastError: failed to open the file");
  });
});
