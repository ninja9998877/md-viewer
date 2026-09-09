# Windows 安装包构建说明（带文件关联）

## 推荐方式（最简单）

使用 Tauri 官方的 NSIS 打包器（推荐）。

### 1. 修改 tauri.conf.json（已完成）

文件关联已在 `tauri.conf.json` 中配置：

```json
"fileAssociations": [
  {
    "ext": ["md", "markdown"],
    "name": "Markdown",
    "description": "Markdown Document",
    "role": "Editor"
  }
]
```

### 2. 打包命令

```bash
cd C:\Users\super\md-viewer

# 生产构建（会自动生成安装包）
npm run tauri build
```

构建完成后，安装包位于：

```
src-tauri\target\release\bundle\nsis\MD Viewer_0.1.0_x64-setup.exe
```

Tauri 2 会自动帮你处理大部分文件关联注册。

---

## 进阶：使用自定义 NSIS 脚本（更强控制）

如果你想更精确控制注册表行为，可以用我们提供的 `md-viewer.nsi`。

### 构建步骤：

1. 先执行生产构建：
   ```bash
   npm run tauri build
   ```

2. 把生成的 `md-viewer.exe` 复制到 `installer/windows` 目录下（或修改 nsi 里的路径）。

3. 使用 NSIS 编译：
   - 下载 NSIS（https://nsis.sourceforge.io/）
   - 右键 `md-viewer.nsi` → Compile NSIS Script

4. 生成的安装包会正确注册 `.md` 和 `.markdown` 文件关联。

---

## 测试建议

1. 在干净的虚拟机或另一台电脑上安装生成的 exe。
2. 双击任意 `.md` 文件，应该直接用 MD Viewer 打开，并且**默认是预览模式**。
3. 在软件内点击「新建」，应该新建一个空白 md 文件，并且**默认进入编辑模式**。
4. 卸载后，文件关联应该被正确移除。

---

需要我再帮你写一个 `build-installer.bat` 一键脚本吗？
