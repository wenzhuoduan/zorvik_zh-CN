# Agent instructions

For Codex, Cursor, Antigravity, GitHub Copilot and any other agent that reads `AGENTS.md`.

Read [PROJECT.md](PROJECT.md) before you start and follow it: it holds every rule of this repository (what Zorvik promises, where code belongs, commands, tests, docs, security, Git). Keep this file a pointer: record rules and notes in PROJECT.md.

**This fork translates the UI into Chinese.** Read [i18n/README.md](i18n/README.md) before touching anything user-facing: translations live in `app/src/i18n/locales/zh-CN/`, upstream English strings stay untouched, and `node i18n/hooks/apply.mjs` re-applies the single hook after merging upstream. Continue from [i18n/NEXT.md](i18n/NEXT.md) (the task queue) or load the `zorvik-zh-cn-localization` project skill in `.codebuddy/skills/`.
