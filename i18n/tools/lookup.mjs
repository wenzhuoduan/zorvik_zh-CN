// 逐条查词典：给一个文本文件（每行一条原文，空行忽略），报告它会不会被翻、翻成什么。
//
//   node i18n/tools/lookup.mjs keys.txt
//
// 用来核对"界面上看到的这句英文到底缺不缺词条"，比在 UI 里猜快。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ui = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/ui.json"), "utf8"));
const patterns = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/patterns.json"), "utf8")).map((p) => ({
  ...p,
  re: new RegExp(p.pattern),
}));

const file = process.argv[2];
const lines = fs
  .readFileSync(path.isAbsolute(file) ? file : path.join(root, file), "utf8")
  .split(/\r?\n/)
  .filter((line) => line.trim());

let missing = 0;
for (const raw of lines) {
  const key = raw.replace(/\s+/g, " ").trim();
  if (ui[key] !== undefined) {
    console.log(`✓ 词典  ${key}\n        → ${ui[key]}`);
    continue;
  }
  const hit = patterns.find((p) => p.re.test(key));
  if (hit) {
    console.log(`✓ 模板  ${key}\n        → ${key.replace(hit.re, hit.replacement)}   [${hit.pattern}]`);
    continue;
  }
  missing += 1;
  console.log(`✗ 缺    ${key}`);
}
console.log(`\n共 ${lines.length} 条，缺 ${missing} 条。`);
process.exitCode = missing ? 1 : 0;
