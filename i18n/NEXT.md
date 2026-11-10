# 接下来做什么

> 这是**唯一**的任务队列。新会话从这里挑一项开始，做完立刻回来勾掉并更新数字。
> 架构与规则见 `i18n/README.md`；执行流程见 `.codebuddy/skills/zorvik-zh-cn-localization/SKILL.md`。

## 当前状态（2026-11-10 收尾）

| 指标 | 值 | 怎么复测 |
|---|---|---|
| 界面词典 | 2774 条 + 295 条模板 | `node i18n/tools/extract.mjs` |
| 界面覆盖率 | 91.7%（2054 条候选，未译 170） | 同上；更准的缺口看 `node i18n/tools/audit.mjs`（281 条，均为字体/协议名/示例值/代码片段） |
| Rust 侧文案 | 已覆盖常用提示，剩余 1310 条 | `node i18n/tools/rust.mjs`（多为内部错误与测试夹具） |
| 应用内文档 | 100%（247 处字符串） | `node i18n/tools/docs-zh.mjs` |
| 课程 | **97 / 97 个文件（100%）** | `node i18n/tools/course.mjs` |
| 验证基线 | tsc / vite build / vitest 452 / cargo test -p zorvik-academy 14 / e2e 73（英文模式） | 见 README 第 5 节 |
| 语言开关 | 顶栏「中 / EN」即时切换，记忆在 `zorvik.locale` | 实机点一下即可；`VITE_ZORVIK_LOCALE` 钉死时按钮隐藏 |

最近完成：P0 骨架 → P1–P3 界面与文档全扫 → P6 实机走查 → P7 文档整篇替换 → P4 课程机制 + `00-welcome` 到 `16-capstone`（16 个单元，97 / 97 个文件）→ P5 原生层前端 → P9 长尾字段 → P8 英文 e2e 回归 → P10 整体复查（术语纠偏 + 学院页补全 + 动态拼接句）→ P11 新建负载测试/服务器场景清理（新审计工具 `audit.mjs`/`lookup.mjs`）→ **P12 折叠区与 Rust 侧文案（审计器补三个盲区，`rust.mjs` 首轮 1424 → 1310）**。

## 队列（从上往下做，一次一项）

### A. 课程翻译（已完成，97 / 97）

按单元顺序，每轮 1–2 个单元。每个单元：`unit.yaml` + 若干 md。

- [x] `00-welcome`（4/4）
- [x] `01-networks`（5/5）
- [x] `02-dns`（5/5）
- [x] `03-http`（6/6）
- [x] `04-data`（7/7）
- [x] `05-auth`（8/8）
- [x] `06-tls`（5/5）
- [x] `07-organize`（5/5）
- [x] `08-testing`（8/8）
- [x] `09-beyond-rest`（6/6）
- [x] `10-realtime`（7/7）
- [x] `11-sockets`（5/5）
- [x] `12-mocking`（8/8）
- [x] `13-performance`（5/5）
- [x] `14-automate`（4/4）
- [x] `15-mcp`（6/6）
- [x] `16-capstone`（3/3）

**完成标准**：`node i18n/tools/course.mjs` 该单元打勾，且**没有 YAML 体检告警**（工具会直接指出「值以指示符开头却没加引号」的行）；`cargo test -p zorvik-academy` 通过（中文课程要能过解析）；实验里的 `check` / `solution` 未被改动。

**后续**：全部单元已译完。只有在合并上游后 `course.mjs` 回落到 97 以下时才需要补译，按 `--missing` 清单做即可。

**做法**：读 `crates/academy/course/<单元>/<文件>`，把译文写到 `crates/academy/course.zh-CN/<单元>/<文件>`（相对路径必须一致）。只翻 `title`/`summary`/`question`/`options`/`explain`/lab 的 `title`/`goal`/步骤/提示/正文。

### B. 原生层（L3，前端部分完成）

- [x] `app/src/lib/platform.ts`：对话框标题、过滤器名、浏览器回退提示统一走 `t()`
- [x] `app/src/lib/encoders.ts`：`Intl.RelativeTimeFormat` 跟随语言，"now" 走词典
- [x] ~~`crates/api/src/updates.rs`~~：该文件不存在。更新提示实际在 `app/src/components/modals/UpdateSettings.tsx` 与 `UpdateNotice.tsx`（React），静态文案由 DOM 层覆盖；`Up to date (checked …)` 这类动态拼接句待补 `patterns.json`
- [x] ~~`app/src-tauri/src/lib.rs` 的 macOS 菜单~~：评估后保持英文——Rust 侧没有运行时语言开关，预定义项（关于/隐藏/最小化…）本就跟随 macOS 系统语言，硬编码中文会让英文构建也变中文
- [x] ~~`app/src-tauri/tauri.conf.json` 的窗口标题~~：`Zorvik` 是产品名，按术语表不译

**完成标准**：每处改动后 `npx tsc -b`（前端）或 `cargo build --workspace`（Rust）通过；英文模式下行为不变。

### C. 长尾界面字段（本轮完成两批）

- [x] HTTP 状态码下拉的 18 条原因短语（`Created` 到 `Gateway Timeout`）
- [x] 通用长尾标签 14 条（`Warning` / `Caution` / `Important` / `Cookies` / `Later` / `What's new` / `Restart now` / `Remove row` / `Write docs` / `Keep editing` / `Body` / `Expires` / `Issued at` / `Not before`）
- [x] P10 复查：学院页段位/徽章/动态短语、命令面板对象字面量、CodeMirror 占位符、117+30+3+1 条动态拼接模板（未译 180 → 176）
- [x] P11 新建负载测试/服务器场景（审计器升级，未译 545 → 83）
- [x] P12 折叠区（匹配条件/应答序列/故障注入/工具页）+ Rust 侧首批 114 条（1424 → 1310）
- [x] P13 顶栏「中 / EN」语言开关（可逆 DOM 翻译 + 文档跟随 + 记忆），vitest 448 → 452
- [x] P14 版本 0.3.2 + 本地 NSIS 安装包与绿色版；要发 GitHub Release 就打 `zh-v0.3.2` 标签
- [ ] 继续补 Rust 侧剩余 1310 条：优先 `crates/workspace`（文件/YAML/Git 报错）与 `crates/engine`（请求失败原因），`node i18n/tools/rust.mjs` 按目录分批；`#[cfg(test)]` 里的夹具跳过
- [ ] 剩余 176 条未译里，绝大多数是格式名、协议名、语言名与静态扫描误抓的代码片段（`HTTP/3`、`Kotlin`、`) : sse ? (`），可翻整句已基本清完；后续写新功能或合并上游后按 `--missing` 抽查即可
- [ ] 已知故意保留英文：`Body` / `Headers` / `XP` / 段位与徽章以外的 HTTP 状态名 / canvas 结业证书 / macOS 菜单。新增文案时别"顺手"把它们译了

**做法**：`node i18n/tools/extract.mjs --missing 200`，先 grep 掉代码特征行（`=>`、`?`、以标点开头），再逐个确认上下文，避免把多义词（如 `Headers`、`OK`）误翻到别的界面。

### D. 英文回归（已完成）

- [x] Chromium 已装（`npx playwright install chromium`，走 `127.0.0.1:7890`）
- [x] `VITE_ZORVIK_LOCALE=en npx playwright test`：**73 passed**（3.9 分钟，22 个 spec，0 失败）

## 每轮结束必须做的两件事

1. 更新本文的勾选与「当前状态」表里的数字。
2. 在 `i18n/README.md` 第 7 节追加一小段（日期 + 做了什么 + 数字）。

这样即使会话突然断掉，下一个人（或下一次的自己）读 `SKILL.md → NEXT.md → README.md` 就能接上。

## 交接备忘

- 后台进程：Vite `14200`、devbridge `18799`。重编 Rust 前先停 devbridge，否则 `os error 5`。
- 依赖下载走代理 `127.0.0.1:7890`（地址在 `~/.cargo/config.toml`）；代理关掉时 cargo / playwright 会连接被拒。
- 不要 `git commit`，除非用户明确要求。
- 课程 YAML 的值只要以 YAML 指示符开头（反引号、`*`、`&`、`@`、`%`、`?`、`-`、`:`、`{`、`[`），就必须用双引号包起来，否则解析直接失败。中文句子以标点或反引号开头很常见（例如「`Content-Type` 和 `content-type`…」、以「?」开头的解释），**一律加双引号最省事**。翻完先跑 `cargo test -p zorvik-academy --test i18n_zh`，报错会给准确行号。
- 详细命令、坑、术语表见 `i18n/README.md` 与技能文件，不要在这里复制。
