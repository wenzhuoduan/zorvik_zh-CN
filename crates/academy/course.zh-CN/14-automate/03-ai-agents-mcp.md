---
id: ai-agents-mcp
title: 通过 MCP 使用 AI Agent
summary: Claude Code、Codex、Gemini CLI 这类编码 Agent 能在 Zorvik 里替你干活，而你在旁边看着，有风险的操作由你批准。
minutes: 6
quiz:
  - question: "`zorvik mcp` 是什么？"
    options:
      - Zorvik 里的一个聊天窗口
      - 一个在云端跑你测试的服务
      - AI Agent 为了使用 Zorvik 的工具而启动的 MCP 服务器，这些工具随后借 Zorvik App 生效
    answer: 2
    explain: Agent 会在你的电脑上启动 `zorvik mcp`。它连接到正在运行的 App（或者把它启动起来），所以 Agent 做的每件事都发生在你正看着的那个 App 里。
  - question: 一个 Agent 想向 `api.example.com` 发请求，这是你电脑和网络之外的主机。默认设置下会怎样？
    options:
      - 请求直接发出去，不询问
      - Agent 保持连接期间，Zorvik 会就这台主机问你一次
      - Agent 永远上不了网
    answer: 1
    explain: 发往你本机和私有网络的请求是允许的。外部主机则会先询问，每台主机、每个 Agent 会话问一次，所以 Agent 没法悄悄把你的数据发到新的地方。
  - question: Agent 能读到你的密钥 `apiKey` 的值吗？
    options:
      - 不能，Agent 看到的一切里密钥值都被遮蔽，设置和 Cookie 更是禁区
      - 能，Agent 看到所有变量的原值
      - 只要它好好问就行
    answer: 0
    explain: Agent 只和 `{{apiKey}}` 打交道，永远拿不到它的值。凭据也会从历史、服务器流量以及 Agent 读取的其他一切里剔除。
---

**AI 编码 Agent** 是在你的项目里干活、而不只是在聊天框里说话的 AI 助手：Claude Code、Codex、Gemini CLI、Cursor 等等都能读代码、跑命令、用工具。把 Zorvik 接上，它们也能用 *你的* 工作台。

## Agent 在 Zorvik 里能做什么

用大白话提要求，Agent 就能：

- **把代码里的 API 映射** 成一个集合：它读你的路由，每个端点存一个请求，
- **发送请求**，包括 GraphQL、gRPC、DNS 和事件流，并读取回答，
- **添加测试并运行集合**，然后修掉失败的地方，
- **搭 Mock 服务器**，启动它们并读取它们收到的内容，
- 创建并运行 **负载测试**，导入 OpenAPI 文档，把请求导出成代码。

可以试试这么说：*「把这个仓库里的 API 映射成一个 Zorvik 集合，然后运行它们。」* 在 Claude Code 里，现成的命令 `/mcp__zorvik__map_apis` 会启动一套引导式的代码库映射。

## 它是怎么连上的

Agent 通过 **MCP**（模型上下文协议）和工具对话，这是一个把工具接入 AI 助手的开放标准。`zorvik mcp` 命令就是 Zorvik 的 MCP 服务器：

```sequence
participants: 你, Agent, Zorvik
你 -> Agent: 跑 Users 文件夹，把失败的地方修好
Agent -> Zorvik: 通过 zorvik mcp 调用 run_collection
Note over Zorvik: 实时展示，有风险就先问你
Zorvik --> Agent: 12 个通过，2 个失败
Agent --> 你: 两个测试失败了；这是修复方案
```

`zorvik mcp` 通过你自己电脑上的一条私有连接与 App 通信，所以 Agent 就在你正看着的那个 Zorvik 里干活。

Agent 只需连接一次。**设置 → AI Agent → 连接 Agent** 会显示适合你这台电脑的具体命令，例如：

```bash
claude mcp add --scope user zorvik -- zorvik mcp       # Claude Code
codex mcp add zorvik -- zorvik mcp                     # Codex
gemini mcp add --scope user zorvik zorvik mcp          # Gemini CLI
```

Cursor、VS Code 之类的其他工具，则是在它们的 MCP 设置里填一小段 JSON；同一个页面也会显示。

> [!note] 可以这样想……
> 一个新来的助理，拿着门禁卡。工作需要的房间他能自己进，但金库、老板办公室和通往街上的门得有人给他开门，而且他做的一切都在摄像头下。

## 拍板的人还是你

Agent 做的每件事都会实时显现：标题栏会写出连上的是哪个 Agent，左侧栏的 **AI Agent** 分区列出每一个操作；打开 **跟随 Agent** 后，Zorvik 会自动打开 Agent 正在处理的东西。

有些操作会先问你，对话框里会写明是哪个 Agent、它具体想做什么，并给出 **拒绝** 和允许按钮（某些操作还有 **本次会话允许**）。一分钟内不回答，就当作拒绝。

| 操作 | 会怎样 |
|---|---|
| 读取请求、环境、历史 | 允许 |
| 创建和修改请求、文件夹、环境 | 允许，或者先问你（**Agent 的修改**） |
| 发往你本机或私有网络的请求 | 允许 |
| 发往外部主机的请求 | 每台主机问一次（**Agent 发出的请求**） |
| 删除、负载测试、启动服务器、打开工作区 | 每次都问 |

密钥值、设置和 Cookie 永远不会对 Agent 开放，凭据也会从它能读到的所有内容里剔除。打开 **在应用未打开时工作** 后，Agent 可以在 App 关闭时于后台使用 Zorvik，但那时没人能批准任何事，所以凡是本该询问的操作都会被拒绝。

> [!warning] 批准之前先看清楚
> Agent 会出错，网页或 API 回答里甚至可能藏着想骗它的指令。批准对话框就是你抓这种事的关口：核对主机、对象和操作，看着不对劲就选 **拒绝**。事后，像审同事的改动一样，在 Git 里审一遍 Agent 保存的东西。

**什么时候用得上：** 你加入一个项目，里面有四十个没写文档的端点。你的 Agent 几分钟就把它们映射成集合，加上测试并运行，而你只需批准那几个要紧的步骤，然后审一遍结果。