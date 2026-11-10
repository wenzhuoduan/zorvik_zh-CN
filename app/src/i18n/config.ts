// 当前界面语言的选择。
//
// 这是一个汉化 fork：默认中文，但英文必须永远可用——上游的 e2e（约 647 处选择器）
// 和 Vitest（约 180 处文本断言）都按英文原文定位元素。
//
// 开关：
//   VITE_ZORVIK_LOCALE=en       关闭汉化，界面回到上游英文原样
//   VITE_ZORVIK_LOCALE=zh-CN    强制中文
//   不设置                      默认中文；但 Vitest（MODE=test）一律英文

export const LOCALES = ["zh-CN"] as const;

export type Locale = (typeof LOCALES)[number];

export function activeLocale(): Locale | null {
  const fromEnv = (import.meta.env.VITE_ZORVIK_LOCALE as string | undefined)?.trim();
  if (fromEnv) return (LOCALES as readonly string[]).includes(fromEnv) ? (fromEnv as Locale) : null;
  if (import.meta.env.MODE === "test") return null;
  return "zh-CN";
}
