// 汉化入口。main.tsx 只调用 initI18n()，其余都在这个目录里。
import { activeLocale } from "./config";
import { startDomTranslation } from "./dom";
import { usePack } from "./translate";

export { activeLocale } from "./config";
export { translateDom } from "./dom";
export { t, tf, normalize, usePack } from "./translate";

/**
 * 按当前语言启动；返回停止函数（测试用，正式代码忽略）。
 * 没有可用语言（英文、单测）时什么都不做。
 */
export function initI18n(): (() => void) | null {
  const locale = activeLocale();
  if (!locale) return null;
  usePack(locale);
  document.documentElement.lang = locale;
  return startDomTranslation(document.body);
}
