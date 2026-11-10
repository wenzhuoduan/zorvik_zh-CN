---
id: build-an-mcp-server
title: 为 AI 应用搭一个 MCP 服务器
summary: 在 Zorvik 里做一个带工具、资源和提示词的 MCP 服务器，用来和真实 AI 应用验证想法，或者拿它测一个 MCP 客户端。
minutes: 5
added: 0.2.0
lab:
  title: 一个记事服务器
  goal: 搭一个带工具和资源的 MCP 服务器，启动它，让实验像 AI 应用那样连上去。
  minutes: 8
  steps:
    - text: |
        在左侧栏打开 **服务器**，点 **＋**，选 **MCP 服务器**。命名为 **Notes**，按 **创建**。它自带一个示例工具、一个示例资源和一个示例提示词。
      hints:
        - "服务器像请求一样保存在工作区里。MCP 服务器这个类型提供工具、资源和提示词。"
        - "服务器 → ＋ → MCP 服务器 → 输入 Notes → 创建。"
        - "新服务器会在一个标签页里打开，自带 get_weather 工具、docs://readme 资源和 plan_trip 提示词。"
      check:
        saved:
          server: { name: Notes, kind: mcp }
      solution:
        - call:
            method: server.create
            params:
              server:
                name: Notes
                kind: mcp
                port: 0
                mcp:
                  tools:
                    - name: get_weather
                      description: The current weather in a city.
                      inputSchema: '{"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}'
                      result: '{"city": "{{args.city}}", "forecast": "sunny"}'
    - text: |
        把它改成一个记事服务器。把工具名称改成 `add_note`，说明改成 `Save a note for later`，**输入 schema** 改成：

        ```json
        {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}
        ```

        把它的 **结果** 设为 `Saved: {{args.text}}`。按 **启动**：实验会通过 MCP 连到你的服务器，列出它的工具并调用 `add_note`，就像 AI 应用那样。
      hints:
        - "结果里的 {{args.text}} 会被客户端发来的参数替换。"
        - "编辑第一张工具卡片：名称 add_note，schema 用上面那段，结果 Saved: {{args.text}}。然后在右上角按启动。"
        - "工具 add_note，输入 schema 里 text 必填，结果 Saved: {{args.text}}，服务器运行中。实验会用文本 hello 调用它。"
      check:
        probe:
          kind: mcp
          name: Notes
          method: tools/call
          body: '{"name": "add_note", "arguments": {"text": "hello"}}'
          expect:
            result: { content: [{ text: "Saved: hello" }] }
      solution:
        - call:
            method: server.save
            params:
              id: Notes
              server: &notes2
                name: Notes
                kind: mcp
                port: 0
                mcp:
                  tools:
                    - name: add_note
                      description: Save a note for later
                      inputSchema: '{"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}'
                      result: "Saved: {{args.text}}"
        - call:
            method: server.start
            params: { id: Notes, server: *notes2 }
    - text: |
        也给 AI 应用一点可读的东西。在 **资源** 下把 URI 设为 `notes://today`，文本设为 `Buy milk`。运行中的服务器会立刻接收这个改动，并通知已连接的客户端：列表变了。
      hints:
        - "资源就是一个 URI 加它的内容。客户端列出资源，读取自己需要的那些。"
        - "资源那一节：URI 填 notes://today，文本填 Buy milk。服务器保持运行。"
        - "实验会从你的服务器读取 notes://today，并期望得到 Buy milk。"
      check:
        probe:
          kind: mcp
          name: Notes
          method: resources/read
          body: '{"uri": "notes://today"}'
          expect:
            result: { contents: [{ text: "*milk*" }] }
      solution:
        - call:
            method: server.save
            params:
              id: Notes
              server:
                name: Notes
                kind: mcp
                port: 0
                mcp:
                  tools:
                    - name: add_note
                      description: Save a note for later
                      inputSchema: '{"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}'
                      result: "Saved: {{args.text}}"
                  resources:
                    - { uri: "notes://today", name: today, text: Buy milk }
    - text: |
        你电脑上的 AI 应用也能把服务器当作程序启动，通过 stdio 和它对话。看这个服务器的 **客户端** 一节：是哪个 `zorvik` 命令做到了这点？填在这里（工作区路径前面那部分就够）。
      hints:
        - "本地 AI 应用通常把 MCP 服务器当作程序启动。Zorvik 的命令行也能用这种方式提供 MCP 服务器。"
        - "客户端这一节会显示一个以 zorvik serve 开头的命令。"
        - "zorvik serve <workspace> \"Notes\" --stdio"
      check:
        answer: ["zorvik serve*", "*--stdio*"]
      solution:
        - answer: "zorvik serve"
quiz:
  - question: 为什么先在 Zorvik 里搭一个 MCP 服务器，而不是直接写代码？
    options:
      - 几分钟内就能用真实 AI 应用试工具、说明和回答，还能拿可预测的回答来测 MCP 客户端
      - 因为 MCP 服务器没法用代码写
      - 让 AI 模型更快
    answer: 0
    explain: Mock 服务器让你在动手实现之前先把工具的形状定下来，也能给你的客户端（App 或 Agent）一个你能控制的回答，包括失败和延迟。
  - question: 工具的回答怎么用上调用时传入的参数？
    options:
      - 做不到；回答是固定的
      - "用 {{args.city}} 这样的模板，或者用 {{args}} 一次拿到全部参数的 JSON"
      - 只能靠脚本
    answer: 1
    explain: "结果、资源文本和提示词消息都是模板。{{args.name}} 是某一个参数；资源模板用 {{params.name}}。"
  - question: 你改动了一个正在运行的服务器上的工具。已连接的客户端会怎样？
    options:
      - 必须重连才能看到改动
      - 服务器会通知它们工具列表变了，它们重新列一遍
      - 什么也不会发生，除非服务器重启
    answer: 1
    explain: 服务器会向持有开放流的客户端发送 notifications/tools/list_changed。Zorvik 自己的 MCP 客户端收到后就会刷新服务器标签。
---

**在 Zorvik 里搭的 MCP 服务器** 和真的一样作答，只不过靠的是设置而不是代码：带输入 schema 和回答的工具、资源，以及提示词。它支持所有传输方式，任何 AI 应用或 MCP 客户端都能用：**Streamable HTTP** 在 `http://127.0.0.1:<port>/mcp`，更早的 **HTTP+SSE** 在 `/sse`，应用把它当程序启动时走 **stdio**。

## 为什么要 Mock 一个 MCP 服务器？

- **用真实 AI 应用验证想法。** 写一段工具说明和一个示例回答，连上 Claude 或你的 IDE，看模型会不会如你所愿挑中这个工具、把参数填对。改改说明再试一次，一行代码都不用写。
- **测一个 MCP 客户端或 Agent。** 你的 App 面对的服务器只回你设定的东西：正常路径、失败的调用（`isError`）、慢工具（延迟）、缺参数。
- **真服务器挂了、或者还没生出来的时候也能继续干活。**

```flow
AI 应用或你的客户端 -[MCP]-> Zorvik MCP 服务器
Zorvik MCP 服务器 -> 流量面板：每个请求和回答
```

## 需要设置什么

| 部分 | 里面有什么 |
|---|---|
| **工具** | 名称、说明、输入 schema、结果（文本或 JSON）、可选的输出 schema、「以失败的调用作答」、延迟 |
| **资源** | URI（模板用 `{parts}`）、名称、MIME 类型、文本 |
| **提示词** | 名称、参数、消息（user 或 assistant） |
| **简介** | 客户端看到的名称和版本，以及给模型的 instructions |
| **客户端** | 端点路径、给浏览器客户端的 CORS |

回答都是 **模板**：`{{args.city}}` 是某一个参数，`{{args}}` 是全部参数的 JSON，`{{params.id}}` 是资源模板 URI 的某一段。动态变量（`{{$uuid}}`）和环境变量也能用。缺了必填参数，就会像谨慎的服务器那样，以失败的调用作答。

> [!note] 可以这样想……
> 一个舞台布景：从观众席（AI 应用）看过去，它就是一间真房间。幕后没什么可搭、也没什么可坏，而且场次之间你还能挪墙。

## 连接 AI 应用

大多数 AI 应用接受一个 URL 或命令作为 MCP 服务器。服务器跑起来后，把地址交给应用：

```json
{ "mcpServers": { "notes": { "url": "http://127.0.0.1:3004/mcp" } } }
```

或者让应用把它作为程序启动，走 stdio：

```json
{ "mcpServers": { "notes": { "command": "zorvik", "args": ["serve", "/path/to/workspace", "Notes", "--stdio"] } } }
```

每条消息都会出现在服务器的 **流量** 面板里，和人使用时一样，所以你能确切看到模型请求了什么。运行中改工具，已连接的客户端会收到列表变更通知。

## 什么时候用得上……

- 你在为某个 AI 功能设计工具，想先用真实模型试试这些说明，
- 你在搭一个 Agent，需要一个回答（和失败）都由你掌控的服务器，
- 一场演示或工作坊需要一个每次都一样作答的 MCP 服务器。