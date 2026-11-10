// 把一批译文合并进 ui.json。
//
//   node i18n/tools/merge.mjs additions.json
//
// additions.json 是 { "English": "中文" }；键按英文排序写回，重复的以新值为准。
// 这样每次批量翻译都只是"往词典里加条目"，不会碰 app/src 的源码。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dictPath = path.join(root, "app", "src", "i18n", "locales", "zh-CN", "ui.json");
const input = process.argv[2];

if (!input) {
  console.error("用法：node i18n/tools/merge.mjs <additions.json>");
  process.exit(1);
}

const additions = JSON.parse(await readFile(path.isAbsolute(input) ? input : path.join(root, input), "utf8"));
const dictionary = JSON.parse(await readFile(dictPath, "utf8"));

// 键必须和运行时查词的方式一致：合并空白、去掉首尾空格。
// JSX 里 `Closed</b> means the host refused` 这种节点带前导空格，直接存进去永远匹配不上。
const clean = (text) => text.replace(/\s+/g, " ").trim();

let added = 0;
let replaced = 0;
let same = 0;
let removed = 0;
for (const [rawKey, value] of Object.entries(additions)) {
  const key = clean(rawKey);
  // 约定：value 为 null 表示"这条不需要译文，删掉它"（例如 App ID、Base URL 这类专名）。
  if (value === null) {
    for (const candidate of [key, rawKey]) {
      if (candidate in dictionary) {
        delete dictionary[candidate];
        removed += 1;
      }
    }
    continue;
  }
  if (typeof value !== "string" || value.trim() === "") {
    console.error(`跳过空译文：“${key}”`);
    continue;
  }
  if (!(key in dictionary)) added += 1;
  else if (dictionary[key] === value) same += 1;
  else replaced += 1;
  dictionary[key] = value;
}

const sorted = {};
for (const key of Object.keys(dictionary).sort((a, b) => a.localeCompare(b, "en"))) sorted[key] = dictionary[key];

await writeFile(dictPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
console.log(`新增 ${added} 条，更新 ${replaced} 条，删除 ${removed} 条，未变 ${same} 条；词典现在共 ${Object.keys(sorted).length} 条。`);
