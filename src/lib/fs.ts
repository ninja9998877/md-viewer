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
