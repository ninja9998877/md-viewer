# MD Viewer

专为 AI 生成的 Markdown 打造的本地阅读器。  
打开就是预览，好看、干净，文件不离开你的电脑。

不是又一个编辑器。Agent、ChatGPT、Claude 写出来的长文，默认以阅读排版呈现：提示块、目录、代码折叠、公式和图表。需要改的时候再按 `E`。

## 产品原则

- **阅读优先**：双击 `.md`、拖入文件，都先进入预览
- **为 Agent 文档排版**：`[!NOTE]` / `TIP` / `WARNING`、YAML 头、超长代码块
- **本地隐私**：文档只在本机打开，不上传
- **编辑为辅**：`E` 进入编辑，`Esc` 回预览；编辑时左右滚动对齐

## 开发

```bash
npm install
npm run dev          # 浏览器 http://localhost:1420
npm run tauri dev    # 桌面端
npm run tauri build -- --no-bundle   # 产出 exe
```

打开 `examples/full-syntax.md` 可看完整语法和阅读效果。

## 技术栈

Tauri 2 · React 19 · CodeMirror 6 · react-markdown

## 状态

私有开发中。计划上架 Mac App Store；源码暂不公开。
