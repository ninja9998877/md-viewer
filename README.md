# 墨页 Moye

给 AI 写的 Markdown 用的本地阅读器。  
打开就是预览，像纸一样读，文件不离开你的电脑。

不是又一个编辑器。Agent 写出来的长文，默认以阅读排版呈现：提示块、目录、代码折叠、公式和图表。需要改的时候再按 `E`。

本仓库是 **Windows / macOS / Linux 桌面版**，免费使用，MIT 开源。iOS / Android 不在此仓库。

> ### 和「墨盒」是一对
>
> **墨盒**负责**记**，墨页负责**读**：墨盒把随手打的字、截图取出来的文字、语音转出来的话，整理成干净的 Markdown 存进你选的文件夹；墨页把那些文件按阅读排版摆开。
>
> 两个 App 之间**没有接口调用、没有账号、没有同步、没有联网** —— 它们的接口就是**文件本身**。这不是宣传话术，是一条能被验证的真话：墨盒存下来的东西，墨页直接打开就行，不需要导出、不需要转换。这条契约有测试钉着（`src/lib/mohe-interop.test.ts`），两边各钉一半。
>
> 共用一套格式也意味着**换工具不用搬家**：它们写的都是普通的 `.md`，带一小段 YAML 头。哪天你不想用这两个了，文件还在原地，任何编辑器都能打开。

> ### 手机上读？
>
> **iPhone 版已在 App Store 上架** → [墨页 Moye](https://apps.apple.com/app/id6811943403)（$2.99）
>
> 同一套阅读器，为触屏重做：分享一个 `.md` 进来就能读，长文档照样流畅，**一样没有联网代码**。买断制，无内购、无账号、无订阅。
>
> <sub>注：上面是**不带地区**的通用链接，苹果会按你所在地区跳转。目前**中国大陆区暂未上架**，所以国内打开会提示找不到页面 —— 换其他地区账号即可。安卓版同理。</sub>
>
> 桌面版永远免费开源。手机版收费只是因为它在商店里分发 —— 这也正是它**一个 SDK 都不用加**的原因。苹果商店的收钱发生在安装之前，所以 App 里不需要任何会联网的支付库；免费的商店版往往做不到这一点。

## 产品原则

- **阅读优先**：双击 `.md`、拖入文件，都先进入预览
- **为 Agent 文档排版**：`[!NOTE]` / `TIP` / `WARNING`、YAML 头、超长代码块
- **本地隐私**：文档只在本机打开，不上传（见 [PRIVACY.md](./PRIVACY.md)）
- **编辑为辅**：`E` 进入编辑，`Esc` 回预览；编辑时左右滚动对齐

## 开发

```bash
npm install
npm run dev          # 浏览器 http://localhost:1420
npm run tauri dev    # 桌面端
npm run tauri build  # 按当前系统打包
```

> **在 Windows 上用 `npm install`，不要用 `npm ci`。**
>
> 仓库里的 `package-lock.json` 是在 Linux 上生成的（CI 跑在 Linux）。这套依赖里有
> 平台相关的原生包，npm 在不同平台上把它们**提升到不同位置** —— 比如 `lightningcss`
> 在 Linux 上挂在 `vite` 下、在 Windows 上挂在 `@tailwindcss/node` 下。结果是**一份
> lock 无法同时满足两个平台的 `npm ci`**：这是 npm 在这种依赖上的固有限制，不是
> 配置写错了。
>
> CI 用 Linux 的 lock 跑 `npm ci`（这是它该做的），本地开发用 `npm install` 就好，
> 两者结果一样。`npm install` 之后 lock 会有改动，**不要提交**。

Windows 安装包：`npm run dist:win`  
打开 `examples/full-syntax.md` 可看完整语法和阅读效果。

## 技术栈

Tauri 2 · React 19 · CodeMirror 6 · react-markdown

## 许可

[MIT](./LICENSE)
