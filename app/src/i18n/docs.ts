// 应用内文档正文的入口：按界面语言选整篇内容。
//
// 英文原稿在 components/docs/content.ts（上游文件，不动），中文稿 docs.zh-CN.ts 由
// `node i18n/tools/docs-zh.mjs` 从词典生成——译文改 ui.json，别改生成物。
// 之所以整篇切换而不是逐段在 DOM 里翻：正文用行内 `code` 和 [mod+N] 标记，渲染时会被
// 拆成多个节点，逐段查表会得到中英混排。
import {
  QUICK_START as EN_QUICK_START,
  SHORTCUTS as EN_SHORTCUTS,
  TOPICS as EN_TOPICS,
  type DocTopic,
} from "../components/docs/content";
import {
  QUICK_START as ZH_QUICK_START,
  SHORTCUTS as ZH_SHORTCUTS,
  TOPICS as ZH_TOPICS,
} from "./docs.zh-CN";
import { activeLocale } from "./config";

const chinese = activeLocale() === "zh-CN";

export const QUICK_START: string[] = chinese ? ZH_QUICK_START : EN_QUICK_START;
export const SHORTCUTS: [string, string][] = chinese ? ZH_SHORTCUTS : EN_SHORTCUTS;
export const TOPICS: DocTopic[] = chinese ? (ZH_TOPICS as DocTopic[]) : EN_TOPICS;
