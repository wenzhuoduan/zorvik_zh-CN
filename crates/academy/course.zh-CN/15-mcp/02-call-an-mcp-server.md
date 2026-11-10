---
id: call-an-mcp-server
title: 调用 MCP 服务器
summary: 连上 MCP 服务器，看它的工具、资源和提示词，并用你自己的参数逐个调用。
minutes: 5
added: 0.2.0
lab:
  title: 气象服务台
  goal: 连上一个天气 MCP 服务器，调用它的工具、读取一个资源、取一条提示词，就像 AI 应用那样。
  minutes: 8
  servers:
    weather:
      name: Weather tools
      kind: mcp
      mcp:
        instructions: Use get_forecast for the weather in a city. Station readings are resources.
        tools:
          - name: get_forecast
            description: The weather forecast for a city.
            inputSchema: '{"type": "object", "properties": {"city": {"type": "string", "description": "City name"}}, "required": ["city"]}'
            result: '{"city": "{{args.city}}", "forecast": "sunny", "ticket": "{{secret.ticket}}"}'
        resources:
          - { uri: "docs://stations", name: stations, mimeType: text/plain, text: "Stations: Oslo, Lisbon, Nairobi." }
          - { uri: "stations://{name}", name: station reading, text: "Station {{params.name}} reads {{secret.reading}}." }
        prompts:
          - name: packing_list
            description: What to pack for a trip
            arguments: [{ name: city, required: true }]
            messages: [{ role: user, text: "What should I pack for {{args.city}}?" }]
  steps:
    - text: |
        点标签栏末尾的 **+**，选 **MCP 调用（AI 工具）**。在 URL 栏填入 `{{weather}}`。在结果面板里按 **连接**，然后打开它的 **服务器** 标签：服务器的工具、资源和提示词就列在那里，和 AI 应用看到的一样。
      hints:
        - "通过 HTTP 访问的 MCP 服务器地址以它的端点结尾，这里是 /mcp。连接会开启一个会话：先是 initialize 握手，然后是各种列表。"
        - "+ 在标签栏里 → MCP 调用（AI 工具），粘贴 {{weather}}，然后在结果面板顶部按连接。"
        - "连接之后，面板会显示 Weather tools 及其版本和传输方式。它的服务器标签里列出 get_forecast、stations 资源和 packing_list。"
      check:
        call: { method: mcp.connect, ok: true }
      solution:
        - call: { method: mcp.connect, params: { connId: lab-mcp, path: null, request: { name: Weather, kind: mcp, url: "{{weather}}" } } }
    - text: |
        在 **服务器** 标签里点 **get_forecast**。**调用** 标签现在会显示它的说明和参数，参数会按它的输入 schema 打底。把 `"city"` 设为 `"Oslo"`，按 **发送**。回答里有一个 `ticket`：把它填在这里。
      hints:
        - "工具的参是一个 JSON 对象。输入 schema 说明 city 是必填的，类型是文本。"
        - "在服务器标签里点 get_forecast，把参数改成 {\"city\": \"Oslo\"}，按发送（⌘/Ctrl + Enter）。"
        - "结果标签会显示工具返回的文字：{\"city\": \"Oslo\", \"forecast\": \"sunny\", \"ticket\": …}。把 ticket 的值抄下来。"
      check:
        all:
          - message: { server: weather, summary: tools/call get_forecast }
          - answer: "{{secret.ticket}}"
      solution:
        - send: { kind: mcp, url: "{{weather}}", mcp: { call: tool, name: get_forecast, arguments: '{"city": "Oslo"}' } }
        - answer: "{{secret.ticket}}"
    - text: |
        资源是按 URI 读取的。`stations://{name}` 是一个 **模板**：把调用标签切到 **资源**，选中它，把参数设为 `{"name": "Lisbon"}`，按 **发送**。Zorvik 会把 URI 填好（`stations://Lisbon`）。把读数填在这里。
      hints:
        - "模板里的 {parts} 会在发出 resources/read 调用之前用参数填好。"
        - "调用 → 资源，名称 stations://{name}（输入框会提示），参数 {\"name\": \"Lisbon\"}，发送。"
        - "结果标签会显示资源的文字：Station Lisbon reads …。把 reads 后面的内容填进来。"
      check:
        all:
          - message: { server: weather, summary: "resources/read stations://*" }
          - answer: "{{secret.reading}}"
      solution:
        - send: { kind: mcp, url: "{{weather}}", mcp: { call: resource, name: "stations://{name}", arguments: '{"name": "Lisbon"}' } }
        - answer: "{{secret.reading}}"
    - text: |
        提示词是让人在 AI 应用里挑选的模板。切到 **提示词**，选 **packing_list**，给它一个 `city`，按 **发送**：回答就是应用会交给模型的消息。然后打开 **消息** 标签，看你这个会话里每一条 JSON-RPC 消息，两个方向都在。
      hints:
        - "提示词的参数是文本。回答里是带 role 和 content 的消息。"
        - "调用 → 提示词，名称 packing_list，参数 {\"city\": \"Nairobi\"}，发送。"
        - "结果标签会显示一条 user 消息：What should I pack for Nairobi?"
      check:
        message: { server: weather, summary: prompts/get packing_list }
      solution:
        - send: { kind: mcp, url: "{{weather}}", mcp: { call: prompt, name: packing_list, arguments: '{"city": "Nairobi"}' } }
quiz:
  - question: MCP 客户端连上之后、还没调用任何工具时，第一件事做什么？
    options:
      - 什么也不做，直接调工具
      - "initialize：双方就协议版本达成一致，并说明各自支持什么"
      - 它下载服务器的源码
    answer: 1
    explain: 每个会话都从 initialize 开始。服务器回答自己的名称、版本、能力和可选的 instructions；然后客户端再列出它需要的东西。
  - question: 一次工具调用需要 `city`，但你发的参数是 `{}`。一个写得好的服务器该怎么回答？
    options:
      - 一条标明调用失败（isError）的结果，并指出缺了哪个参数，这样模型能改对再试
      - 什么也不回，它应该等
      - 随便一个城市
    answer: 0
    explain: 工具失败会以带 isError 的结果返回，用模型能据此行动的措辞说明。Agent 就是这样从自己的错误里恢复的。
  - question: 什么时候资源 URI 是模板？
    options:
      - 以 https 开头时
      - "含有 {parts}（例如 users://{id}）并在读取前被填好时"
      - 永远不会；资源不能带参数
    answer: 1
    explain: 模板一次描述许多资源。客户端把各部分填进去，然后读取那个具体的 URI。
---

想知道一个 MCP 服务器能干什么，不一定非得有 AI 应用。Zorvik 本身也是一个 **MCP 客户端**：它连上服务器，显示它提供的东西，并用你选的参数发起和 AI 应用相同的调用。

## MCP 请求的解剖

Zorvik 里的一个 **MCP 调用** 就是普通请求：存进集合，用 **发送** 发出，用脚本测试。

```anatomy
http://localhost:3000/mcp | 地址：一个 URL，或启动本地服务器的命令
Call: Tool get_forecast | 调什么：工具、资源 URI 或提示词
{"city": "{{city}}"} | 参数，JSON 形式，可带变量
```

- **地址** 是服务器的 URL；如果是跑在你电脑上的服务器，则是启动它的命令（比如 `npx -y @modelcontextprotocol/server-everything`）。Zorvik 据此选择传输方式：`http(s)://` 走 HTTP，其他情况当作程序走 stdio。
- **调用** 是要做什么：调用 **工具**、读取 **资源**，或取一条 **提示词**。
- **参数** 是 JSON。工具的输入 schema 说明它接受哪些参数。

## 一个会话，还是一次调用

在结果面板里按 **连接**，开启一个 **会话**。Zorvik 完成握手，并在 **服务器** 标签里列出服务器提供的一切。在那里点一个工具，调用标签就会填好它的名称、显示它的说明和参数，并按 schema 给参数打底，你就不用猜了。

会话开着时，**发送** 就在这个会话上调用；没有会话时，发送会先连接、再调用、然后断开。集合运行和 `zorvik run` 做的也是这件事。

```sequence
participants: Zorvik, 服务器
Zorvik -> 服务器: initialize
服务器 --> Zorvik: Weather tools 1.0.0，tools + resources + prompts
Zorvik -> 服务器: tools/list, resources/list, prompts/list
服务器 --> Zorvik: 目录
Zorvik -> 服务器: tools/call get_forecast {"city": "Oslo"}
服务器 --> Zorvik: content，或 isError
```

## 读回答

- **结果** 按 AI 应用会收到的样子显示回答：文本（里面的 JSON 会格式化）、图片、内嵌资源和 `structuredContent`。**JSON** 显示原始结果。
- 失败的工具会用 **isError** 作答：一个普通结果，用文字说明出了什么问题。服务器完全处理不了的请求（未知工具、参数错误）会得到一个带错误码的 **JSON-RPC 错误**；Zorvik 把它显示为状态 500。
- **消息** 列出会话里的每一条 JSON-RPC 消息，两个方向都有；本地服务器还会附上程序自己的日志行。

> [!tip] 服务器说明
> 有些服务器会在你连接时发来 **instructions**：给模型看的使用提示。它们会显示在服务器标签的顶部。

## 什么时候用得上……

- 你想在把某个服务器接进 AI 应用之前，先弄清楚它到底提供什么，
- 某个 Agent 说工具失败了，你想自己发起同样的调用，
- 你需要一次可复现的调用，写进测试或 bug 报告里。