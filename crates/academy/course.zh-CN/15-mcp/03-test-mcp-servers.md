---
id: test-mcp-servers
title: 测试 MCP 服务器
summary: 检查工具是否以有用的方式失败、结果是否符合它的输出 schema，并把这些检查当成集合来跑，CI 里也一样。
minutes: 6
added: 0.2.0
lab:
  title: 货币检查
  goal: 找出一个货币工具失败时的样子，测试它的结构化结果，再跑一个装满 MCP 检查的文件夹。
  minutes: 8
  servers:
    currency:
      name: Currency tools
      kind: mcp
      mcp:
        tools:
          - name: convert
            description: Convert an amount of money from one currency to another.
            inputSchema: '{"type": "object", "properties": {"amount": {"type": "number"}, "from": {"type": "string"}, "to": {"type": "string"}}, "required": ["amount", "from", "to"]}'
            outputSchema: '{"type": "object", "properties": {"amount": {"type": "number"}, "currency": {"type": "string"}}, "required": ["amount", "currency"]}'
            result: '{"amount": 1150.5, "currency": "{{args.to}}"}'
  files:
    requests/MCP checks/_folder.yaml: |
      name: MCP checks
      seq: 93
    requests/MCP checks/Convert.yaml: |
      name: Convert
      seq: 1
      kind: mcp
      url: {{currency}}
      mcp:
        name: convert
        arguments: '{"amount": 100, "from": "EUR", "to": "NOK"}'
      scripts:
        postResponse: |
          const answer = pm.response.json();
          pm.test("The call worked", () => pm.expect(answer.isError).to.not.eql(true));
          pm.test("Structured result in NOK", () => pm.expect(answer.structuredContent.currency).to.eql("NOK"));
    requests/MCP checks/Missing argument.yaml: |
      name: Missing argument
      seq: 2
      kind: mcp
      url: {{currency}}
      mcp:
        name: convert
        arguments: '{"amount": 100}'
      scripts:
        postResponse: |
          const answer = pm.response.json();
          pm.test("Fails as a tool result", () => pm.expect(answer.isError).to.eql(true));
          pm.test("Says what is missing", () => pm.expect(answer.content[0].text).to.include("from"));
    requests/MCP checks/Unknown tool.yaml: |
      name: Unknown tool
      seq: 3
      kind: mcp
      url: {{currency}}
      mcp:
        name: convert_all
      scripts:
        postResponse: |
          pm.test("A JSON-RPC error", () => {
            pm.response.to.have.status(500);
            pm.expect(pm.response.json().error.code).to.eql(-32602);
          });
  steps:
    - text: |
        新建一个指向 `{{currency}}` 的 **MCP 调用（AI 工具）**，只带 `{"amount": 100, "from": "EUR"}` 调用工具 `convert`。看结果：工具确实回答了，但是以 **失败的调用**（isError）形式，文字里点名缺了什么。
      hints:
        - "在工具字段里输入 convert（或者先连接，在服务器标签里选中它），然后设置参数。"
        - "参数 {\"amount\": 100, \"from\": \"EUR\"}，然后发送。结果里会出现一条红色提示：工具报告它失败了。"
        - "结果是这样：{\"content\": [{\"type\": \"text\", \"text\": \"Missing required argument: to\"}], \"isError\": true}。"
      check:
        send: { kind: mcp, json: { isError: true } }
      solution:
        - send: { kind: mcp, url: "{{currency}}", mcp: { call: tool, name: convert, arguments: '{"amount": 100, "from": "EUR"}' } }
    - text: |
        加上 `"to": "NOK"`，再写一个测试。在 **脚本 → 响应后** 里写：

        ```js
        pm.test("Structured result in NOK", () => {
          pm.expect(pm.response.json().structuredContent.currency).to.eql("NOK");
        });
        ```

        按 **发送**。这个工具有 **输出 schema**，所以它的回答还会以 `structuredContent` 的形式给出，也就是程序（或你的测试）不用解析文本就能读的 JSON。
      hints:
        - "对 MCP 调用来说，pm.response.json() 就是这次调用的结果：content、structuredContent 和 isError。"
        - "参数 {\"amount\": 100, \"from\": \"EUR\", \"to\": \"NOK\"}，把测试贴到脚本 → 响应后，发送。"
        - "结果旁边的测试标签会显示 Structured result in NOK 通过。"
      check:
        send: { kind: mcp, testsPassed: ">=1", testsFailed: 0, json: { structuredContent: { currency: NOK } } }
      solution:
        - send:
            kind: mcp
            url: "{{currency}}"
            mcp: { call: tool, name: convert, arguments: '{"amount": 100, "from": "EUR", "to": "NOK"}' }
            scripts:
              postResponse: |
                pm.test("Structured result in NOK", () => {
                  pm.expect(pm.response.json().structuredContent.currency).to.eql("NOK");
                });
    - text: |
        实验加了一个文件夹 **MCP checks**，里面有三个调用和它们的测试：一个正常调用、一个缺参数、一个不存在的工具。右键这个文件夹 → **运行…**，按 **运行**。所有测试都该通过。
      hints:
        - "集合运行会把每个 MCP 调用一口气做完（连接、调用、断开），并运行它的测试，就像 CI 里的 zorvik run 那样。"
        - "在侧栏右键 MCP checks，选运行…，然后运行。"
        - "三个请求、六个测试，全绿：服务器该失败的地方失败得恰到好处。"
      check:
        run: { name: MCP checks, requests: 3, failed: 0, testsFailed: 0 }
      solution:
        - call: { method: runner.start, params: { folder: MCP checks } }
        - wait: 800
quiz:
  - question: 工具收到了没法用的参数。它该怎么回答？
    options:
      - 返回一个标记为 isError 的结果，用文字说明问题，这样模型能自己纠正
      - 直接关掉连接
      - 回一个空结果
    answer: 0
    explain: isError 结果会像普通回答一样到达模型，所以它能读到出了什么问题并再试。协议错误（比如未知工具）针对的是对话本身的错误。
  - question: "`structuredContent` 是干什么用的？"
    options:
      - 放图片
      - 符合工具输出 schema 的 JSON，供程序和测试在不解析文本的情况下读取
      - 工具自己的说明
    answer: 1
    explain: 带输出 schema 的工具会把结果同时以文本（给模型看）和符合 schema 的结构化 JSON 发出。
  - question: 怎样在 CI 里每次改动都跑 MCP 检查？
    options:
      - 做不到；MCP 需要 AI 应用
      - 对文件夹跑 zorvik run；如果服务器是运行时会启动的程序，加上 --allow-programs
      - 在 CI 机器上打开 Zorvik
    answer: 1
    explain: zorvik run 会像普通请求一样完成每个 MCP 调用并运行测试。只有当服务器是要由运行启动的程序时才需要 --allow-programs，因为工作区可能来自任何人。
---

测试 MCP 服务器，就是测试一个最重要的用户是模型的 API。它不会读你的文档，没法问同事，还会高高兴兴地换一组略有不同的参数再试一次。所以好的 MCP 测试要问：**每个工具是不是好输入就成功、坏输入就给出有用的失败，并且按承诺的形状作答？**

## 两种失败

| | 长什么样 | 意味着 | 模型会…… |
|---|---|---|---|
| **工具错误** | 一个带 `isError: true` 和文字的结果 | 工具跑了，但做不成（缺参数、找不到、被限流） | 读文字，然后修正调用 |
| **协议错误** | 一个带 `code` 的 JSON-RPC `error` | 请求本身就不对（未知工具、参数错误） | 通常没法自行恢复 |

Zorvik 把协议错误显示为状态 **500**（正文里带错误码和消息），把工具错误显示为状态 **200** 加一条红色提示，测试就能区分二者。

> [!note] 可以这样想……
> 店员说「42 码卖完了，43 码行不行？」（顾客能据此行动的工具错误），对比一扇锁着的门（协议错误）。

## 测模型真正依赖的东西

- **好输入能跑通**：调用成功，文字里给出模型需要的信息。
- **坏输入用文字说明失败**：缺参数或参数错误时给出 `isError`，消息里点名问题所在。
- **形状守得住**：工具声明了 **输出 schema** 时，回答里带着与之相符的 `structuredContent`。
- **够快**：慢工具会让 Agent 超时。每次调用的耗时显示在状态旁边。

对 MCP 调用来说，响应后脚本里的 `pm.response.json()` 就是这次调用的 **结果**（`content`、`structuredContent`、`isError`）；如果是协议错误，则是 `{"error": {code, message}}`：

```js
const answer = pm.response.json();
pm.test("Fails as a tool result", () => pm.expect(answer.isError).to.eql(true));
pm.test("Names the problem", () => pm.expect(answer.content[0].text).to.include("to"));
```

## 到哪儿都能跑

把调用存进一个文件夹，像跑任何集合一样跑它：右键 → **运行…**，或者在 CI 里：

```bash
zorvik run . --folder "MCP checks"
zorvik run . --folder "Local MCP" --allow-programs   # 服务器是程序时
```

每个调用都会连接、发起调用、断开，并运行它的测试。当请求会启动一个程序（本地 stdio 服务器）时，需要 `--allow-programs`：工作区来自 Git，所以除非你明确许可，Zorvik 绝不从这里启动程序。

## 什么时候用得上……

- 你发布一个 MCP 服务器，想让 CI 在用户 Agent 之前抓到坏掉的工具，
- 某个模型老是调错一个工具，你想看看工具的报错到底写了什么，
- 你改了工具的 schema，需要确认旧调用仍然以有用的方式失败。