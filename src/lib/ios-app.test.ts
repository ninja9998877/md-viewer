import { describe, expect, it, vi, afterEach } from "vitest";

const { openUrl, platform } = vi.hoisted(() => ({
  openUrl: vi.fn(),
  platform: { tauri: false },
}));

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl }));
vi.mock("./platform", () => ({ isTauri: () => platform.tauri }));

import { IOS_APP_ID, IOS_APP_URL, openIosAppPage } from "./ios-app";

afterEach(() => {
  vi.unstubAllGlobals();
  platform.tauri = false;
  openUrl.mockClear();
});

describe("the iPhone link", () => {
  it("points at the real App Store record", () => {
    // A wrong id is silent: the reader taps "iPhone app", the store opens on
    // some other product, and nothing anywhere reports an error.
    expect(IOS_APP_ID).toBe("6811943403");
    expect(IOS_APP_URL).toBe("https://apps.apple.com/app/id6811943403");
  });

  it("names no storefront, so Apple picks one that can actually sell it", () => {
    // 这条曾经是反的,所以两边的理由都留在这里。
    //
    // 我一度写成 /cn/,并留了一段「浏览器实测」当依据 —— 测出来不带前缀会跳到
    // App Store 的 Today 首页。看着无懈可击。但那些测量全部来自这台机器,而它
    // 在中国,苹果按出口 IP 做地域重定向;真正的原因是**这个 App 没有在中国区
    // 上架**(174 个地区唯独缺 CHN),所以 /cn/ 指向的是唯一一个买不到它的商店。
    // 换句话说:我把链接"修"成了唯一真正会失效的那一种。
    //
    // 现在钉死不许有地区段。这台机器**验证不了**别的地区的正确行为,只能验证
    // 中国区的错误行为 —— 而那个恰恰是唯一不该信的样本。
    expect(IOS_APP_URL).not.toMatch(/apps\.apple\.com\/[a-z]{2}(-[A-Za-z]{2,4})?\//);
  });

  it("is https, so the opener plugin's default scope accepts it", () => {
    // opener:default 只放行 mailto:, tel: 和 http(s): —— 自定义 scheme 会被直接拒。
    expect(IOS_APP_URL.startsWith("https://")).toBe(true);
    expect(IOS_APP_URL).not.toContain("itms-apps");
  });
});

describe("opening it", () => {
  it("opens a new tab outside the app", async () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    await openIosAppPage();
    expect(open).toHaveBeenCalledWith(IOS_APP_URL, "_blank", "noopener,noreferrer");
  });

  it("goes through the native opener inside the app", async () => {
    platform.tauri = true;
    await openIosAppPage();
    expect(openUrl).toHaveBeenCalledWith(IOS_APP_URL);
  });
});
