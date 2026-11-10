// 更激进的未译审计：extract.mjs 只认 `hint="…"` 这种属性写法，认不出
// `hint={bad ? "A" : "B"}`、数组里的文案、`cond ? "A" : "B"` 里的分支。
// 这里把 .tsx 里所有字符串字面量都过一遍，先按"像不像界面文案"粗筛，再查词典 + 模板。
//
//   node i18n/tools/audit.mjs                       全量
//   node i18n/tools/audit.mjs components/loadtests  只看某个目录
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ui = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/ui.json"), "utf8"));
const patterns = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/patterns.json"), "utf8")).map((p) => ({
  ...p,
  re: new RegExp(p.pattern),
}));

const scope = process.argv[2] ?? "";
const dir = path.join(root, "app/src", scope);

const files = [];
const walk = (d) => {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const file = path.join(d, entry.name);
    if (entry.isDirectory()) {
      if (!["i18n", "bindings", "assets", "node_modules"].includes(entry.name)) walk(file);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      files.push(file);
    }
  }
};
walk(dir);

const normalize = (text) => text.replace(/\s+/g, " ").trim();
const translated = (text) => {
  const key = normalize(text);
  return ui[key] !== undefined || patterns.some((p) => p.re.test(key));
};

/** 明显不是文案：代码、样式、标识符、路径、URL、格式说明。 */
const NOISE = [
  /^[a-z0-9-]+$/, // 类名、testid、id
  /^#[0-9a-f]{3,8}$/i,
  /^[\w./:@-]+$/, // 单词、路径、颜色、URL 片段
  /^[A-Z0-9_]+$/, // 常量：GET、TLS、HTTP/3
  // 括号、分号不算代码：`Delay per chunk (ms)` 带单位，`…; the traffic shows …` 是正常英文句子。
  /[={}[\]\\]|\$\{|\/\/|=>/, // 代码符号
  /\bconst\b|\bfunction\b|\breturn\b|\bimport\b/,
  /^\s*[\d\s.,:%-]*$/, // 纯数字范围
  /^(px|ms|s|m|h|kb|mb|gb|%|rem|em)$/i,
  /\s\?\s*\?|\?\?|\?\s*$/, // 三元 / 可选链残片：`, finished ?`
  /^[,:]\s*\w+\s*(\?|:)\s*$/, // `, label:`、`: running ?`
  /\bw-\d|\bh-\d|\btext-(xs|sm|base|lg|xl)\b|\brounded-|\bflex-|\bpx-\d/, // Tailwind
];

const misses = [];
const seen = new Set();

/** 这条文本是不是"没译的界面文案"。 */
function candidate(text) {
  const key = normalize(text);
  if (key.length < 4) return null;
  if (!/[A-Za-z]{2}/.test(key)) return null;
  if (/[\u4e00-\u9fff]/.test(key)) return null;
  if (NOISE.some((re) => re.test(key))) return null;
  // 至少要像一个句子/标签：带空格，或以大写开头且不是全大写的缩写
  const words = key.split(" ").filter((w) => /[A-Za-z]/.test(w));
  const sentence = words.length >= 2 || /^[A-Z][a-z]/.test(key) || /[.!?:…]$/.test(key);
  if (!sentence) return null;
  // Tailwind 类名、CSS 值：每个字母词都以小写开头，且整串不以标点/大写开头
  const allLower = words.every((w) => /^[a-z]/.test(w));
  if (allLower && !/^[,.…:;（）()]/.test(key)) return null;
  if (translated(key)) return null;
  return key;
}

function report(text, where) {
  const key = candidate(text);
  if (!key || seen.has(key)) return;
  seen.add(key);
  misses.push({ key, where });
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");

  // 1) 字符串字面量（属性、条件分支、数组、对象值都在内）
  const literal = /"((?:[^"\\]|\\.){2,400})"/g;
  let match;
  while ((match = literal.exec(source))) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    const lineText = source.split(/\r?\n/)[line - 1]?.trim() ?? "";
    if (lineText.startsWith("//") || lineText.startsWith("*") || lineText.startsWith("/*")) continue;
    report(match[1].replace(/\\"/g, '"').replace(/\\n/g, " "), `${rel}:${line}`);
  }

  // 2) JSX 文本节点：两个标签之间的裸文本（含被换行拆开的长句）
  const jsxText = />([^<>{}]*[A-Za-z][^<>{}]*)</g;
  while ((match = jsxText.exec(source))) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    report(match[1], `${rel}:${line}`);
  }

  // 3) 紧跟着 `{表达式}` 的裸文本：`Match only when {n > 0 && <span>…` 这类会被上一轮漏掉
  const beforeExpr = />([^<>{}]*[A-Za-z][^<>{}]*)\{/g;
  while ((match = beforeExpr.exec(source))) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    report(match[1], `${rel}:${line}`);
  }

  // 4) 不含 `${}` 的模板字符串：`hint={`…`}` 里的静态文案
  const tpl = /`([^`$]{4,400})`/g;
  while ((match = tpl.exec(source))) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    report(match[1], `${rel}:${line}`);
  }
}

for (const m of misses) console.log(`${m.key}\n    ${m.where}`);
console.log(`\n未译疑似文案 ${misses.length} 条${scope ? `（${scope}）` : ""}。`);
