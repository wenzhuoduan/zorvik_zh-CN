# Zorvik 汉化层（zh-CN）

这个仓库是 [LibreGuild/zorvik](https://github.com/LibreGuild/zorvik) 的汉化 fork。
目标：**界面中文，同时保持上游代码几乎原样，让 `git merge upstream/main` 长期可行。**

改动上游文件的全部地方只有 1 个（`app/src/main.tsx` 两行）。其余都是新增目录。

---

## 1. 快速开始

```powershell
cd app
npm ci                       # 首次
npm run tauri dev            # 开发运行，默认中文

# 临时看英文原样（排查"这句到底是不是我们翻的"）
$env:VITE_ZORVIK_LOCALE="en"; npm run tauri dev

# 只跑前端（浏览器 + devbridge）
cargo run -p zorvik-devbridge      # 终端 1，仓库根
cd app; npm run dev                # 终端 2
```

校验与维护脚本（全部在仓库根执行，无需 npm script，避免改 `app/package.json`）：

```powershell
node i18n/hooks/apply.mjs           # 检查/补回 main.tsx 里的挂载点
node i18n/tools/extract.mjs         # 覆盖率报告
node i18n/tools/extract.mjs --missing 30   # 列出 30 条未译文案及其文件
node i18n/tools/audit.mjs           # 未译审计（含 `hint={cond ? "A" : "B"}` 这类表达式里的文案）
node i18n/tools/lookup.mjs keys.txt # 逐条判断某句会不会被翻（排查"界面上一句英文打哪来"）
node i18n/tools/probe.mjs           # 动态拼接句还缺哪些模板（静态扫描看不到的那些）
node i18n/tools/check.mjs           # 词典体检（模板、占位符、过期条目）
```

## 2. 架构

### 为什么是"运行时字典"而不是把源码改成 `t("…")`

上游的文案是内联的：`app/src` 164 个 tsx 里约 2500 处 JSX 文本/属性，`crates/**` 里约 530 处错误消息用 `format!` 现场拼英文，二者都不经过任何消息表。把源码改成 `t("英文")` 的做法，会让**每一句被翻译的文案都变成一次上游冲突**，而且 Rust 侧还得另做一套机制。

所以这里采用零侵入方案：不碰英文原文，只翻译"渲染结果"。好处是上游怎么改文案都不冲突；代价是动态拼接的句子要靠正则模板（`patterns.json`）匹配。

### 三层，当前只做了第一层

| 层 | 对象 | 做法 | 状态 |
|---|---|---|---|
| **L1** | 前端界面文案、`confirm`/`toast` 提示、应用内文档、**Rust 错误消息** | 运行时词典：精确匹配 + 正则模板 + DOM 观察器 | 界面 91.7%（2774 条 + 295 条模板），应用内文档 100% |
| **L2** | Training Bootcamp 课程正文（`crates/academy/course/`，97 个文件 / 约 10.4k 行） | Rust 侧镜像目录 `crates/academy/course.zh-CN/`（同相对路径，进度按路径记录），`build.rs` 生成中英两张表，缺的中文文件回退英文 | 机制完成，97 / 97 个文件已译（100%） |
| **L3** | 不走 DOM 的原生文案：`lib/platform.ts` 原生对话框标题/过滤器、`Intl.RelativeTimeFormat`、CodeMirror 占位符与「显示更多」、窗口标题、macOS 自建菜单项 | 前端就地包 `t()`；菜单与窗口标题、canvas 结业证书按术语表保持英文 | 前端已完成，Rust 侧按设计保持英文 |

### L1 的实现

```
app/src/i18n/
  index.ts                     # initI18n()：main.tsx 唯一入口
  config.ts                    # 语言选择（VITE_ZORVIK_LOCALE / MODE=test 关闭）
  translate.ts                 # 词典引擎：normalize → 精确 → 正则 → null
  dom.ts                       # DOM 层：文本节点 + placeholder/title/aria-label/alt + MutationObserver
  docs.ts                      # 应用内文档按语言选整篇（见下）
  docs.zh-CN.ts                # 由 tools/docs-zh.mjs 生成的中文文档正文，不要手改
  locales/zh-CN/ui.json        # 键 = 英文原文，值 = 中文
  locales/zh-CN/patterns.json  # 拼接文案：正则 + {0} {1} 占位
  *.test.ts                    # 13 个单测
i18n/
  README.md                    # 本文
  stale-allow.json             # 第三方库（CodeMirror 等）的文案，不算过期条目
  tools/catalog.mjs            # 候选文案扫描（前端，含 content.ts 的文档正文）
  tools/extract.mjs            # 覆盖率 / 未译清单（--dir 按目录、--json 导出）
  tools/audit.mjs              # 更狠的审计：字符串字面量 + JSX 裸文本，连条件分支里的文案也抓
  tools/lookup.mjs             # 逐条查：这句会不会被翻、翻成什么（给一个文本文件，每行一条）
  tools/rust.mjs               # Rust 侧（crates/**）里没被词典覆盖的界面文案
  tools/probe.mjs              # 动态拼接句（`${x}` 模板）的模板覆盖检查
  tools/merge.mjs              # 把一批 { "English": "中文" } 合并进 ui.json（值写 null 表示删除）
  tools/docs-zh.mjs            # 生成 docs.zh-CN.ts：用词典替换 content.ts 的每个字符串
  tools/check.mjs              # 词典校验
  hooks/apply.mjs              # 幂等重放 3 处挂载点（main.tsx + 两个文档组件）
```

### 文档正文：整篇切换

应用内文档用行内 `` `code` `` 和 `[mod+N]` 标记，渲染时被拆成「文本 + `<code>` + 文本」，逐段查表必然中英混排。所以文档走内容级：

1. `node i18n/tools/docs-zh.mjs` 读 `components/docs/content.ts`，把每个字符串字面量按词典换成中文，写成 `app/src/i18n/docs.zh-CN.ts`（结构与 `DocTopic` 完全一致）。
2. `app/src/i18n/docs.ts` 按当前语言导出 `QUICK_START / SHORTCUTS / TOPICS`。
3. `DocsList.tsx`、`DocsView.tsx` 只改了这一行：`from "./content"` → `from "../../i18n/docs"`。

**改文档译文 = 改 `ui.json` + 重跑 `docs-zh.mjs`**，不要手改生成物。`docs-zh.mjs` 会打印仍未翻译的字符串（目前只剩 `id` 与图片名）。

### 训练营课程：镜像目录（L2）

课程是 Rust 侧的内容（97 个 md/yaml，约 10.4k 行），走**内容级镜像**：

1. 译文放 `crates/academy/course.zh-CN/`，**相对路径与 `course/` 完全一致**（学习进度按路径记录）。
2. `crates/academy/build.rs` 生成两张表：`COURSE_FILES`（原版）和 `COURSE_FILES_ZH`——后者对每个英文文件，如果 `course.zh-CN/` 里有同名文件就用中文，否则回退英文。**所以课程可以一个单元一个单元地翻，缺的部分不影响加载。**
3. `crates/academy/src/lib.rs` 增加 `set_chinese(bool)`，`course()` 按开关选表（两张表各缓存一次）。默认英文——`cargo test` 与 Agent 都不受影响。
4. `crates/api/src/academy/mod.rs` 的 `academy.course` / `academy.lesson` 接受可选 `locale`，`zh*` 走中文表；前端 `app/src/store/academy.ts` 把界面语言传过去。

翻译一个文件时注意：**`id`、`group`、`image`、`color`、`badge.id`、`minutes`、`answer` 序号、`check` / `solution` 块必须保持原样**，只翻 `title`、`summary`、quiz 的 `question` / `options` / `explain`、lab 的 `title` / `goal` / 步骤文本 / 提示，以及 markdown 正文。步骤里提到的请求名（例如 `Greetings`）要保留英文，否则 `check` 对不上。

进度与缺口：

```powershell
node i18n/tools/course.mjs             # 每个单元 已译/全部
node i18n/tools/course.mjs --missing   # 列出还没翻的文件
```

改完跑 `cargo test -p zorvik-academy`（`tests/i18n_zh.rs` 会校验中文课程能通过解析）与 `cargo build -p zorvik-devbridge`。

行为要点：

- **回退**：查不到就返回 `null`，界面保持英文。上游新增文案不会让界面变空。
- **空白**：JSX 文本节点带换行缩进，查表前先 `\s+` 折叠，写回时保留首尾空白。
- **增量**：`MutationObserver`（childList / characterData / attributes）覆盖 React 重渲染、portal 里的对话框与 toast、以及后到的异步内容。
- **幂等**：译文本身不是词典的键，重复翻译不会再改一次。
- **不翻**：`script/style/code/pre/kbd/samp/input/textarea` 里的文本、可编辑区、CodeMirror、`[data-i18n-skip]` 子树。这些元素的**属性**（如 `placeholder`）仍然翻。
- **Rust 错误消息**：`app/src/lib/rpc.ts` 的 `errorMessage()` 把英文原样交给组件，最终渲染成文本 → 走同一张词典。不需要改 Rust，也不需要按 `code` 建表。

## 3. 怎么加译文

1. 找候选：`node i18n/tools/extract.mjs --missing 40`（会打印原文和所在文件）。
   按目录看：`node i18n/tools/extract.mjs --dir components/request --json out.json`（`--json` 把该目录的未译原文写成数组，便于批量翻）。
2. 在 `app/src/i18n/locales/zh-CN/ui.json` 里加一条：**键必须与源码一字不差**。
   - 注意原文用的是弯引号 `“”`（U+201C/201D）和省略号 `…`（U+2026），不要打成 `"` 和 `...`。
   - 译文用中文全角标点。
   - 键是**空白折叠后**的文本（换行缩进会被 `\s+ → 空格` 规整），所以照 `extract.mjs` 打印出来的字符串抄即可。
3. 批量写入请用 `merge.mjs`，不要手改 JSON：写一个 `{ "English": "中文" }` 文件后
   `node i18n/tools/merge.mjs additions.json`。它按英文键排序写回、去重，值写 `null` 等于删除该条
   （专名如 `Base URL`、`Client ID` 不需要译文，删掉即可，界面照旧显示英文）。
4. 拼接文案（含数字、名称、变量）加到 `patterns.json`：

```json
{ "pattern": "^(\\d+) of (\\d+) lessons done\\. Pick up where you left off\\.$", "replacement": "已完成 {0} / {1} 课，从上次停下的地方继续。" }
```

   规则：`pattern` 是 JS 正则源码（`\d` 要写成 `\\d`），整体锚定 `^…$`；`replacement` 用 `{0}`、`{1}` 引用捕获组，序号必须小于捕获组数量（`check.mjs` 会报错）。
   **精确词典里不要写 `{0}`**，精确匹配不做插值。
   **模板按数组顺序匹配，具体的必须排在笼统的前面**：`^Theme: match system$` 要写在 `^Theme: (.+)$` 上面，否则先被笼统规则吃成「主题：match system」。`check.mjs` 会把重复的 pattern 判成错误。
5. 跑 `node i18n/tools/check.mjs` 与 `cd app && npx vitest run src/i18n`。

### 术语表（保持一致，不要一句一个说法）

| 英文 | 中文 | 备注 |
|---|---|---|
| request / response | 请求 / 响应 | |
| workspace | 工作区 | |
| collection | 集合 | Postman 语境 |
| folder | 文件夹 | |
| environment | 环境 | |
| variable | 变量 | |
| header | 请求头 / 响应头 | 按上下文 |
| mock (server) | Mock / Mock 服务 | 保留英文，业界习惯 |
| load test | 负载测试 | |
| collection runner | 集合运行器 | |
| script / test | 脚本 / 测试 | |
| history | 历史 | |
| server | 服务器 | |
| agent | Agent | 不译 |
| Academy / Training Bootcamp | 学院 / 训练营 | |
| import / export / save | 导入 / 导出 / 保存 | |
| Send | 发送 | |
| Body / Headers | **保留英文** | 请求与响应里都叫这两个名字，翻译任一侧都会指错 |
| Request | 请求 | 不要译成"访问" |
| capture | 捕获 | 负载测试用语 |
| threshold | 阈值 | |
| stage / shape | 阶段 / 曲线 | |
| ramp up / hold / ramp down / jump | 爬坡 / 保持 / 回落 / 跳变 | 负载阶段形态，界面上是短标签 |
| route (Mock) | 路由 | 不译成"路线" |
| relay | 中继 | TCP 中继 |
| framing | 分帧 | 「As they arrive」＝「收到即按原样（不分帧）」 |
| Stop early（阈值） | 提前停止 | 不是"提前结束"；「停止于 10 秒后」由三段拼成 |
| virtual user | 虚拟用户 | 列表里的缩写 `VU` 保留 |
| cookie jar | **Cookie 存储** | 不要译成"Cookie 罐"，那只是英文直译 |
| Test out（单元免修小测） | **免修测试** | 不要译成"试用" |
| XP | **XP** | 界面上到处和数字连用，译成"经验值"反而变长 |
| Lvl | 等级 | 圆环里的缩写；`Lvl 3` 显示为「等级 3」 |
| rank（Newbie Node…） | 节点新手 / 数据包推手 / 请求头黑客 / 协议专家 / 网络忍者 / 线路巫师 | 六个段位名 |
| schema | schema | 小写保留，`JSON Schema` 等专名也不译 |


### 不要翻的东西

- 产品名 `Zorvik`、协议名（HTTP/gRPC/WebSocket）、命令行 `zorvik`。
- **HTTP 状态名**（`OK`、`Not Found`、`Internal Server Error`…）：与协议一致，界面里和状态码一起显示，翻译反而不好对照。
- 单位与格式名（`ms`、`px`、`MB`、`PCM 16-bit (s16le)`）、`Body` / `Headers` 两个标签。
- MCP 工具名/描述（`crates/api/src/agents/**`）：那是给 AI 模型读的，翻译会降低调用准确率。
- 用户数据：请求名、工作区名、URL、文件路径。它们只是恰好可能撞上词典键；撞上了可在其宿主元素加 `data-i18n-skip`。

## 4. 合并上游

```powershell
git remote add upstream https://github.com/LibreGuild/zorvik.git   # 只需一次
git fetch upstream
git switch main
git merge upstream/main

node i18n/hooks/apply.mjs          # 挂载点被冲掉时自动补回
node i18n/tools/extract.mjs --missing 30   # 看上游新增了哪些文案
node i18n/tools/check.mjs          # 看哪些旧译文已失效
cd app; npm run build; npx vitest run
```

冲突处理规则（固定）：

| 冲突文件 | 取哪边 |
|---|---|
| `app/src/i18n/**`、`i18n/**` | **ours**（我们的汉化资产） |
| 上游源码、文档、`crates/**` | **theirs**（保持上游最新） |
| `app/src/main.tsx` | **theirs**，然后 `node i18n/hooks/apply.mjs` 重放 |
| `docs/DocsList.tsx`、`docs/DocsView.tsx` | **theirs**，同样由 `apply.mjs` 把 import 指回 `i18n/docs` |
| `ui.json` / `patterns.json` | 两边键都保留；通常只在冲突标记附近手工合并 |

`apply.mjs` 找不到锚点时会明确报错退出（而不是静默改坏），这时需要手工把这两行加回 `main.tsx`：

```ts
import { initI18n } from "./i18n";
initI18n(); // 在 restoreAppearance(); 之后
```

## 5. 测试与英文回归

- **单测**：`initI18n()` 在 `MODE=test`（Vitest）下直接返回，界面保持英文 → 上游 435 个测试不受影响。当前全套 448 个通过（435 上游 + 13 汉化）。
- **e2e**：`app/e2e` 里约 647 处选择器按英文可见文本定位，**必须用英文跑**：

```powershell
cd app
$env:VITE_ZORVIK_LOCALE="en"; npm run e2e
```

（还需要先 `npx playwright install chromium`。`VITE_` 前缀的变量才会进前端，且要在启动 Vite 之前设置。）

## 6. 已知限制

- macOS 自建菜单项保持英文：Rust 侧没有运行时语言开关，预定义项（关于/隐藏/最小化…）本就跟随 macOS 系统语言。`tauri.conf.json` 的窗口标题 `Zorvik` 是产品名，按术语表不译。
- 结业证书是 canvas 画出来的（`academy/Certificate.tsx` 的 `fillText`），DOM 层碰不到：按"文凭"惯例保持英文，不做翻译。要翻得改源码里的 `center()` 调用，并把中文字体塞进 canvas。
- 更新提示在 `UpdateSettings.tsx` / `UpdateNotice.tsx`（React），动态拼接句已由 `patterns.json` 的 `Version … is out`、`Up to date (checked …)`、`Zorvik … is ready` 等模板覆盖。
- Windows 安装器脚本（NSIS）的文案未翻 → 属安装期，不进界面词典。
- Training Bootcamp 课程正文（`crates/academy/course/`，约 750KB）已全部译完（97 / 97）；缺译回退英文的机制保留，合并上游后新单元会先显示英文。
- `Body`、`Headers` 两个标签保持英文（见术语表）；`XP` 同理。
- 剩余约 8% 的候选是示例值（`8.8.8.8 over UDP…`、`curl 'https://api.example.com' …`）、格式与协议名（`JUnit XML…`、`HTTP/3`、`Base64`）和静态扫描误抓的代码片段，故意保留英文。
- 应用内文档已改为整篇替换（`docs.zh-CN.ts`），不再有行内代码导致的中英混排；其余组件里被 `<b>`/`<Kbd>` 拆开的提示语仍是逐段翻译，个别句子读起来会略生硬。
- 句尾紧跟一个独立 `.` 节点时（`… in Settings.`），中文译文只能以 ASCII 句号收尾，会看到 `设置.` 这种半角标点。
- **默认名字存在数据里**：新建的请求/服务器默认叫 `New request`、`Mock API`。界面表层会翻成「新建请求」，但拼进 `Captures of …`、`Training Bootcamp load test 的捕获` 这类模板时用的是数据里的英文名，于是出现中英混排。要么改名，要么把默认名按当前语言写进文件（会动用户数据，暂不做）。
- 更新重启的确认框把「a server is running, a tab has unsaved changes…」这类列表项拼成一句再交给 `confirm()`，整串是运行时拼的，模板接不住，仍会中英混排（罕见路径，暂不处理）。
- 首帧理论上可能有一瞬英文（观察器在渲染后立即执行，实测多在绘制前完成）。
- `crates/**` 里 Rust 错误消息只有词典里**已收录的**会被翻译，未收录的保持英文。`node i18n/tools/rust.mjs` 报 1310 条（学院、代理授权、服务器、导入导出的常用提示已覆盖；其余多是内部错误与 `#[cfg(test)]` 里的测试夹具，看到一条补一条）。
- 脚本编辑器的自动补全文档（`scriptsModel.ts`）渲染在 CodeMirror 内部，DOM 层按规则跳过；要翻得改编辑器侧。

## 7. 进度

**2026-11-10　P0 骨架完成**

- 新增 `app/src/i18n/`（引擎 + DOM 层 + 入口 + 13 个单测）与 `i18n/`（文档 + 工具 + 挂载脚本）。
- 上游文件改动：`app/src/main.tsx` +3 行（1 import、1 注释、1 调用）、`AGENTS.md` +2 行。
- 验证：`npm ci`、`npm run build`、`npx tsc -b`、`npx vitest run`（448 通过）、`cargo build --workspace` 全部通过。

**2026-11-10　P1–P3 界面与文档文案（同一会话继续）**

- 词典从 51 条扩到 **1850 条**（含 13 条模板）；候选 **2066 条，已译 1839 条，覆盖率 89.0%**。
- 逐目录覆盖率：layout / sidebar / response / request / modals / servers / loadtests / tools / stream / runner / catalog / agents / academy / store 全部过一遍；应用内文档 `content.ts` 93.6%。
- 抽样人工校对术语（Request/Collection/Load test/Threshold…），统一写进上面的术语表。
- 上游文件仍然只有那 2 处改动；`npx tsc -b`、`npx vitest run`（448）全通过。

**2026-11-10　P6 实机走查（Chrome DevTools MCP + devbridge）**

用 `zorvik-devbridge` + `vite` 起真实 UI，逐屏导出「未被翻译的可见文本」，修掉一批只有渲染后才暴露的问题：

- 词典 1850 → **1989 条**，模板 13 → **33 条**；候选 2055 条，覆盖率 **89.5%**，应用内文档 96.5%。
- 修掉的具体问题：快捷键提示碎片（`new request ·`、`go to… ·`、`settings`）、`主题：match system`（模板顺序：具体规则必须排在 `^Theme: (.+)$` 之前）、目录分类 `aria-label="Cloud, 44 APIs"`（13 条分类模板）、`Send (Ctrl+Enter)` / `Save (Ctrl+S)`（按钮 title）、`Unsaved request`、`Stack response below`、`Press` 的误译（压测的「施压」改成键盘的「按」）。
- 截图与 a11y 树确认：欢迎页、请求编辑器、设置弹窗、API 目录、应用内文档都已是中文，`<html lang>` 为 `zh-CN`。
- 结论：**界面层没有系统性漏译**，剩下的英文集中在两处——文档里被 `<code>` 拆开的句子，以及目录/示例这类数据。

**2026-11-10　P7 整篇文档 + 第二轮逐屏清扫**

- 应用内文档改为**内容级**：`tools/docs-zh.mjs` 从词典生成 `app/src/i18n/docs.zh-CN.ts`（247 处字符串全部替换），`DocsList`/`DocsView` 各改一行 import。行内代码导致的中英混排消失。
- 第二轮清扫（键盘快捷键弹窗、设置七个分区、请求编辑器的 8 个标签页、历史/Agent 面板）：补齐鉴权方式列表、`Bulk edit`、超时与 TLS 说明、Markdown 提示、更新说明、Agent 面板文案等 40 余条。
- 词典 2034 条、模板 34 条；候选 2055 条，覆盖率 **89.5%**；文档正文 **100%**（仅剩 id 与图片名）。
- 新增 `i18n/stale-allow.json`（第三方文案白名单）；`apply.mjs` 现在守护 3 处挂载点。
- 验证：`npx tsc -b`、`npx vite build`、`npx vitest run`（61 文件 / 448 用例）全通过。

**2026-11-10　P4 课程机制（L2）+ 前两个单元**

- `crates/academy/build.rs`、`src/lib.rs`、`crates/api/src/academy/mod.rs` 打通中英课程表与 `locale` 参数；默认英文，`cargo test` 不受影响。
- 新增 `crates/academy/tests/i18n_zh.rs`（3 个测试：中文课程能加载、未译单元回退英文、译过的课时 id 不变）。
- 新增 `i18n/tools/course.mjs` 统计每个单元 已译/全部。
- 已译：`00-welcome`（4/4）、`01-networks`（5/5）。合计 **9 / 97 个文件（9%）**，其余单元自动回退英文。
- `cargo test -p zorvik-academy`（11 上游 + 3 汉化）、`npx tsc -b`、`npx vite build`、`npx vitest run`（448）全通过；RPC 实测 `academy.course` 返回中文标题。

**2026-11-10　P4 继续：`02-dns`**

- `crates/academy/course.zh-CN/02-dns/`：unit.yaml + 4 课，全部译完。课程进度 **14 / 97 个文件（14%）**。
- 踩到一个坑并写进 NEXT.md：课程 YAML 里值以反引号开头会被解析器判为非法 token，必须加双引号。
- `cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4 继续：`03-http`**

- `crates/academy/course.zh-CN/03-http/`：unit.yaml + 5 课（请求/响应拆解、方法、状态码、请求头、耗时阶段）。课程进度 **20 / 97 个文件（20%）**。
- 两处 YAML 指示符踩坑（值以 `?` 和反引号开头）：规则已升级为「以任何 YAML 指示符开头就加双引号」，写进 `SKILL.md` 与 `NEXT.md`。
- `cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4 继续：`04-data`**

- `crates/academy/course.zh-CN/04-data/`：unit.yaml + 6 课（查询参数、路径参数、JSON 正文、表单与上传、内容协商、动态假数据）。课程进度 **27 / 97 个文件（28%）**。
- `i18n/tools/course.mjs` 增加 **YAML 体检**：扫描中文课程的前置元数据，列出「值或列表项以指示符开头却没加引号」的行并返回非零退出码。这类错误本轮又踩了 4 次（`?`、反引号、`**` 开头），现在写完全程一扫就知道。
- `cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4 继续：`05-auth`（目前最大的单元）**

- `crates/academy/course.zh-CN/05-auth/`：unit.yaml + 7 课，943 行全部译完：认证 vs 授权、Basic/API Key、Bearer 与 JWT、OAuth 2.0 客户端凭证、Cookie 与会话、Digest/NTLM、请求签名（JWT/AWS SigV4/OAuth 1.0/Hawk/EdgeGrid/ASAP）。
- 课程进度 **35 / 97 个文件（36%）**；YAML 体检零告警（本轮一次写对，上一轮加的检查起了作用）。
- `cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4 继续：`06-tls`**

- `crates/academy/course.zh-CN/06-tls/`：unit.yaml + 4 课（HTTPS 保护什么、证书与证书链、正确修复信任错误、HTTP/2 与 HTTP/3）。课程进度 **40 / 97 个文件（41%）**。
- 修好了 `course.mjs` 的 YAML 体检：之前对 **CRLF 文件永远不命中**（JS 的 `.` 不匹配 `\r`），还会误报多行标量里的 `- **粗体**`、合法的 YAML 锚点 `&x` / `*x`、以及引号内含冒号的行。现在会跟踪 `key: |` 的缩进、区分锚点与别名。
- `cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4 继续：`07-organize`**

- `crates/academy/course.zh-CN/07-organize/`：unit.yaml + 4 课（环境与变量、秘密变量、文件夹与继承、导入导出）。课程进度 **45 / 97 个文件（46%）**。
- `cargo test -p zorvik-academy`（11 + 3）通过；YAML 体检零告警。

**2026-11-10　P4 继续：`08-testing`（进行中，5/8）**

- 已完成 unit.yaml 与 4 课：第一个测试、串联请求、集合运行器与数据文件、重复直到。课程进度 **50 / 97 个文件（52%）**，过了半程。
- 剩 `05-contract-checks`、`06-filter-responses`、`07-script-power-tools`（13.5 KB，最大的一课）。
- `course.mjs` 的 YAML 体检又补了两类漏检：`- question: **粗体**`（列表项里的 key 嵌套）和「双引号值里再套双引号」。后者在课程 YAML 里要用单引号包裹。
- `cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4：`08-testing` 收尾（8/8）**

- 补齐 `05-contract-checks`（OpenAPI 契约检查）、`06-filter-responses`（JSONPath/jq/XPath 过滤）、`07-script-power-tools`（`pm.sendRequest`、内置库、jsonSchema、visualizer、skipRequest）。课程进度 **53 / 97 个文件（55%）**。
- `course.mjs` 的 YAML 体检又补一类：**未加引号的纯量里出现「冒号+空格」**（如 `以 http://127.0.0.1: 开头`），会被解析成嵌套映射。同时修掉了新规则误报 `answer: 1` 的剥离逻辑 bug。
- `cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4：`09-beyond-rest`（6/6）**

- unit.yaml + 5 课：GraphQL 查询、变量与 schema（introspection）、gRPC 与 protobuf、gRPC 流式（三种流）、GraphQL 订阅（WebSocket/SSE）。课程进度 **59 / 97 个文件（61%）**。
- YAML 体检这次先一步抓到了 `- text: **最后** …`（`**` 开头），只返工一次；`cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4：`10-realtime`（7/7）**

- unit.yaml + 6 课：为什么需要实时（轮询 vs 推送）、WebSocket 双向对话、Server-Sent Events、MQTT 发布订阅、Socket.IO 事件与确认、WebSocket 工作流（保存消息 / 连接后步骤 / 心跳 / 自定义关闭码）。课程进度 **66 / 97 个文件（68%）**。
- 保留了 `&routine` / `*routine` 锚点、`match: json` 规则里的 `{{message.id}}`、`sse.connect` / `ws.connect` 的调用参数、quiz 的 `answer` 序号。
- YAML 体检零告警（本轮一次写对）；`cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4：`11-sockets`（5/5）**

- unit.yaml + 4 课：TCP 字节流（谁先开口、FIN/RST）、分帧（分隔符 / 长度前缀 / 固定长度）、UDP 数据报、TCP 中继看线路。课程进度 **71 / 97 个文件（73%）**。
- 保留了 `socket.framing`/`lengthBytes`/`lineEnding` 参数、`tcpProxy` 的 `target: "{{backend_host}}"`、`summary: "!unfinished*"` 这类否定检查。
- YAML 体检零告警；`cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4：`12-mocking`（8/8）**

- 补齐 `06-examples-to-mocks`（示例保存、按查询参数挑示例、文件夹转 Mock）与 `07-websocket-mock`（规则作答、定时推送、按关闭码挂断、流量面板）。
- lab 的 files/servers 数据、YAML 锚点（`&allPets` / `&allExample` / `&feed`）、`check` / `solution` 全部原样保留；日志文案 `Disconnected by server (code 4001 · Defined by the application)` 保持英文，答案仍按原文填写。
- 课程进度 **79 / 97 个文件（81%）**；`node i18n/tools/course.mjs` 零告警；`cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4：`13-performance`（5/5）**

- unit.yaml + 4 课：延迟/吞吐量/百分位、第一次负载测试、用户数与请求速率两种模型及阈值、加档对比与崩溃点（拐点、利特尔法则）。
- 顺带补齐界面上一直没译的阶段编辑器标签：`Peak (users)` / `Peak (req/s)` / `Target (users)` / `Target (req/s)`（源码由 `Peak ({info.unit})` 拼出，静态扫描找不到，已加入 `stale-allow.json`）。词典 2034 → **2038 条**，覆盖率 89.5% → **89.7%**。
- 课程进度 **84 / 97 个文件（87%）**；YAML 体检零告警；`cargo test -p zorvik-academy`（11 + 3）、`npx vitest run src/i18n`（13）通过。

**2026-11-10　P4：`14-automate`（4/4）**

- unit.yaml + 3 课：`zorvik` 命令行（run/load/serve/mcp、选项解剖、退出码）、CI 流水线（四步配方、GitHub Actions 示例、JUnit 报告、好习惯）、通过 MCP 使用 AI Agent（能力清单、连接命令、权限表、批准与拒绝）。
- `--bail` / `--var` / `--junit` / 退出码表、bash 与 GitHub Actions 的 yaml、`pm.test` 脚本全部保留英文原样；界面名按词典书写（运行…、首次失败即停止、重复直到、连接 Agent、跟随 Agent、本次会话允许、在应用未打开时工作）。
- 课程进度 **88 / 97 个文件（91%）**；YAML 体检零告警；`cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4：`15-mcp`（6/6）**

- unit.yaml + 5 课：MCP 为什么存在（协议、角色、工具/资源/提示词、JSON-RPC、两种传输）、调用 MCP 服务器（会话、调用、资源模板、消息）、测试 MCP 服务器（工具错误 vs 协议错误、structuredContent、CI）、搭建 MCP 服务器（Mock、模板、连接 AI 应用）、MCP 安全（本地程序授权、密钥、提示词注入）。
- lab 的 servers/files 配置（工具名、描述、inputSchema、outputSchema、`pm.test` 脚本、`probe`、锚点 `&notes2`）全部原样保留；协议字段与示例数据（`initialize`、`tools/list`、`isError`、`structuredContent`、`notifications/tools/list_changed`）不译。
- 踩到一个 YAML 坑并当场修掉：`- question: \`structuredContent\` 是干什么用的？` 以反引号开头，体检报错、`cargo test` 同批失败；加双引号后恢复。
- 课程进度 **94 / 97 个文件（97%）**；YAML 体检零告警；`cargo test -p zorvik-academy`（11 + 3）通过。

**2026-11-10　P4 收尾：`16-capstone`（3/3，课程 100%）**

- unit.yaml + 2 课：发布清单（契约、集合、契约检查、冒烟运行、性能、交接）、结业任务（导入契约 → 切环境过 `Matches the API spec` → 冒烟运行 → 负载测试 → 从 OpenAPI 生成 Mock → Kotlin 代码 → `ship it`），以及结业徽章与证书。
- lab 的 `rocket-pizza.yaml` 契约、staging 服务器、YAML 锚点（`&contract`、`&listPizzas`、`&launchTest`、`&rocketMock`）、`check` / `solution` 全部原样保留；运行时的英文测试名 `Matches the API spec` 与 `OpenAPI URL`、`base URL` 保持原样，判分答案 `ship it` 保持小写英文。
- 课程进度 **97 / 97 个文件（100%）**；YAML 体检零告警；`cargo test -p zorvik-academy`（11 + 3）通过。
- 课程主线到此结束。后续只剩长尾界面字段、动态拼接句，以及合并上游后的增量补译。

**2026-11-10　P5：L3 原生层（前端部分）**

- `app/src/lib/platform.ts`：`pickFolder` / `pickFile` / `pickSavePath` 的对话框标题统一过 `t()`（调用方仍传英文，集中翻译，英文模式自动回退）；过滤器名 `Supported files` / `All files` 与浏览器回退提示 `` `${label}\nEnter an absolute … path:` `` 也改走词典。
- `app/src/lib/encoders.ts`：`Intl.RelativeTimeFormat("en")` 改为 `activeLocale() ?? "en"`，测试模式（MODE=test）仍是英文，断言不变；末尾 `"now"` 走 `t("now")`。实测 `zh-CN` 输出「3小时前 / 昨天 / 后天」，`en` 输出「3 hours ago / now」。
- 新增 5 条词典：`Enter an absolute folder path:`、`Enter an absolute file path:`、`Supported files`、`All files`、`now`。词典 2038 → **2043 条**，`check.mjs` 通过。
- 队列更正：`crates/api/src/updates.rs` 实际不存在（更新提示在 `UpdateSettings.tsx` / `UpdateNotice.tsx`）；macOS 自建菜单与窗口标题按设计保持英文。
- 验证：`npx tsc -b` 通过；`npx vitest run src/lib/encoders.test.ts src/i18n` 4 文件 / 31 用例通过。

**2026-11-10　P9 长尾界面字段（两批 32 条）**

- HTTP 状态码下拉：`MockRoutes.ts` 的 18 条原因短语（`Created`、`Accepted`、`No Content`、`Moved Permanently`、`Found`、`Not Modified`、`Bad Request`、`Unauthorized`、`Forbidden`、`Not Found`、`Method Not Allowed`、`Conflict`、`Unprocessable Content`、`Too Many Requests`、`Internal Server Error`、`Bad Gateway`、`Service Unavailable`、`Gateway Timeout`）补中文；`OK` 保持英文，避免误伤按钮上的 `OK`。
- 通用标签 14 条：`Warning` / `Caution` / `Important`（文档 callout）、`Cookies`、`Later`、`What's new`、`Restart now`、`Remove row`、`Write docs`、`Keep editing`、`Body`、`Expires`、`Issued at`、`Not before`。
- 多义词按上下文筛选后跳过：`Headers`（请求头/响应头两用）、`Schema`、`Ack`、`Ping`、`Base URL`、`Client ID` 等按术语表保持英文。
- 词典 2043 → **2075 条**；候选 2054 条，已译 1874，未译 **180**，覆盖率 **91.2%**；`check.mjs` 通过。
- 验证：`npx vitest run src/i18n src/components/UpdateNotice.test.tsx src/components/DocsEditor.test.tsx src/components/request/ExamplesTab.test.tsx src/lib/encoders.test.ts` 7 文件 / 50 用例通过。

**2026-11-10　P8：英文 e2e 回归**

- `npx playwright install chromium` 走代理 `127.0.0.1:7890` 完成（chromium-1243、headless shell、ffmpeg-1011、winldd-1007）。
- 先单跑 `e2e/app.spec.ts`：11 passed，确认三件套（testkit 18787 / devbridge 18799 / vite 15420）与英文模式正常；当时三个端口均空闲，未复用开发中的 devbridge，未碰真实工作区。
- 再跑全量 `VITE_ZORVIK_LOCALE=en npx playwright test`：**73 passed，0 失败**（3.9 分钟，22 个 spec）。日志里的 `[vite] ws proxy socket error: write ECONNABORTED` 是页面关闭时的已知噪音，不影响结果。
- 至此汉化 fork 的英文回归通过：`VITE_ZORVIK_LOCALE=en` 下上游 647 处英文选择器全部照常命中。

**2026-11-10　P10 整体复查：术语纠偏 + 学院页 + 动态拼接句**

- **术语纠偏**：`Cookie jar` 原来是直译「Cookie 罐」（读不懂），改为 **Cookie 存储**（4 条）；`Test out` 从「试用」改为 **免修测试**（含文档正文）；`Lvl` 由「级」改为 **等级**（原来会显示成「级 1」）；`Previous` / `Next` 在课程页改回「上一课 / 下一课」；`Header Hacker` 段位名改为「请求头黑客」；`Filter playground` 改为「过滤演练场」。`Body` 恢复英文标签（术语表本来就要求保留，之前被译成「正文」和 `Headers` 不一致）。
- **学院页（Academy）补全**：段位名 6 个、额外徽章 8 个（名称 + 说明）、XP 来源 6 条、界面上所有动态短语（`等级 1`、`0/80 课时`、`0/25 徽章`、`单元 0`、`0/3 课时`、`5 分钟阅读`、`实验 · 7 分钟`、`3 题`、`继续`、`实验进行中：X（0/3 步）`、`免修“X”`、`答对 80% 即可拿到 … 徽章`、`题目 1：`、`获得于 …`、`完成“X”`、`未解锁`、`升到 3 级！`、`· 你现在是网络忍者`、`累计 120 XP`）。
- **动态拼接句一次性补齐**：`i18n/_tmp_probe2.mjs` 那类检查（把源码里所有含 `${}` 的模板按 `1` 代入，再跑词典 + 模板匹配）从缺 126 条降到缺 22 条（剩下的都是 CSS、testid、DNS 反查域名）。新增 **117 + 30 + 3 + 1** 条模板，覆盖更新提示、负载测试阈值/阶段/捕获、服务器与 Mock、流量面板、代理与 DNS 提示、工具（TLS/HTTP3/编码器/过滤器）、命令面板、侧边栏「无法启动…」等。
- **命令面板**：`Run collection` / `Runner` / `Open the Academy` 这类写在对象字面量里的文案静态扫描抓不到，实机走查时补上（另加 `Server · :8080` 模板）。
- **CodeMirror 占位符**：编辑器子树默认不翻译，但占位符（「关于此请求的备注，Markdown 格式…」）和超长行的「显示更多」是界面文案 → 在 `app/src/components/CodeEditor.tsx` 就地包 `t()`/`tf()`（L3 做法），英文模式自动回退。
- **其他修正**：请求设置的「只覆盖这个请求。默认值在设置里。.」双句号；示例空状态「选择 保存为示例 会显示在响应上方」语序；更新说明「Zorvik 只读取一个文件， latest.json即来自…」断句；消息脚本说明（`pm.test` / `pm.environment.set` 那段）整段碎片化翻译。
- 数字：词典 2075 → **2179 条**，模板 34 → **207 条**；候选 2054 条，未译 180 → **176**，覆盖率 91.2% → **91.4%**。
- 验证：`npx tsc -b`、`npx vite build`、`npx vitest run`（448 通过）、`node i18n/tools/check.mjs`、`node i18n/tools/course.mjs`（97 / 97）全绿；实机走查（devbridge + vite）确认学院首页/课程页/徽章页/免修测试页/设置七个分区/请求六个标签页/命令面板/侧边栏六个分区均无成句英文。

**2026-11-10　P11 新建负载测试 / 新建服务器场景的混排清理**

- 起因：运行时拼接和"表达式里的文案"是旧工具的盲区 —— `extract.mjs` 只认 `hint="…"`，认不出 `hint={bad ? "A" : "B"}`；`probe.mjs` 只管带 `${}` 的模板。于是新增两个工具：**`audit.mjs`**（字符串字面量 + JSX 裸文本全扫，先按"像不像界面文案"粗筛，再查词典+模板）和 **`lookup.mjs`**（给一批原文，逐条回答"会不会被翻、翻成什么"）。审计口径下未译从 **545 条降到 83 条**（剩下是字体名、协议名、示例值、CSS 类和 canvas 证书）。
- 负载测试编辑器：数据文件说明（`… 列即变量（{{name}}），会覆盖环境变量`）、四段选项提示（随机停顿/预热/超时/keep-alive）、阶段表头与形态标签（爬坡/保持/回落/跳变、峰值（用户数）、目标（用户数））、`Up to … per test`、阈值动作（**Stop early 原本被 `^Stop (.+)$` 吃成「停止 early」，现为「提前停止」**）、`p50 延迟 (ms)` 的空格与括号（在 `dom.ts` 的 `NO_SPACE_BEFORE` 里补了全角左括号）、结果页（`Back to the live run`、`Stopped by a threshold`、`Generator CPU`、`Peak generator CPU`、`Checked live, final at the end`、`0 runs`、`peak 10 users`、空状态那句 "Press Start (Ctrl+Enter)…"）。
- 服务器：Mock（`Routes · 1`、路径说明、`(one value of a JSON body),`）、WS（欢迎语/定时消息/客户端三段提示）、SSE（节奏与重连提示、客户端说明）、TCP/UDP（分帧提示、`As they arrive` 原来是错译「边到边显示」→「收到即按原样（不分帧）」）、DNS（`Names match in any case;` 与 CNAME 说明）、MCP（工具/资源/客户端三段说明、`Text; JSON text is fine.`、`after … ms`、`required`）、中继（`Faults` 标题）。
- 其他顺手修：认证页（`Fetch token`、`No expiry`…）、脚本模型 40+ 条断言说明、工具页（端口预设名、`REST`/DNS 结果标志位、过滤演练场与证书解码说明）、弹窗（导入/更新/环境变量）、命令面板与各类 `aria-label`（`Start X`/`Send X`/`Remove X`/`Stage N`）。
- 模板新增 22 条、词典 +221 条；顺手把"Includes/Loading/Trailing"类的兜底模板挪到数组末尾，避免 `^Send (.+)$` 抢在 `^Send to #1$` 前面。
- 验证：`tsc`、`vite build`、`vitest run`（448 通过）、`check.mjs`、`course.mjs`（97/97）全绿；实机走查：新建负载测试、8 类服务器新建与编辑、WS/HTTP 请求八个标签页、学院首页/课程/徽章、设置、工具九个工具、历史/AI Agent/文档，均无成句英文（只剩技术名词）。

**2026-11-10　P12 折叠区与 Rust 侧文案**

- **把审计器本身的三个盲区补上**（这正是"折叠起来看不到、展开还是英文"的原因）：① 括号被当成代码符号整条丢弃（`Delay per chunk (ms)`、`Peak (users)` 这类带单位的标签全漏了）；② JSX 裸文本紧跟着 `{表达式}` 时（`Match only when {n > 0 && …`）匹配不到；③ 反引号模板字符串（`hint={`…`}`）没扫。修完后前端缺口从 83 涨到 **324 条真实清单**，逐条过完只剩字体名/协议名/示例值。
- **服务器折叠区**（用户报的那批）：Mock 的「匹配条件 / 应答序列」（`Match only when`、`The first calls get these answers in order…`、`A condition on a JSON body: $.type == "admin"…`、`, a final *`）、WS 的欢迎语与定时消息、SSE 的节奏/重连/客户端、TCP-UDP 的分帧、DNS 的递归标志与 CNAME 说明、中继的 `Faults`、MCP 的工具/资源/客户端说明。
- **其他折叠/条件内容**：脚本 API 说明（`The script API (Postman-compatible)`、`Chai-style assertion: …`）、变量编辑器的「已存为秘密 / 明文值」提示、数据文件选择、MQTT 通配符提示、gRPC 状态说明（5 条）+ 内置类型说明、麦克风中断提示、重复发送提示、端口检查的 `Closed / no answer` 句、证书解码说明、API 目录空状态（`No API matches … this category`）、Agent 授权弹窗（`Asked by …`、`Denied in 0:45`、`· 2 more waiting`）、工具页全量。
- **新增 `i18n/tools/rust.mjs`**：Rust 侧 `format!` 拼出来的提示最终也会渲染成文本节点，只有词典里有才能翻。首轮 **1424 → 1310 条**：学院（实验/小测/免修的报错）、Agent 授权与断开、服务器运行日志（端口占用、监听失败、DNS/中继/SSE/TCP/TLS 报错）、导入导出（cURL 选项、OpenAPI、过滤器、JSON 对比）都已覆盖；剩下的多是内部错误与 `#[cfg(test)]` 夹具。
- 数字：词典 2626 → **2774 条**，模板 238 → **295 条**；`extract` 覆盖率 91.7%（未译 170，全部是示例值/语言名/代码片段），`audit` 剩余 281 条同属噪音。
- **修掉一个隐蔽 bug**：`merge.mjs` 原来按原文原样存键，JSX 拆出来的节点带前导空格（`" means the host refused;"`），存进去永远匹配不上（运行时查词前会归一化空白）。现在 merge 与词典都做同一套归一化，并把 5 条带空格的旧键改正、2 条重复键清掉。
- 验证：`tsc`、`vite build`、`vitest`（448 通过）、`check.mjs`、`course.mjs`（97/97）；实机确认 Mock 服务器的「匹配条件 / 应答序列」展开后全中文。

待办，按性价比排序：

| 阶段 | 范围 | 量级 | 备注 |
|---|---|---|---|
| ~~P1~~ | ~~layout / sidebar / modals / request / response~~ | 已完成 | |
| ~~P2~~ | ~~servers / loadtests / tools / runner / stream / catalog / agents~~ | 已完成 | |
| ~~P3~~ | ~~`docs/content.ts` 正文~~ | 已完成 | Rust 错误消息句式按需继续补 `patterns.json` |
| ~~P6~~ | ~~界面实机走查~~ | 已完成 | 问题清单见上 |
| ~~P7~~ | ~~文档整篇替换~~ | 已完成 | 改译文后重跑 `docs-zh.mjs` |
| ~~P4~~ | ~~`crates/academy/course/` 课程正文（L2）~~ | 已完成 | 97 / 97 个文件，合并上游后按 `--missing` 补译 |
| ~~P5~~ | ~~L3 原生层（`platform.ts` 对话框 / `Intl.RelativeTimeFormat`）~~ | 已完成 | 菜单、窗口标题按设计保持英文；更新提示的动态句待补 patterns |
| ~~P8~~ | ~~`npm run e2e` 英文回归~~ | 已完成 | Chromium 1243 已装；73 passed，0 失败 |
| ~~P9~~ | ~~服务器 / 负载测试编辑器逐字段走查~~ | 已完成 | 覆盖率 91.2%；剩余 180 条多为格式名、语言名与扫描误抓的代码片段 |

## 8. 环境记录（本机）

- 工具链：Rust 1.99.1、Node 24.22.1、npm 11.19.1（满足 `rust-version = 1.90`、Node 22+）。
- 依赖下载走本地代理 `http://127.0.0.1:7890`，已写入 `~/.cargo/config.toml` 的 `[http] proxy`（仓库内未改）。代理关闭时 `cargo` 与 `npx playwright install` 会连接被拒。
- 构建产物：`target/debug/{zorvik-desktop,zorvik,zorvik-devbridge,zorvik-testserver}.exe`、`app/dist/`（均在 `.gitignore` 内）。
- Playwright：Chromium 1243（含 headless shell、ffmpeg、winldd）已装入 `%LOCALAPPDATA%\ms-playwright`；英文 e2e 用临时 workspace，不碰真实工作区。
- 未验证：`npm run tauri build`（需要 NSIS/WiX 与签名密钥）、`cargo test` 全量。

## 9. 新会话交接

会话可能随时中断，所以状态都落在文件里，不在对话里：

1. **项目技能** `.codebuddy/skills/zorvik-zh-cn-localization/SKILL.md`：说一句"继续汉化"就会加载，里面是完整工作流（先读什么、硬规则、每轮循环、验证命令、坑）。
2. **任务队列** `i18n/NEXT.md`：下一步做什么、每项的完成标准、当前数字。**每轮结束必须更新它。**
3. **本文**：架构、目录、术语表、挂载点清单、进度历史。

具体动作：

```
读 SKILL.md → 读 NEXT.md 挑一项 → 体检 extract/check/course → 翻译 → 验证 → 回写 NEXT.md 与本文进度
```

- 先读仓库根的 `PROJECT.md`（上游规则）。
- `node i18n/tools/extract.mjs` 看覆盖率，`node i18n/tools/check.mjs` 看词典健康度，`node i18n/tools/course.mjs` 看课程进度。
- 要动手翻译：从 `--missing` 列表挑一个目录，只改 `ui.json`/`patterns.json` 或 `course.zh-CN/`，不要改 `app/src` 里的英文原文。
- 改完跑 `cd app && npx tsc -b && npx vitest run`；动过 `main.tsx` 或合并过上游就再跑一次 `node i18n/hooks/apply.mjs`。
