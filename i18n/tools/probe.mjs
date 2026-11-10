// 检查"动态拼接句"的模板覆盖：源码里 `… ${x} …` 这种模板字符串在运行时才成形，
// extract.mjs 的静态扫描看不到它，只有 patterns.json 能翻。这里把每个插值替换成 "1"，
// 再按 translate.ts 的同一套顺序（精确词典 → 模板）试一遍，列出落空的句子。
//
//   node i18n/tools/probe.mjs            只看屏幕上的结论文本
//   node i18n/tools/probe.mjs --all      连 CSS / testid / URL 这类噪音一起看
//
// 剩下的命中大多是 CSS、data-testid、DNS 反查域名这类本就不该翻的东西。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ui = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/ui.json"), "utf8"));
const patterns = JSON.parse(fs.readFileSync(path.join(root, "app/src/i18n/locales/zh-CN/patterns.json"), "utf8")).map((p) => ({
  ...p,
  re: new RegExp(p.pattern),
}));

const normalize = (text) => text.replace(/\s+/g, " ").trim();
const translated = (text) => {
  const key = normalize(text);
  return ui[key] !== undefined || patterns.some((p) => p.re.test(key));
};

/** 明显不是界面文案的模板：样式、testid、资源路径、替身变量。 */
const NOISE = /className|style|color-mix|minmax|linear-gradient|repeat\(|min\(|\.webp|\.arpa|-row-|-step-|-item-|-change-|-route-|-event-|zv-mermaid|academy\/|docs\/|servers\/\$\{|loadtests\/\$\{|request\.(params|query|headers|json)|mcp add|http3-check|^\s*(px|ms|%)\s*$/;

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(file);
  }
};
walk(path.join(root, "app/src/components"));

const misses = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const literal = /`([^`]*\$\{[^`]*)`/g;
    let match;
    while ((match = literal.exec(line))) {
      const raw = match[1];
      const words = raw
        .replace(/\$\{[^}]*\}/g, " ")
        .split(/[^A-Za-z]+/)
        .filter((w) => w.length > 1);
      if (words.length < 2) continue;
      const fixed = raw.replace(/\$\{[^}]*\}/g, "");
      if (/[;=<>|&{}[\]\\]/.test(fixed)) continue;
      if (NOISE.test(raw)) continue;
      const sample = normalize(raw.replace(/\$\{[^}]*\}/g, "1"));
      if (translated(sample)) continue;
      misses.push({
        where: `${path.relative(root, file).replace(/\\/g, "/")}:${index + 1}`,
        sample,
        line: line.trim().slice(0, 160),
      });
    }
  });
}

for (const m of misses) console.log(`${m.where}\n  ${m.sample}\n  ${m.line}`);
console.log(`\n未覆盖的动态句子 ${misses.length} 条（加 patterns.json 模板，或确认它不该翻）。`);
process.exitCode = misses.length ? 1 : 0;
