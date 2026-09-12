import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

export async function readMarkdownFile(path: string): Promise<string> {
  if (!isTauri()) {
    throw new Error("This environment cannot read files by path");
  }
  return invoke<string>("read_markdown", { path });
}

export async function writeMarkdownFile(path: string, contents: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("This environment cannot write files by path");
  }
  await invoke("write_markdown", { path, contents });
}

/** Thrown by `withTimeout` so callers can tell a deadline apart from a real
 *  read failure and say something more useful than the raw message. */
export class TimeoutError extends Error {
  constructor() {
    super("timed out");
    this.name = "TimeoutError";
  }
}

/**
 * Reject once `ms` has passed without `promise` settling.
 *
 * Opening a document is a cross-process call: a `content://` URI is served by
 * whichever app owns the file, so Moye is waiting on a provider it does not
 * control, and the native read reports no progress and cannot be cancelled.
 * Without a deadline the reader simply keeps showing whatever was on screen
 * before, which the user rightly reads as "it ignored my tap". The read itself
 * is left running; only the UI gives up waiting.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}
