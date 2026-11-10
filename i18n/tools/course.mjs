// 训练营课程的翻译进度：按单元统计 course.zh-CN/ 里有多少文件已跟上 course/。
//
//   node i18n/tools/course.mjs            每个单元一行
//   node i18n/tools/course.mjs --missing  另外列出还没翻译的文件
//
// 机制：crates/academy/build.rs 把 course.zh-CN/<同路径> 覆盖到中文课程表上，
// 缺的文件自动回退英文，所以可以一个单元一个单元地翻。
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const base = path.join(root, "crates", "academy");
const showMissing = process.argv.includes("--missing");

async function files(dir, prefix = "") {
  let out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(await files(full, rel));
    else if (/\.(md|yaml)$/.test(entry.name)) out.push(rel);
  }
  return out.sort();
}

const units = (await readdir(path.join(base, "course"), { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

let done = 0;
let total = 0;
const missing = [];

console.log("单元".padEnd(16) + "已译 / 全部".padEnd(14) + "行数");
for (const unit of units) {
  const english = await files(path.join(base, "course", unit));
  const translated = new Set(await files(path.join(base, "course.zh-CN", unit)));
  const have = english.filter((file) => translated.has(file));
  total += english.length;
  done += have.length;
  for (const file of english) if (!translated.has(file)) missing.push(`${unit}/${file}`);

  let lines = 0;
  for (const file of have) {
    const info = await stat(path.join(base, "course.zh-CN", unit, file));
    lines += Math.round(info.size / 40); // 粗略：中文一行约 40 字节
  }
  const mark = have.length === english.length ? "✓" : " ";
  console.log(` ${mark} ${unit.padEnd(14)}${String(have.length).padStart(2)} / ${String(english.length).padEnd(10)}${lines || ""}`);
}

console.log(`\n合计 ${done} / ${total} 个文件（${((done / total) * 100).toFixed(0)}%）`);

// YAML 体检：值或列表项以指示符开头又没加引号，整张中文课程表会加载失败。
// 中文句子以 `反引号`、**粗体**、? 开头很常见，写的时候几乎必然踩到。
const risky = [];
for (const unit of units) {
  for (const file of await files(path.join(base, "course.zh-CN", unit))) {
    const lines = (await readFile(path.join(base, "course.zh-CN", unit, file), "utf8")).split("\n");
    const start = lines.findIndex((line) => line.trim() === "---");
    const end = lines.findIndex((line, index) => index > start && line.trim() === "---");
    if (start === -1 || end === -1) continue;
    let blockIndent = -1;
    for (let index = start + 1; index < end; index += 1) {
      // 去掉行尾的 \r：JS 的 `.` 不匹配 \r，CRLF 文件会让下面的判断永远不命中。
      const line = lines[index].replace(/\r$/, "");
      if (line.trim() === "") continue;
      const indent = line.match(/^\s*/)[0].length;
      // 多行标量（`text: |` 之类）里的一切都是正文，不是 YAML。
      if (blockIndent >= 0) {
        if (indent > blockIndent) continue;
        blockIndent = -1;
      }
      if (/:\s*[|>][-+]?\s*$/.test(line)) {
        blockIndent = indent;
        continue;
      }
      // 先把 `- ` 和 `key: ` 剥掉再看值的开头：列表项里还有 `- question: …` 这种两层结构。
      let value = line.trim();
      if (/^-\s+/.test(value)) value = value.replace(/^-\s+/, "");
      value = value.replace(/^[A-Za-z_][\w-]*:\s+/, "");
      if (!value || value === line.trim()) continue;
      const [first, second = ""] = value;
      const plain = !['"', "'", "{", "[", "|", ">"].includes(first);
      let riskyStart = false;
      if (first === "`" || first === "@" || first === "%") riskyStart = true;
      else if (first === "?") riskyStart = second === " " || second === "";
      else if (first === "*") riskyStart = second === "*" || second === "" || second === " "; // *alias 合法
      else if (first === "&") riskyStart = !/[A-Za-z0-9_]/.test(second); // &anchor 合法
      // 未加引号的纯量里出现「冒号+空格」会被当成嵌套映射，典型如 `以 http://x: 开头`
      else if (plain && /: /.test(value)) riskyStart = true;
      if (riskyStart) risky.push(`${unit}/${file}:${index + 1}: ${line.trim()}`);
    }
  }
}
if (risky.length > 0) {
  console.warn(`\nYAML 体检：${risky.length} 处值以指示符开头且没加双引号（会导致课程加载失败）：`);
  for (const item of risky) console.warn(`  ${item}`);
  process.exitCode = 1;
}

if (showMissing && missing.length > 0) {
  console.log("\n未译：");
  for (const file of missing) console.log(`  ${file}`);
}
