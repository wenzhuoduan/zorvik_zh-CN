// 组件里订阅界面语言：切换时重新渲染，读到的 t()/tf() 和文档正文都跟着换。
import { useSyncExternalStore } from "react";
import { currentLanguage, onLanguageChange, type UiLanguage } from "./index";

export function useLanguage(): UiLanguage {
  return useSyncExternalStore(onLanguageChange, currentLanguage, currentLanguage);
}
