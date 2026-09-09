use std::process::Command;

fn exe_path() -> Result<String, String> {
    std::env::current_exe()
        .map_err(|err| err.to_string())?
        .to_str()
        .map(str::to_string)
        .ok_or_else(|| "可执行文件路径不是有效 UTF-8".into())
}

fn reg_add(key: &str, name: Option<&str>, data: &str) -> Result<(), String> {
    let mut args = vec!["add", key, "/t", "REG_SZ", "/d", data, "/f"];
    if let Some(name) = name {
        args.insert(2, "/v");
        args.insert(3, name);
    } else {
        args.insert(2, "/ve");
    }
    let status = Command::new("reg")
        .args(&args)
        .status()
        .map_err(|err| format!("reg add 失败: {err}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("reg add 退出码 {status}"))
    }
}

fn reg_delete(key: &str) {
    let _ = Command::new("reg").args(["delete", key, "/f"]).status();
}

pub fn associate_markdown() -> Result<(), String> {
    let exe = exe_path()?;
    let open = format!("\"{exe}\" \"%1\"");
    let icon = format!("{exe},0");

    reg_add(r"HKCU\Software\Classes\MDViewer.markdown", None, "Markdown Document")?;
    reg_add(
        r"HKCU\Software\Classes\MDViewer.markdown\DefaultIcon",
        None,
        &icon,
    )?;
    reg_add(r"HKCU\Software\Classes\MDViewer.markdown\shell", None, "open")?;
    reg_add(
        r"HKCU\Software\Classes\MDViewer.markdown\shell\open",
        None,
        "用 MD Viewer 打开",
    )?;
    reg_add(
        r"HKCU\Software\Classes\MDViewer.markdown\shell\open\command",
        None,
        &open,
    )?;

    for ext in [".md", ".markdown"] {
        let class_key = format!(r"HKCU\Software\Classes\{ext}");
        let open_with = format!(r"HKCU\Software\Classes\{ext}\OpenWithProgids");
        reg_add(&class_key, None, "MDViewer.markdown")?;
        reg_add(&open_with, Some("MDViewer.markdown"), "")?;
        let user_choice = format!(
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\{ext}\UserChoice"
        );
        let backup = format!(
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\{ext}\UserChoiceBackup"
        );
        reg_delete(&user_choice);
        reg_delete(&backup);
    }

    let _ = Command::new("ie4uinit.exe").arg("-show").status();
    Ok(())
}
