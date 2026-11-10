// Rust 侧的界面文案（错误提示、toast）最终也会渲染成文本节点，同样靠 ui.json 的精确匹配翻译。
// 这个脚本把 crates/**/*.rs 里"像人话"的字符串挑出来，报告哪些还没有译文。
// 参数里的 `{}` / `{e}` 会被当成占位符，翻译时用 patterns.json 的模板接。
//
//   node i18n/tools/rust.mjs          只看缺口清单
//   node i18n/tools/rust.mjs --count  只看数量
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");
const ui = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/ui.json"), "utf8"));
const patterns = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/patterns.json"), "utf8")).map(
  (p) => new RegExp(p.pattern),
);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const known = (s) => ui[norm(s)] !== undefined || patterns.some((p) => p.test(norm(s)));

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["target", "node_modules", "course", "course.zh-CN", "tests"].includes(entry.name)) walk(file);
    } else if (entry.name.endsWith(".rs")) files.push(file);
  }
};
walk(path.join(root, "crates"));

/** 明显是代码或日志：含 Rust 语法、格式化占位、路径、标识符。 */
const CODE = /[\\[\]<>|&$#!]|\bfn\b|\blet\b|\bimpl\b|\bSelf\b|::|\{\}|=>|\.rs\b|\bhttp\b|^\s*\/\//;

const found = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const literal = /"((?:[^"\\]|\\.){6,300})"/g;
  let match;
  while ((match = literal.exec(source))) {
    const text = match[1].replace(/\\"/g, '"');
    const key = norm(text.replace(/\{[^{}]*\}/g, "{0}"));
    if (!/[A-Za-z]{3,} [A-Za-z]{2,}/.test(key)) continue; // 至少两个词
    if (/[\u4e00-\u9fff]/.test(key)) continue;
    if (CODE.test(key)) continue;
    if (!/^[A-Z0-9“"(]/.test(key)) continue; // 句子通常以大写或引号开头
    if (known(key)) continue;
    if (!found.has(key)) found.set(key, path.relative(root, file).replace(/\\/g, "/"));
  }
}

const rows = [...found.entries()];
if (process.argv.includes("--count")) {
  console.log(`Rust 未覆盖文案 ${rows.length} 条`);
  process.exit(0);
}
for (const [key, where] of rows) console.log(`${key}\n    ${where}`);
console.log(`\nRust 未覆盖文案 ${rows.length} 条（含 {} 的用 patterns.json 模板接）。`);
