// 汉化挂载点：
//   1. app/src/main.tsx 里的 initI18n()
//   2. app/src/components/docs/{DocsList,DocsView}.tsx 里文档正文改从 i18n/docs 取
//
// 上游合并可能把它们冲掉（或改了上下文），这个脚本负责检查并在缺失时重新插入。
// 幂等：已经存在就什么都不做。
//
//   node i18n/hooks/apply.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const mainPath = path.join(root, "app", "src", "main.tsx");

const IMPORT = 'import { initI18n } from "./i18n";\n';
const CALL = "initI18n();\n";

/** 文档正文：把 `from "./content"` 指到整篇中文的入口。 */
const DOC_FILES = ["app/src/components/docs/DocsList.tsx", "app/src/components/docs/DocsView.tsx"];
let changed = 0;

let source = await readFile(mainPath, "utf8");
const before = source;

if (!source.includes('from "./i18n"')) {
  if (source.includes('import App from "./App";')) {
    source = source.replace('import App from "./App";\n', `import App from "./App";\n${IMPORT}`);
    console.log("已补回汉化 import。");
  } else {
    fail('找不到 `import App from "./App";`，无法插入汉化 import');
  }
}

if (!/^initI18n\(\);/m.test(source)) {
  if (source.includes("restoreAppearance();")) {
    source = source.replace("restoreAppearance();\n", `restoreAppearance();\n// 汉化（fork 注入）：默认中文，VITE_ZORVIK_LOCALE=en 时完全关闭。\n${CALL}`);
    console.log("已补回 initI18n() 调用。");
  } else {
    fail("找不到 `restoreAppearance();`，无法插入 initI18n() 调用");
  }
}

if (source === before) console.log("main.tsx 挂载点完整。");
else {
  await writeFile(mainPath, source, "utf8");
  changed += 1;
  console.log(`已更新 ${path.relative(root, mainPath)}。`);
}

for (const relative of DOC_FILES) {
  const file = path.join(root, relative);
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    fail(`找不到 ${relative}`);
  }
  if (text.includes('from "../../i18n/docs"')) continue;
  if (!text.includes('from "./content"')) {
    fail(`${relative} 里找不到 \`from "./content"\`，文档整篇切换可能被上游改掉了`);
  }
  await writeFile(file, text.replace('from "./content"', 'from "../../i18n/docs"'), "utf8");
  changed += 1;
  console.log(`已更新 ${relative}。`);
}

if (changed === 0) console.log("全部挂载点完整，无需改动。");

// 课程的中文表是 Rust 侧的两处改动，没法自动重放（上游可能重写了整个函数）。
// 这里只做体检：被冲掉了就明确提示要手工合并。
const COURSE_MARKERS = [
  ["crates/academy/build.rs", "course.zh-CN", "课程中文目录的收集"],
  ["crates/academy/src/lib.rs", "COURSE_FILES_ZH", "中英文课程表的选择"],
];
for (const [relative, marker, what] of COURSE_MARKERS) {
  const text = await readFile(path.join(root, relative), "utf8").catch(() => "");
  if (!text.includes(marker)) {
    console.warn(`提示：${relative} 里找不到 ${marker}（${what}）。上游可能重构过，需要手工合并课程语言切换。`);
  }
}

function fail(message) {
  console.error(`错误：${message}。上游可能重构了这些文件，请手工把挂载点加回去（见 i18n/README.md）。`);
  process.exit(1);
}
