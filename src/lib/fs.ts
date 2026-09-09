import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

export async function readMarkdownFile(path: string): Promise<string> {
  if (!isTauri()) {
    throw new Error("当前环境不能按路径读文件");
  }
  return invoke<string>("read_markdown", { path });
}

export async function writeMarkdownFile(path: string, contents: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("当前环境不能按路径写文件");
  }
  await invoke("write_markdown", { path, contents });
}
