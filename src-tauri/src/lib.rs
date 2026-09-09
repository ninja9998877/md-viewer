use tauri::{Emitter, Manager as _};

fn is_markdown_path(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".txt")
}

fn launch_markdown() -> Option<String> {
    std::env::args().skip(1).find(|path| is_markdown_path(path))
}

#[tauri::command]
fn read_markdown(path: String) -> Result<String, String> {
    if !is_markdown_path(&path) {
        return Err("只支持 .md / .markdown / .txt 文件".into());
    }
    std::fs::read_to_string(&path).map_err(|err| format!("读取失败: {err}"))
}

#[tauri::command]
fn write_markdown(path: String, contents: String) -> Result<(), String> {
    if !is_markdown_path(&path) {
        return Err("只支持保存为 .md / .markdown / .txt 文件".into());
    }
    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|err| format!("创建目录失败: {err}"))?;
        }
    }
    std::fs::write(&path, contents).map_err(|err| format!("保存失败: {err}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![read_markdown, write_markdown])
        .setup(|app| {
            if let Some(path) = launch_markdown() {
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(400));
                    let _ = handle.emit("open-file", path);
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
