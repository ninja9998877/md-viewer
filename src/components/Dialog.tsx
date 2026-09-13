import { useEffect, useRef } from "react";
import type { Messages } from "../i18n";

export interface DialogRequest {
  kind: "alert" | "confirm";
  message: string;
  /** Only present for `confirm`; called with the reader's answer. */
  resolve?: (accepted: boolean) => void;
}

interface DialogProps {
  request: DialogRequest;
  t: Messages;
  onResolve: (accepted: boolean) => void;
}

/**
 * In-app replacement for `window.alert` / `window.confirm`.
 *
 * This is not only about looks. wry's Android implementation hardcodes the
 * native dialog buttons to "OK" and "Cancel" (see RustWebChromeClient.kt), so a
 * Chinese interface showed English buttons on every error message and on the
 * "discard unsaved changes?" confirmation. Owning the dialog also means the
 * wording, the styling and the Escape key behave like the rest of the app.
 */
export function Dialog({ request, t, onResolve }: DialogProps) {
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the affirmative button so Enter confirms and the dialog is
    // reachable by keyboard without hunting for it.
    okRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      // Capture phase: the app listens for Escape as well (closing the find bar
      // and the contents list) and would otherwise handle this one first.
      event.stopPropagation();
      onResolve(request.kind === "alert");
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onResolve, request.kind]);

  return (
    <div className="dialog" role="dialog" aria-modal="true" onClick={() => onResolve(false)}>
      <div className="dialog__box" onClick={(event) => event.stopPropagation()}>
        <p className="dialog__message">{request.message}</p>
        <div className="dialog__actions">
          {request.kind === "confirm" ? (
            <button type="button" className="dialog__btn" onClick={() => onResolve(false)}>
              {t.cancel}
            </button>
          ) : null}
          <button
            ref={okRef}
            type="button"
            className="dialog__btn dialog__btn--primary"
            onClick={() => onResolve(true)}
          >
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
