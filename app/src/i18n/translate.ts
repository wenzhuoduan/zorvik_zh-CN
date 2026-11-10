// 词典翻译引擎。
//
// 键是英文原文，值是中文：查不到就返回 null，调用方一律回退英文。
// 所以"新增上游文案"永远不会让界面变空，只会让那一句暂时保持英文。
import ui from "./locales/zh-CN/ui.json";
import patterns from "./locales/zh-CN/patterns.json";

/** 拼接文案（数字、名称、变量）用正则匹配，捕获组在 replacement 里写 {0}、{1}。 */
export interface TranslationPattern {
  pattern: string;
  replacement: string;
}

interface Pack {
  strings: Record<string, string>;
  patterns: TranslationPattern[];
}

const PACKS: Record<string, Pack> = {
  "zh-CN": { strings: ui, patterns: patterns as TranslationPattern[] },
};

let pack: Pack | null = null;
const compiled = new Map<string, RegExp>();

/** 载入某个语言的词典；不支持的语言等于关闭翻译。 */
export function usePack(locale: string): void {
  pack = PACKS[locale] ?? null;
  compiled.clear();
}

export function hasPack(): boolean {
  return pack !== null;
}

/**
 * 规整空白再查表。
 * JSX 会把换行和缩进留在文本节点里（`\n        最近\n      `），原样查表几乎必然落空。
 */
export function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fill(template: string, params: string[]): string {
  return template.replace(/\{(\d+)\}/g, (whole, index: string) => params[Number(index)] ?? whole);
}

function pattern(source: string): RegExp {
  let re = compiled.get(source);
  if (!re) {
    re = new RegExp(source);
    compiled.set(source, re);
  }
  return re;
}

/** 精确查表；没有译文返回 null。 */
export function t(text: string): string | null {
  if (!pack) return null;
  return pack.strings[normalize(text)] ?? null;
}

/** 先精确查表，再按模板匹配（数字、名称、Rust 错误消息）。 */
export function tf(text: string): string | null {
  if (!pack) return null;
  const key = normalize(text);
  const exact = pack.strings[key];
  if (exact !== undefined) return exact;
  for (const item of pack.patterns) {
    const match = pattern(item.pattern).exec(key);
    if (match) return fill(item.replacement, match.slice(1));
  }
  return null;
}
