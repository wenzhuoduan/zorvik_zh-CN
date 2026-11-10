// 列出 app/src 里的候选文案，以及词典里还缺哪些。
//
//   node i18n/tools/extract.mjs                     报告总数 / 已译 / 未译
//   node i18n/tools/extract.mjs --missing 40        额外列出 40 条未译文案（带来源文件）
//   node i18n/tools/extract.mjs --dir components/layout
//                                                   只看某个目录（可只写一段路径）
//   node i18n/tools/extract.mjs --dir request --json out.json
//                                                   把该目录的未译原文写成 JSON 数组
//   node i18n/tools/extract.mjs --write             把候选清单写成 i18n/catalog.json
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectCandidates } from "./catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dictPath = path.join(root, "app", "src", "i18n", "locales", "zh-CN", "ui.json");

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : (args[index + 1] ?? "");
};
const write = args.includes("--write");
const missingLimit = flag("--missing") === null ? 0 : Number(flag("--missing")) || 25;
const dirFilter = flag("--dir");
const jsonOut = flag("--json");

const dictionary = JSON.parse(await readFile(dictPath, "utf8"));
let candidates = await collectCandidates(root);
if (dirFilter) candidates = candidates.filter((item) => item.files.some((file) => file.includes(dirFilter)));

const translated = candidates.filter((item) => item.text in dictionary);
const missing = candidates.filter((item) => !(item.text in dictionary));

const scope = dirFilter ? `（${dirFilter}）` : "";
console.log(`候选文案${scope} ${candidates.length} 条：已译 ${translated.length}，未译 ${missing.length}，覆盖率 ${percent(translated.length, candidates.length)}`);
console.log(`词典条目 ${Object.keys(dictionary).length} 条（${path.relative(root, dictPath)}）`);

if (missingLimit > 0) {
  console.log(`\n未译（前 ${Math.min(missingLimit, missing.length)} 条）：`);
  for (const item of missing.slice(0, missingLimit)) {
    console.log(`  “${item.text}”\n      ${item.files.join(", ")}`);
  }
}

if (jsonOut) {
  const out = path.isAbsolute(jsonOut) ? jsonOut : path.join(root, jsonOut);
  await writeFile(out, `${JSON.stringify(missing.map((item) => item.text), null, 2)}\n`, "utf8");
  console.log(`\n已写入 ${out}（${missing.length} 条）`);
}

if (write) {
  const out = path.join(root, "i18n", "catalog.json");
  const payload = { total: candidates.length, keys: candidates.map((item) => item.text) };
  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\n已写入 ${path.relative(root, out)}`);
}

function percent(done, total) {
  return total === 0 ? "100%" : `${((done / total) * 100).toFixed(1)}%`;
}
