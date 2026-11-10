// 汉化入口。main.tsx 只调用 initI18n()，顶栏的「中 / EN」按钮调用 toggleLanguage()。
import { initialLanguage, rememberLanguage, type UiLanguage } from "./config";
import { revertDom, startDomTranslation, translateDom, type DomTranslation } from "./dom";
import { hasPack, usePack } from "./translate";

export { activeLocale, initialLanguage, isLanguage, languageLocked, LOCALES, type Locale, type UiLanguage } from "./config";
export { revertDom, translateDom, type DomTranslation } from "./dom";
export { t, tf, normalize, usePack } from "./translate";

let language: UiLanguage = initialLanguage();
let translation: DomTranslation | null = null;
const listeners = new Set<() => void>();

/** 当前界面语言：有词典时是 `zh-CN`，否则是英文原文 `en`。 */
export function currentLanguage(): UiLanguage {
  return language;
}

/** 订阅语言变化（顶栏按钮、文档正文用它重新渲染）。 */
export function onLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 切换界面语言：
 *   1. 先停观察器——还原会把文本改回英文，观察器看到又会立刻翻一遍；
 *   2. 有译文就把 DOM 全部还原成英文原文；
 *   3. 换词典，按新语言重新扫一遍（英文时什么都不做）；
 *   4. 恢复观察器，通知订阅者。
 */
export function setLanguage(next: UiLanguage): void {
  if (next === language) return;
  language = next;
  rememberLanguage(next);
  translation?.suspend();
  if (hasPack()) revertDom();
  usePack(next === "zh-CN" ? next : null);
  document.documentElement.lang = next;
  if (next === "zh-CN") {
    if (translation) {
      translateDom(document.body);
      translation.resume();
    } else {
      translation = startDomTranslation(document.body);
    }
  }
  listeners.forEach((listener) => listener());
}

/** 中 ⇄ 英；返回切换后的语言。 */
export function toggleLanguage(): UiLanguage {
  setLanguage(language === "zh-CN" ? "en" : "zh-CN");
  return language;
}

/**
 * 按启动时的语言初始化；返回停止函数（测试用，正式代码忽略）。
 * 英文模式下不开观察器——用户点按钮时才按需启动。
 */
export function initI18n(): (() => void) | null {
  language = initialLanguage(); // 环境变量与记忆的选择在"启动那一刻"才生效
  if (language !== "zh-CN") return null;
  usePack(language);
  document.documentElement.lang = language;
  translation = startDomTranslation(document.body);
  return () => {
    translation?.stop();
    translation = null;
  };
}
