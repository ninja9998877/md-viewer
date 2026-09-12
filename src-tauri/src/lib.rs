use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::Emitter;

#[cfg(windows)]
mod win_assoc;

fn is_markdown_path(path: &str) -> bool {
    let lower = path.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".txt")
}

struct FileWatch {
    path: Option<String>,
    last_sig: Option<(u64, u64)>,
    ignore_until: u64,
}

fn watch_state() -> &'static Mutex<FileWatch> {
    static STATE: OnceLock<Mutex<FileWatch>> = OnceLock::new();
    STATE.get_or_init(|| {
        Mutex::new(FileWatch {
            path: None,
            last_sig: None,
            ignore_until: 0,
        })
    })
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn file_sig(path: &str) -> Option<(u64, u64)> {
    let meta = std::fs::metadata(path).ok()?;
    let modified = meta
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_millis() as u64;
    Some((modified, meta.len()))
}

fn stamp_own_write(path: &str) {
    let mut watch = watch_state().lock().unwrap_or_else(|err| err.into_inner());
    watch.ignore_until = now_ms().saturating_add(1500);
    if watch.path.as_deref() == Some(path) {
        watch.last_sig = file_sig(path);
    }
}

fn launch_markdown() -> Option<String> {
    std::env::args().skip(1).find(|path| is_markdown_path(path))
}

/// Paths handed to us at launch, held until the webview asks for them.
///
/// The frontend cannot be listening the instant the process starts, so pushing
/// the path with an event means guessing when the webview is ready — and a
/// wrong guess drops the file, leaving the user on the welcome screen. Queue it
/// instead and let the frontend drain the queue once its JS is running.
fn launched_files() -> &'static Mutex<Vec<String>> {
    static STATE: OnceLock<Mutex<Vec<String>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(Vec::new()))
}

fn remember_launch(path: String) {
    launched_files()
        .lock()
        .unwrap_or_else(|err| err.into_inner())
        .push(path);
}

#[tauri::command]
fn read_markdown(path: String) -> Result<String, String> {
    if !is_markdown_path(&path) {
        return Err("Only .md / .markdown / .txt files are supported".into());
    }
    std::fs::read_to_string(&path).map_err(|err| format!("Read failed: {err}"))
}

#[tauri::command]
fn write_markdown(path: String, contents: String) -> Result<(), String> {
    if !is_markdown_path(&path) {
        return Err("Only .md / .markdown / .txt files can be saved".into());
    }
    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|err| format!("Could not create folder: {err}"))?;
        }
    }
    std::fs::write(&path, contents).map_err(|err| format!("Write failed: {err}"))?;
    stamp_own_write(&path);
    Ok(())
}

#[tauri::command]
fn watch_markdown(path: Option<String>) {
    let mut watch = watch_state().lock().unwrap_or_else(|err| err.into_inner());
    watch.path = path.filter(|item| is_markdown_path(item));
    watch.last_sig = watch.path.as_ref().and_then(|item| file_sig(item));
}

#[tauri::command]
fn associate_markdown_files() -> Result<(), String> {
    #[cfg(windows)]
    {
        win_assoc::associate_markdown()
    }
    #[cfg(not(windows))]
    {
        Ok(())
    }
}

#[tauri::command]
fn take_launch_files() -> Vec<String> {
    let mut files = launched_files().lock().unwrap_or_else(|err| err.into_inner());
    std::mem::take(&mut *files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_markdown,
            write_markdown,
            watch_markdown,
            associate_markdown_files,
            take_launch_files
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_millis(700));
                let changed = {
                    let mut watch = watch_state().lock().unwrap_or_else(|err| err.into_inner());
                    let Some(path) = watch.path.clone() else {
                        continue;
                    };
                    let Some(sig) = file_sig(&path) else {
                        continue;
                    };
                    if now_ms() < watch.ignore_until {
                        watch.last_sig = Some(sig);
                        continue;
                    }
                    if watch.last_sig == Some(sig) {
                        continue;
                    }
                    watch.last_sig = Some(sig);
                    path
                };
                let _ = handle.emit("file-changed", changed);
            });
            // Queue only: the frontend drains this via `take_launch_files`.
            if let Some(path) = launch_markdown() {
                remember_launch(path);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
