// 生成 app/src/i18n/docs.zh-CN.ts：把应用内文档正文整篇换成中文。
//
//   node i18n/tools/docs-zh.mjs
//
// 为什么整篇生成而不是逐段在 DOM 里翻译：文档正文用 `code` 和 [mod+N] 标记行内代码与
// 快捷键，渲染时被拆成「文本 + <code> + 文本」，词典只能逐段命中，读起来中英混排。
// 这里直接用已收录的译文（键 = 英文原文）替换 content.ts 里的每个字符串字面量，
// 得到一份结构完全相同、只有文字变了的文件，由 app/src/i18n/docs.ts 按语言选用。
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourcePath = path.join(root, "app", "src", "components", "docs", "content.ts");
const dictPath = path.join(root, "app", "src", "i18n", "locales", "zh-CN", "ui.json");
const outPath = path.join(root, "app", "src", "i18n", "docs.zh-CN.ts");

const dictionary = JSON.parse(await readFile(dictPath, "utf8"));
const source = await readFile(sourcePath, "utf8");

/** 与运行时同一套规整：折叠空白。 */
const normalize = (text) => text.replace(/\s+/g, " ").trim();

const STRING = /"((?:[^"\\]|\\.)*)"/g;
const left = [];
let used = 0;

const body = source.replace(STRING, (whole, raw) => {
  const decoded = raw.replace(/\\(.)/g, (_, c) => (c === "n" ? " " : c));
  const key = normalize(decoded);
  if (!key || !/[A-Za-z]/.test(key)) return whole;
  const hit = dictionary[key];
  if (hit === undefined) {
    if (key.length > 8) left.push(key);
    return whole;
  }
  used += 1;
  return `"${hit.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
});

const header = [
  "// 由 node i18n/tools/docs-zh.mjs 生成，不要手改：",
  "// 改译文请改 app/src/i18n/locales/zh-CN/ui.json，然后重新运行该脚本。",
  "// 结构必须与 components/docs/content.ts 一致（id、group、image 都不动）。",
  "",
].join("\n");

await writeFile(outPath, header + body, "utf8");

console.log(`已生成 ${path.relative(root, outPath)}：替换 ${used} 处字符串，仍为英文 ${left.length} 处。`);
if (left.length > 0) {
  console.log("\n仍为英文（补进 ui.json 后重跑）：");
  for (const item of [...new Set(left)]) console.log(`  ${item}`);
}
