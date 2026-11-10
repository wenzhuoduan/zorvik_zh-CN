import { afterEach, describe, expect, it, vi } from "vitest";
import { currentLanguage, initI18n, setLanguage, toggleLanguage } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
});

describe("initI18n", () => {
  it("does nothing in tests unless a locale is asked for", () => {
    document.body.innerHTML = "<button>Settings</button>";
    expect(initI18n()).toBeNull();
    expect(document.body.textContent).toBe("Settings");
  });

  it("translates the document and marks its language", () => {
    document.body.innerHTML = "<button>Settings</button>";
    vi.stubEnv("VITE_ZORVIK_LOCALE", "zh-CN");
    const stop = initI18n();
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.body.textContent).toBe("设置");
    expect(stop).not.toBeNull();
    stop?.();
  });

  it("keeps translating nodes rendered after start", async () => {
    document.body.innerHTML = "";
    vi.stubEnv("VITE_ZORVIK_LOCALE", "zh-CN");
    const stop = initI18n();
    const button = document.createElement("button");
    button.textContent = "Settings";
    document.body.append(button);
    await Promise.resolve();
    expect(button.textContent).toBe("设置");
    stop?.();
  });
});

describe("setLanguage", () => {
  it("goes back to the English original and translates again", () => {
    vi.stubEnv("VITE_ZORVIK_LOCALE", "zh-CN");
    document.body.innerHTML = '<button title="Close">Settings</button>';
    const stop = initI18n();
    expect(document.body.textContent).toBe("设置");

    setLanguage("en");
    expect(document.body.textContent).toBe("Settings");
    expect(document.querySelector("button")!.getAttribute("title")).toBe("Close");
    expect(document.documentElement.lang).toBe("en");

    setLanguage("zh-CN");
    expect(document.body.textContent).toBe("设置");
    expect(document.querySelector("button")!.getAttribute("title")).toBe("关闭");

    stop?.();
    setLanguage("en");
  });

  it("remembers the choice and toggles", () => {
    document.body.innerHTML = "";
    if (currentLanguage() !== "en") setLanguage("en");
    expect(toggleLanguage()).toBe("zh-CN");
    expect(localStorage.getItem("zorvik.locale")).toBe("zh-CN");
    expect(currentLanguage()).toBe("zh-CN");
    expect(toggleLanguage()).toBe("en");
    expect(localStorage.getItem("zorvik.locale")).toBe("en");
  });
});
