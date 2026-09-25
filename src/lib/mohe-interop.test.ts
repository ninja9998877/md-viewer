import { describe, expect, it } from "vitest";
import { parseDocument } from "./markdown-sections";
import { splitFrontmatter } from "./markdown";

/**
 * 墨盒写下来的文件,墨页读起来是什么样。
 *
 * 墨盒和墨页是一对:墨盒负责**记**(打字、截图、语音 → 整理 → 存成普通 .md),
 * 墨页负责**读**(把 .md 按阅读排版摆开)。两个 App 之间**没有任何接口调用、没有
 * 账号、没有同步、没有联网** —— 它们的接口就是**文件本身**,交接点是用户选的那个
 * 文件夹。
 *
 * 这让"互相照应"不是宣传话术,而是一条能被验证的真话。但**没有任何东西会替你
 * 发现这条契约断了**:墨盒改个字段名,墨页只是安静地少显示一行;墨盒换个转义
 * 方式,墨页就把反斜杠原样摆给读者。两边都不报错。所以下面每一条都钉死。
 *
 * 对面那一半在 `mohe/src/core/format.test.ts` 的「给墨页读的形状(跨 App 契约)」。
 *
 * ★ 下面这份 fixture 是**照 `serialize()` 的真实输出抄的**,不是编的。
 *   我第一版就编错了 —— 在头与正文之间多写了一个空行,于是验的是一个不存在的
 *   形状。真实输出里标题**带引号**、正文**紧跟在分隔线后面**。
 */
const WRITTEN_BY_MOHE = [
  "---",
  'title: "周会上提到的两件事"',
  "created: 2026-09-25T14:32:10+08:00",
  "type: note",
  "---",
  "第一件是排期。第二件是测试。",
  "",
  "- 排期推到下周三",
  "- 测试要补真机",
  "",
].join("\n");

const bodyOf = (source: string) =>
  parseDocument(source)
    .sections.map((section) => section.markdown)
    .join("\n");

describe("墨盒写的文件", () => {
  it("front-matter 不进正文", () => {
    const body = bodyOf(WRITTEN_BY_MOHE);

    expect(body).not.toContain("title:");
    expect(body).not.toContain("created:");
    expect(body).not.toContain("type:");
    // 三条横线也不能剩:漏一条就渲染成一条分隔线,看起来像文件被切了一刀。
    expect(body).not.toContain("---");
  });

  it("正文一个字不少", () => {
    // 剥 header 剥过头就是把读者写的东西吃掉了 —— 比不剥更糟。
    const body = bodyOf(WRITTEN_BY_MOHE);

    expect(body).toContain("第一件是排期。第二件是测试。");
    expect(body).toContain("- 排期推到下周三");
    expect(body).toContain("- 测试要补真机");
  });

  it("头里的字段仍然读得到,引号也去掉了", () => {
    // 墨盒总是把值写成带引号的字符串(`yamlString`),所以"去引号"是常态,
    // 不是边角情况。
    const doc = parseDocument(WRITTEN_BY_MOHE);

    expect(doc.data.title).toBe("周会上提到的两件事");
    expect(doc.data.type).toBe("note");
    // 时间按写进去的原样读,不经过 Date 往返 —— 那会把带偏移的时刻挪走。
    expect(doc.data.created).toBe("2026-09-25T14:32:10+08:00");
  });

  /*
   * 墨盒的 `yamlString` 不只加引号,还会转义 `\` 和 `"`。所以一个标题里带引号、
   * 或者带 Windows 路径的笔记,读回来必须和写进去的一模一样。
   *
   * 这里曾经是坏的:墨页只把两端的引号切掉,不做反转义,读者看到的是
   * `he said \"hi\": C:\\path\\x`。**文件是对的,读的人错了。**
   */
  it("标题里的引号和反斜杠原样还原", () => {
    const truth = 'he said "hi": C:\\path\\x';
    const written = [
      "---",
      'title: "he said \\"hi\\": C:\\\\path\\\\x"',
      "type: note",
      "---",
      "正文",
      "",
    ].join("\n");

    expect(splitFrontmatter(written).data.title).toBe(truth);
    expect(parseDocument(written).data.title).toBe(truth);
  });

  it("单引号是 YAML 里另一种写法,没有转义", () => {
    // 不是墨盒写的,但同一份文件格式里合法,而两种引号的反转义规则**不一样**:
    // 单引号里 `\` 就是反斜杠本身,要表示单引号得写两个。
    const written = ["---", "title: 'it''s C:\\path'", "---", "正文", ""].join("\n");
    expect(splitFrontmatter(written).data.title).toBe("it's C:\\path");
  });
});
