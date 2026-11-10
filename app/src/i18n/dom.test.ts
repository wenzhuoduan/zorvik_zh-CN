import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { revertDom, translateDom } from "./dom";
import { usePack } from "./translate";

let host: HTMLElement;

beforeEach(() => {
  usePack("zh-CN");
  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("translateDom", () => {
  it("translates text and keeps the surrounding whitespace", () => {
    host.innerHTML = "<button>\n      Settings\n    </button>";
    translateDom(host);
    expect(host.querySelector("button")!.textContent).toBe("\n      设置\n    ");
  });

  it("translates the attributes tooltips and screen readers use", () => {
    host.innerHTML = '<input placeholder="Search APIs" /><button aria-label="Close"></button>';
    translateDom(host);
    expect(host.querySelector("input")!.getAttribute("placeholder")).toBe("搜索 API");
    expect(host.querySelector("button")!.getAttribute("aria-label")).toBe("关闭");
  });

  it("leaves code, shortcuts and editor content alone", () => {
    host.innerHTML = '<code>Settings</code><kbd>Ctrl</kbd><div class="cm-editor"><span>Settings</span></div>';
    translateDom(host);
    expect(host.querySelector("code")!.textContent).toBe("Settings");
    expect(host.querySelector("kbd")!.textContent).toBe("Ctrl");
    expect(host.querySelector(".cm-editor")!.textContent).toBe("Settings");
  });

  it("translates nothing when the locale is off", () => {
    usePack("en");
    host.innerHTML = "<button>Settings</button>";
    translateDom(host);
    expect(host.textContent).toBe("Settings");
  });

  it("is idempotent", () => {
    host.innerHTML = "<button>Settings</button>";
    translateDom(host);
    translateDom(host);
    expect(host.textContent).toBe("设置");
  });

  it("restores the English original when the language goes back", () => {
    host.innerHTML = '<button title="Close">\n  Settings\n</button>';
    translateDom(host);
    expect(host.querySelector("button")!.textContent).toBe("\n  设置\n");
    expect(host.querySelector("button")!.getAttribute("title")).toBe("关闭");
    revertDom();
    expect(host.querySelector("button")!.textContent).toBe("\n  Settings\n");
    expect(host.querySelector("button")!.getAttribute("title")).toBe("Close");
  });

  it("can translate again after reverting", () => {
    host.innerHTML = "<button>Settings</button>";
    translateDom(host);
    revertDom();
    translateDom(host);
    expect(host.textContent).toBe("设置");
  });
});
