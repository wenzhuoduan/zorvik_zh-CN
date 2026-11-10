// 校验词典：模板能否编译、占位符是否对得上、有没有过期条目。
//
//   node i18n/tools/check.mjs
//
// 硬错误（退出码 1）：JSON 坏了、正则编译失败、模板占位符越界、译文为空。
// 提示（退出码 0）：词典里有但源码里找不到的条目（上游删了文案），以及漏译。
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectCandidates, sourceFiles } from "./catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const localeDir = path.join(root, "app", "src", "i18n", "locales", "zh-CN");

const errors = [];
const warnings = [];

const dictionary = await readJson(path.join(localeDir, "ui.json"));
const patterns = await readJson(path.join(localeDir, "patterns.json"));

// 1. 精确词典
for (const [key, value] of Object.entries(dictionary)) {
  if (typeof value !== "string" || value.trim() === "") errors.push(`译文为空：“${key}”`);
  else if (value === key) warnings.push(`译文与原文相同：“${key}”`);
  if (/\{\d+\}/.test(value)) warnings.push(`精确词典不做插值，占位符会原样显示：“${key}” → “${value}”`);
}

// 2. 模板
const seen = new Map();
for (const [index, item] of patterns.entries()) {
  const label = `patterns.json[${index}]`;
  if (typeof item.pattern !== "string" || typeof item.replacement !== "string") {
    errors.push(`${label} 缺少 pattern 或 replacement`);
    continue;
  }
  let regex;
  try {
    regex = new RegExp(item.pattern);
  } catch (error) {
    errors.push(`${label} 正则编译失败：${error.message}`);
    continue;
  }
  if (seen.has(item.pattern)) errors.push(`${label} 与 [${seen.get(item.pattern)}] 的 pattern 重复`);
  seen.set(item.pattern, index);

  const captures = new RegExp(`${item.pattern}|`).exec("")?.length - 1 ?? 0;
  for (const match of item.replacement.matchAll(/\{(\d+)\}/g)) {
    const used = Number(match[1]);
    if (used >= captures) errors.push(`${label} 的 replacement 用了 {${used}}，但 pattern 只有 ${captures} 个捕获组`);
  }
}

// 3. 过期条目：整份源码（前端 + Rust）里都找不到这个键。
//    用原文子串而不是候选清单：JSX 三元、函数参数里的文案不会被提取规则覆盖。
//    源码先折叠空白再比，因为 JSX 会把换行缩进留在文本节点里。
const candidates = await collectCandidates(root);
const frontendKeys = new Set(candidates.map((item) => item.text));
const frontendSource = flatten((await Promise.all((await sourceFiles(root)).map((file) => readFile(file, "utf8")))).join("\n"));
const rustSource = flatten(await readRustSources(path.join(root, "crates")));
// 第三方库（CodeMirror 等）自带的文案不在本仓库源码里，登记后不当作过期条目。
const allowed = new Set(await readAllowList());
const stale = Object.keys(dictionary).filter(
  (key) => !allowed.has(key) && !frontendKeys.has(key) && !frontendSource.includes(key) && !rustSource.includes(key),
);

// 4. 漏译统计
const missingCount = candidates.filter((item) => !(item.text in dictionary)).length;

console.log(`词典 ${Object.keys(dictionary).length} 条，模板 ${patterns.length} 条`);
console.log(`前端候选 ${candidates.length} 条，未译 ${missingCount} 条`);
if (stale.length > 0) warnings.push(`源码里找不到的条目 ${stale.length} 条（上游可能已删改文案）：${stale.slice(0, 10).join(" | ")}${stale.length > 10 ? " …" : ""}`);

for (const warning of warnings) console.warn(`提示：${warning}`);
for (const error of errors) console.error(`错误：${error}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} 个错误。`);
  process.exit(1);
}
console.log("\n词典校验通过。");

async function readAllowList() {
  try {
    return JSON.parse(await readFile(path.join(root, "i18n", "stale-allow.json"), "utf8"));
  } catch {
    return [];
  }
}

function flatten(text) {
  // 源码里的 \" 在运行时就是 "，比较前先还原，否则会把已收录的条目误报成过期。
  return text.replace(/\\"/g, '"').replace(/\s+/g, " ");
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    console.error(`错误：读取 ${path.relative(root, file)} 失败：${error.message}`);
    process.exit(1);
  }
}

/** Rust 的错误消息是自由字符串，用整份源码做"这个键还存在吗"的存在性检查。 */
async function readRustSources(dir, text = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) text = await readRustSources(full, text);
    else if (entry.name.endsWith(".rs")) text += await readFile(full, "utf8");
  }
  return text;
}
