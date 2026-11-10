import { afterEach, describe, expect, it, vi } from "vitest";
import { initI18n } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
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
