# 墨页 Moye · 开源商业化、技术路线与 Roadmap

> 产品名：**墨页**（英文 **Moye**）。  
> 一句话：给 AI 写的 Markdown 用的本地阅读器。打开就是预览，像纸一样读，文件不离开电脑。  
> 本仓库：Windows / macOS / Linux 桌面版。目标：MIT 开源，GitHub 免费下载。移动端不在此仓库。

本文是内部规划，不是功能清单。先定「靠什么活、不做什么」，再排技术。

---

## 1. 定位：卖什么

### 是

- AI / Agent 输出的 `.md` 的**阅读层**
- 默认预览，编辑为辅
- 本地、隐私、打开即用
- 让长文「像一篇读物」，而不是黑字墙

### 不是

- 不是 Typora / iA Writer 的编辑器替代
- 不是 Obsidian 的知识库
- 不是 VS Code 插件
- 不要做成「功能最全的 Markdown IDE」

对苹果商店和开源社区，都只讲这一句：

> 墨页：Agent 写的长文，终于能好好读完。文件不出本机。

功能（GFM、Mermaid、公式、目录）是证据，不是卖点。

---

## 2. 开源商业化模型

采用 **「MIT 开源核心 + 商店买断发行」**，不要订阅，不要 GPL。

| 渠道 | 给用户什么 | 怎么赚钱 |
|---|---|---|
| GitHub（公开后） | 完整阅读+编辑源码，自己编译 | 信任、Star、贡献、Windows/Linux 用户 |
| GitHub Releases | 免费安装包（Win / macOS / Linux） | 获客，不设功能墙 |
| Mac App Store | 同一套阅读器，签名、沙盒、双击打开、自动更新 | **一次性买断**（建议 $6.99 / ¥48） |
| 手机 / 平板 | 不在本仓库 | 另作商店发行 |

### 为什么这样

- 阅读器没有「每月必须续费」的理由，订阅会劝退。
- 苹果用户为「干净、签名、系统集成」付小额买断，成立。
- 开源用户自己编、用 Releases，不付钱也完整，避免「开源却锁核心」的反噬。
- GPL 和 App Store 条款冲突；公开时用 **MIT**。

### 现在不要做的商业化

- 不要对目录、提示块、Mermaid、公式收费
- 不要做账号系统
- 不要上传用户文档
- 不要做主题商店分成（太早）
- 不要把移动端商店包放进本仓库

### 以后可以加的付费（P4+，仍不锁阅读）

仅在「开源版已经好用」之后考虑，全部可选：

- PDF / 精美 HTML 导出
- 多标签、阅读位置同步（iCloud）
- 额外阅读主题 / 自定义 CSS
- 文件夹监听、最近项目

付费是加速，不是门槛。核心阅读路径必须永远免费且开源。

---

## 3. 技术路线

继续 **Tauri 2 + React + CodeMirror 6**，不要为上架苹果而重写成 Swift。上架要补的是签名、沙盒、权限，不是换引擎。

```
┌─────────────────────────────────────────┐
│  阅读 UI（React）                         │
│  预览 / 目录 / 提示块 / 纸面排版            │
├─────────────────────────────────────────┤
│  编辑（CodeMirror，按需加载）               │
├─────────────────────────────────────────┤
│  Tauri 2 壳                              │
│  文件、拖放、文件关联、沙盒 bookmark         │
├──────────────┬──────────────┬───────────┤
│ Windows NSIS │ Mac .app/dmg │ Linux     │
│ 安装包+关联   │ GitHub 免费  │ AppImage  │
└──────────────┴──────────────┴───────────┘
```

### 必须守住的技术约束

1. **解析与渲染分离**：万行文档不能整页 React 树。按标题切块 + 视口渲染 + Worker 解析。
2. **源码行映射保留**：编辑/预览同步滚动、目录跳转都依赖 `data-source-line`，虚拟化时不能丢。
3. **本地权威**：任何云同步只能是附加层；打开文件永远走本机路径。
4. **许可证干净**：依赖保持 MIT/Apache/BSD；不要引入 GPL 组件。
5. **苹果沙盒**：用户选过的文件用 security-scoped bookmark；不能默认扫全盘。

### 平台优先级

1. Windows（现在就能发）
2. macOS 独立包（GitHub 免费下载）
3. Linux 随开源一起发
4. 移动端不在本仓库

### 工程基建（开源前必须有）

- GitHub Actions：`tauri build` 出 Win / macOS / Linux
- 版本号单一来源：`package.json` + `tauri.conf.json`
- 无遥测；若以后加更新检查，默认关、可关
- `CHANGELOG.md`

---

## 4. Roadmap

按关卡推进，不按「想做的功能」摊饼。前一关没过，不上下一关。

### 现在（私有）

已有：预览优先、Agent 提示块、目录跳转、编辑滚动跟随、纸面排版、KaTeX / Mermaid、Windows exe。

### 记下、但不插队

- [x] **界面国际化**：`zh-CN` + `en`，跟随系统语言，顶栏可手动切换。文档内容本身已是 Unicode；不做 RTL、不做全球字体包。

### P0 · 阅读器合格（约 4–6 周）

目标：自己每天用，不怕打开 2000+ 行的 Agent 文档。

- [x] 预览按标题虚拟化，万行不卡（硬指标）
- [x] 本地相对路径图片（同目录相对路径，Tauri asset 协议）
- [x] Windows 安装包 + `.md` 文件关联
- [x] 最近文件
- [x] 阅读字号 / 纸面宽度
- [x] 原始 HTML 的安全子集（`details`、简单 div，禁止脚本）
- [x] 修沙盒/权限边缘（任意盘符打开失败等）

**过关：** 用自己的工作文档每天打开，不再需要 Typora 预览。

### P1 · 能上苹果（约 6–8 周）

目标：Mac 上双击 `.md` 用墨页打开，可公证分发。

- [x] Bundle ID：`com.ninja.moye`
- [ ] macOS 签名 + 公证（GitHub 分发用，门禁少拦）
- [ ] 沙盒、文件权限、拖放 bookmark
- [ ] macOS 文件关联、Dock、Retina 图标
- [x] 隐私说明：[PRIVACY.md](./PRIVACY.md)
- [ ] 深色模式跟系统

**过关：** 官网/GitHub 能下载已公证的 `.dmg`，Gatekeeper 不拦。

### P2 · 开源（约 4 周，可与 P1 尾部重叠）

目标：公开本仓库，GitHub Releases 提供 Win / macOS / Linux 安装包。

- [x] 许可证 MIT
- [ ] 仓库转 Public，GitHub Releases 自动发桌面包
- [ ] README / 主页与定位同一句

**过关：** GitHub 能 clone 编出同样功能；安装包可免费下载。

### P3 · 不在本仓库

手机 / 平板商店版另仓维护，不并入桌面开源树。

### P4 · 增值（有用户之后再做）

- 导出 PDF / HTML
- 多标签
- iCloud 阅读位置
- 自定义 CSS
- `moye path.md` 命令行（SSH / Agent 调用）

未过 P0/P1 不做 P4。

---

## 5. 版本与时间（建议）

| 版本 | 内容 | 大致时间 |
|---|---|---|
| 0.1 | 现在：私有，Windows 能用 | 已到 |
| 0.2 | P0 阅读器合格 + Win 安装包 | 1–1.5 月 |
| 0.3 | P1 macOS 公证包 | 再 1.5–2 月 |
| 1.0 | P2 开源 + 三端桌面包 | 再 1 月 |
| 1.1 | Linux 包 + 小幅阅读增强 | 随 1.0 |

一人开发，按「关卡」不要按日历死磕。P0 虚拟化是技术最大风险，应最先做。

---

## 6. App Store 文案（先写死，避免做偏）

- **名称：** 墨页 / **Moye**
- **副标题（中）：** 给 AI 写的 Markdown 阅读器
- **Subtitle (EN):** A local reader for AI-written Markdown
- **介绍首段（中）：** 把 Agent 写的 Markdown 当成读物打开。默认预览，像纸一样读，文件只留在这台设备上。
- **Intro (EN):** Open Markdown from an Agent as a document, not an editor. Preview first, read like paper, files stay on this device.
- **关键词方向：** Markdown、阅读、AI、预览、本地、隐私 / Markdown, reader, AI, preview, local, privacy  
  避开：笔记、知识库、编辑器、Obsidian
- **权限说明：** 仅在你打开或拖入文件时读取该文件 / Only reads a file when you open or drop it

---

## 7. 开源时的仓库策略

公开当天：

1. `LICENSE` = MIT
2. 历史提交可保留（当前私有仓直接转 Public 即可）
3. Issue 模板只要 Bug / 阅读效果两类，拒绝「做成 VS Code」类需求
4. 不接功能膨胀 PR（同步、插件市场、Vim 模式）除非符合阅读器定位
5. Windows / macOS / Linux 以 GitHub Releases 免费安装包为主

---

## 8. 成功标准（12 个月）

不看 DAU 神话，看这三件：

1. **自己不用别的预览器了**
2. **Mac App Store 能搜到、能买、评分不崩**
3. **GitHub 上有人用 Issues 反馈「这篇 Agent 文档某处难看」** —— 说明定位被理解

如果用户跑来问「怎么当知识库用」，说明文案偏了，改文案，不要加双向链接。
