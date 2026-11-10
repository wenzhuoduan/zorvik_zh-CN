// 从 app/src 里收集"可能是用户可见文案"的字符串。
//
// 这只是给汉化用的候选清单：运行时真正生效的是 app/src/i18n/locales/zh-CN/ui.json
// 里的键（英文原文）。所以这里允许有漏网，但不能有噪音淹没真正要翻的句子。
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** app/src/i18n 本身、生成的 bindings、图片目录都不是文案来源。 */
const SKIP_DIRECTORIES = new Set(["i18n", "bindings", "assets"]);

/** JSX 文本节点：两个尖括号之间、不含表达式的内容。 */
const JSX_TEXT = />([^<>{}]*[A-Za-z][^<>{}]*)</g;

/** 写死在 JSX 属性里的文案。 */
const JSX_ATTRIBUTE = /(?:title|placeholder|aria-label|aria-description|alt|label|description|message|confirmLabel|hint|tagline|intro|tip)="([^"{}]{2,})"/g;

/** 对象属性里的文案：confirm({ title, message, confirmLabel }) 这类。 */
const OBJECT_PROPERTY = /(?:title|message|confirmLabel|label|description|hint|tagline|intro|tip):\s*"([^"\\]{2,})"/g;

/** toast("error", "…") 的正文。 */
const TOAST = /toast\(\s*"[a-z]+"\s*,\s*"([^"\\]{2,})"/g;

const SOURCES = [JSX_TEXT, JSX_ATTRIBUTE, OBJECT_PROPERTY, TOAST];

const CODE_LIKE = /[=;{}<>]|=>|&&|\|\|/;

export function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function looksLikeText(value) {
  const text = normalize(value);
  if (text.length < 2 || text.length > 400) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (CODE_LIKE.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (/^[\w./:#-]+$/.test(text) && !/^[A-Z]/.test(text)) return false;
  return true;
}

/** 文档正文是散文，可以带 `{{variable}}`、`=>` 之类的标记，不能按代码噪音过滤。 */
function looksLikeDocsText(value) {
  const text = normalize(value);
  return text.length >= 12 && text.length <= 600 && /[A-Za-z]/.test(text) && !/^https?:\/\//.test(text);
}

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await walk(path.join(dir, entry.name), files);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
    files.push(path.join(dir, entry.name));
  }
  return files;
}

/** 需要扫描的源文件（跳过生成物、测试和汉化目录本身）。 */
export async function sourceFiles(root) {
  return walk(path.join(root, "app", "src"));
}

/**
 * 返回 [{ text, files: string[] }]，按文案排序。
 * files 是相对仓库根的路径，方便直接跳过去翻译。
 */
/** 应用内文档正文是纯字符串字面量（title / tagline / intro / features[]），没有 JSX。 */
const DOC_SOURCE = /"((?:[^"\\]|\\.){12,})"/g;

export async function collectCandidates(root) {
  const srcDir = path.join(root, "app", "src");
  const found = new Map();
  for (const file of await walk(srcDir)) {
    const source = await readFile(file, "utf8");
    const isDocs = file.replaceAll("\\", "/").endsWith("components/docs/content.ts");
    for (const pattern of isDocs ? [DOC_SOURCE] : SOURCES) {
      for (const match of source.matchAll(pattern)) {
        if (!(isDocs ? looksLikeDocsText(match[1]) : looksLikeText(match[1]))) continue;
        const text = normalize(match[1].replaceAll("\\n", " "));
        const files = found.get(text) ?? new Set();
        files.add(path.relative(root, file).replaceAll("\\", "/"));
        found.set(text, files);
      }
    }
  }
  return [...found.entries()]
    .map(([text, files]) => ({ text, files: [...files].sort() }))
    .sort((a, b) => a.text.localeCompare(b.text));
}
