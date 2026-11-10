// 当前界面语言的选择与记忆。
//
// 这是一个汉化 fork：默认中文，但英文必须永远可用——上游的 e2e（约 647 处选择器）
// 和 Vitest（约 180 处文本断言）都按英文原文定位元素。
//
// 优先级：
//   VITE_ZORVIK_LOCALE=en|zh-CN   环境变量锁定语言（e2e、单测用），此时界面上的切换按钮隐藏
//   上次在界面里切换过的选择       存在 localStorage 的 `zorvik.locale`
//   都没有                        默认 zh-CN；Vitest（MODE=test）一律英文
//
// 顶栏右上角的「中 / EN」按钮就是改这个选择（见 i18n/index.ts 的 setLanguage）。

/** 有词典的语言（目前只有中文）。 */
export const LOCALES = ["zh-CN"] as const;

export type Locale = (typeof LOCALES)[number];

/** 界面可能处于的语言：中文（有词典）或英文（上游原文）。 */
export type UiLanguage = Locale | "en";

const STORAGE_KEY = "zorvik.locale";

// 每次现读：单测会用 vi.stubEnv 临时改它，不能把值提到模块顶层。
function forcedLanguage(): string {
  return ((import.meta.env.VITE_ZORVIK_LOCALE as string | undefined) ?? "").trim();
}

export function isLanguage(value: string): value is UiLanguage {
  return value === "zh-CN" || value === "en";
}

/** 环境变量把语言钉死了：界面上的切换按钮应当隐藏，避免"切了没反应"。 */
export function languageLocked(): boolean {
  return isLanguage(forcedLanguage());
}

function remembered(): UiLanguage | null {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return value !== null && value !== undefined && isLanguage(value) ? value : null;
  } catch {
    return null; // 隐私模式/被禁用：只在本次会话里生效
  }
}

export function rememberLanguage(language: UiLanguage): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, language);
  } catch {
    /* 忽略 */
  }
}

/** 启动时的语言。 */
export function initialLanguage(): UiLanguage {
  const forced = forcedLanguage();
  if (isLanguage(forced)) return forced;
  if (import.meta.env.MODE === "test") return "en"; // 单测按英文原文断言
  return remembered() ?? "zh-CN";
}

/** 兼容旧调用：能用的词典 locale；英文时为 null。 */
export function activeLocale(): Locale | null {
  const language = initialLanguage();
  return language === "zh-CN" ? language : null;
}
