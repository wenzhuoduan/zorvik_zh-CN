import { beforeEach, describe, expect, it } from "vitest";
import { normalize, t, tf, usePack } from "./translate";

describe("translate", () => {
  beforeEach(() => usePack("zh-CN"));

  it("collapses the whitespace JSX leaves in text nodes before looking a key up", () => {
    expect(normalize("\n        Settings\n      ")).toBe("Settings");
    expect(t("\n        Settings\n      ")).toBe("设置");
  });

  it("returns null for text it does not know, so the caller keeps English", () => {
    expect(t("Some string upstream added yesterday")).toBeNull();
  });

  it("fills patterns for assembled messages", () => {
    expect(tf("3 of 5 lessons done. Pick up where you left off.")).toBe("已完成 3 / 5 课，从上次停下的地方继续。");
    expect(tf("Open “Alpha”")).toBe("打开“Alpha”");
  });

  it("translates Rust error messages by their shape", () => {
    expect(tf("Request timed out after 30 s")).toBe("Request 在 30 s 后超时");
  });

  it("does nothing when no pack is loaded", () => {
    usePack("en");
    expect(t("Settings")).toBeNull();
    expect(tf("Open “Alpha”")).toBeNull();
  });
});
