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
2. 双击 `.md` 应用本软件打开（默认预览）
3. 卸载会移除快捷方式和文件关联

不需要单独编译 `md-viewer.nsi`。那份脚本只作备份。
