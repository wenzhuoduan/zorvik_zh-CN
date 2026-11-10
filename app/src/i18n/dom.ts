// DOM 翻译层：把已经渲染出来的英文换成中文。
//
// 为什么在 DOM 层做：上游 164 个 tsx 里约 2500 处内联文案，直接改源码会让每次
// 上游更新都冲突。这里只依赖"渲染结果"，所以 app/src 里的英文原文一个字都不用动。
//
// 覆盖：文本节点、placeholder / title / aria-label / alt / aria-description，
//       以及 Rust 经 RPC 返回、最终渲染成文本的错误消息（同样走词典）。
// 不碰：代码与输入区里的文本、可编辑区、CodeMirror、带 data-i18n-skip 的子树。
import { tf } from "./translate";

/** 整棵子树都不看（真正的宿主内容：可编辑区、编辑器、显式豁免区）。 */
const OPAQUE = "[contenteditable]:not([contenteditable='false']), .cm-editor, [data-i18n-skip]";

/** 这些元素里的文本不是界面文案：代码、快捷键、用户输入的值。 */
const NO_TEXT = `script, style, code, pre, kbd, samp, input, textarea, ${OPAQUE}`;

const ATTRIBUTES = ["placeholder", "title", "aria-label", "alt", "aria-description"];

function skipText(element: Element | null): boolean {
  return element !== null && element.closest(NO_TEXT) !== null;
}

function opaque(element: Element | null): boolean {
  return element !== null && element.closest(OPAQUE) !== null;
}

/** 中文标点前面不留空格：`{{x}} ，以及` 读起来是错的。左括号也算（`p50 延迟 （毫秒）` 要连在一起）。 */
const NO_SPACE_BEFORE = /^[，。、；：！？（）【】《》〈〉「」『』“”‘’%,.;:!?)\]]/;

// 顶栏的语言开关要能切回英文原文，所以翻译时把原文记下来（切换时逐条还原）。
// 节点被 React 丢掉后条目会失效，攒到一定量就在还原时顺手清一遍。
const originalText = new Map<Text, string>();
const originalAttrs = new Map<Element, Map<string, string>>();
const PRUNE_AT = 20_000;

function rememberText(node: Text, original: string): void {
  originalText.set(node, original);
  if (originalText.size > PRUNE_AT) prune();
}

function rememberAttr(element: Element, name: string, original: string): void {
  let record = originalAttrs.get(element);
  if (!record) {
    record = new Map();
    originalAttrs.set(element, record);
    if (originalAttrs.size > PRUNE_AT) prune();
  }
  record.set(name, original);
}

/** 丢掉已经不挂在文档上的节点记录，别让长期运行的窗口一直涨内存。 */
function prune(): void {
  for (const node of originalText.keys()) if (!node.isConnected) originalText.delete(node);
  for (const element of originalAttrs.keys()) if (!element.isConnected) originalAttrs.delete(element);
}

/** 只翻译整段文本，保留 JSX 留下的首尾空白，避免破坏相邻元素之间的间距。 */
function translateTextNode(node: Text): void {
  const raw = node.nodeValue;
  if (!raw || !/\S/.test(raw)) return;
  const translated = tf(raw);
  if (translated === null || translated === raw) return;
  rememberText(node, raw);
  const lead = NO_SPACE_BEFORE.test(translated) ? "" : (raw.match(/^\s*/)?.[0] ?? "");
  const trail = raw.match(/\s*$/)?.[0] ?? "";
  const next = `${lead}${translated}${trail}`;
  if (next !== raw) node.nodeValue = next;
}

function translateAttributes(element: Element): void {
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const translated = tf(value);
    if (translated === null || translated === value) continue;
    rememberAttr(element, name, value);
    element.setAttribute(name, translated);
  }
}

/** 把所有译文还原成英文原文（切回英文时用）。 */
export function revertDom(): void {
  for (const [node, text] of originalText) if (node.isConnected) node.nodeValue = text;
  for (const [element, attrs] of originalAttrs) {
    if (!element.isConnected) continue;
    for (const [name, value] of attrs) element.setAttribute(name, value);
  }
  originalText.clear();
  originalAttrs.clear();
}

/** 语言切换期间要停下来：还原会把文本改回英文，观察器看到又会立刻翻一遍。 */
export interface DomTranslation {
  /** 断开观察器（切换前调用）。 */
  suspend(): void;
  /** 恢复观察（切换完成后调用）。 */
  resume(): void;
  /** 永久停止。 */
  stop(): void;
}

function translateElement(element: Element): void {
  if (opaque(element)) return;
  translateAttributes(element);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (node.nodeType === Node.TEXT_NODE) return skipText(node.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      return opaque(node as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
    else translateAttributes(node as Element);
  }
}

/** 翻译一个节点及其子树。幂等：译文本身不是词典的键，重复调用不会再改一次。 */
export function translateDom(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!skipText(node.parentElement)) translateTextNode(node as Text);
    return;
  }
  if (node instanceof Element) translateElement(node);
}

const OBSERVE = {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ATTRIBUTES,
} as const;

/** 开一个观察器，把后续渲染出来的英文也翻掉。 */
export function startDomTranslation(root: HTMLElement): DomTranslation {
  translateDom(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") {
        translateDom(record.target);
      } else if (record.type === "attributes") {
        const element = record.target as Element;
        if (!opaque(element)) translateAttributes(element);
      } else {
        record.addedNodes.forEach((node) => {
          if (node.isConnected) translateDom(node);
        });
      }
    }
  });
  observer.observe(root, OBSERVE);
  return {
    suspend() {
      observer.disconnect();
    },
    resume() {
      observer.observe(root, OBSERVE);
    },
    stop() {
      observer.disconnect();
    },
  };
}
