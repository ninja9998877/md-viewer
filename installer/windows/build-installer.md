# Windows 安装包

用 Tauri 官方 NSIS 打包，安装时会注册 `.md` / `.markdown` 文件关联。

```bash
cd C:\Users\super\md-viewer
npm run dist:win
```

产物：

```
src-tauri\target\release\bundle\nsis\MD Viewer_0.1.0_x64-setup.exe
release\MD Viewer_0.1.0_x64-setup.exe
```

安装后：

1. 开始菜单 / 桌面有 MD Viewer
2. 安装向导有一页「文件关联」，默认勾选「设为 Markdown 默认打开方式」；取消勾选则不抢 Notepad++ 等现有软件
3. 若装完仍被别的软件打开：打开 MD Viewer，点顶栏「设为默认」，然后关掉资源管理器再双击 `.md`
4. 卸载会移除快捷方式和本软件写入的关联

不需要单独编译 `md-viewer.nsi`。那份脚本只作备份。
