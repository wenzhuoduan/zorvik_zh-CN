---
id: websocket-workflows
title: WebSocket 工作流
summary: 把常发的消息存起来，让 Zorvik 每次连接都跑同一套流程，把回复和请求配对，并把等待变成测试。
minutes: 6
added: 0.3.0
lab:
  title: 取号台的标准流程
  goal: 把回复和请求配对，存一套「连接后自动发消息并等待」的流程，把它当测试跑，最后维持心跳并用自己的关闭码挂断。
  minutes: 12
  servers:
    desk:
      name: 取号台
      kind: websocket
      websocket:
        mode: rules
        greeting: '{"type": "welcome", "desk": "tickets"}'
        rules:
          - { match: json, pattern: '$.op == "bye"', reply: '{"type": "bye"}', close: 4001 }
          - { match: exact, pattern: ping, reply: pong }
          - { match: json, pattern: $.id, reply: '{"id": {{message.id}}, "ticket": "{{secret.word}}"}', delayMs: 150 }
          - { match: any, reply: '{"error": "Send JSON with a number id, such as {\"id\": 1, \"op\": \"open\"}"}' }
  steps:
    - text: |
        实验里的 **取号台** 只应答带 `id` 的 JSON 消息。点标签栏末端的 **+**，选 **WebSocket**，地址填 `{{desk}}`，按 **连接**。取号台会跟你打招呼。

        把输入区切到 **JSON**，发送 `{"id": 1, "op": "open"}`。回答里带着同一个 `id`，它的绿色小标签会显示花了多久。
      hints:
        - "取号台只应答带数字 id 的 JSON 消息；别的东西只会拿到一条短错误。"
        - "连上 {{desk}}，在输入区（文本旁边）选 JSON，粘上消息按发送。"
        - "发 {\"id\": 1, \"op\": \"open\"}。大约 150 毫秒后 {\"id\": 1, \"ticket\": …} 到达，带一个 ↩ 标签；点它能看出它在应答哪条消息。"
      check:
        message: { server: desk, direction: in, text: '*"id"*' }
      solution:
        - call: { method: ws.connect, params: { connId: lab-ws, request: { name: Ticket desk, kind: websocket, url: "{{desk}}" } } }
        - call: { method: ws.send, params: { connId: lab-ws, message: { type: text, text: '{"id": 1, "op": "open"}' } } }
        - wait: 300
    - text: 取号台的回答里有你的号牌。把它填在这里。
      hints:
        - "看最新那条带蓝色箭头（收到）的消息。"
        - "它写着 {\"id\": 1, \"ticket\": \"…\"}。在服务器里打开 Lab · 取号台，它的流量里是同一个回答。"
        - "复制 ticket 的值，不要引号。"
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
    - text: |
        把它做成一套流程。在 **消息** 标签页点 **添加消息**，命名 `Open ticket`，格式选 **JSON**，内容写 `{"id": 2, "op": "open"}`。

        然后在 **连接后** 标签页里，**添加步骤 → 发送已保存的消息**（Open ticket），再 **添加步骤 → 等待一条消息**，条件选 **JSON where**，写 `$.id == 2`。把请求保存为 **Ticket desk**（**⌘/Ctrl + S**），按 **断开**，再按 **连接**。每一步执行时日志都会记下来。
      hints:
        - "连接后步骤在每次连接之后按顺序执行。等到取号台对 2 号消息的回答到达，这一步就算通过。"
        - "消息 → 添加消息（名字 Open ticket，JSON）。连接后 → 添加步骤 → 发送已保存的消息，再 添加步骤 → 等待一条消息，JSON where，$.id == 2。"
        - "保存为 Ticket desk，重连，然后在日志里找「连接后：已发送 Open ticket」和「连接后：收到 JSON 消息，条件 $.id == 2」。"
      check:
        all:
          - saved:
              request:
                kind: websocket
                websocket:
                  messages: [{ text: '*"id"*' }]
                  onConnect: [{ type: send }, { type: wait, match: json }]
          - call: { method: ws.connect, ok: true, params: { request: { websocket: { onConnect: [{ type: send }] } } } }
      solution:
        - save:
            name: Ticket desk
            kind: websocket
            url: "{{desk}}"
            websocket: &routine
              messages:
                - { name: Open ticket, format: json, text: '{"id": 2, "op": "open"}' }
              onConnect:
                - { type: send, message: Open ticket }
                - { type: wait, match: json, pattern: "$.id == 2" }
        - call: { method: ws.connect, params: { connId: lab-ws, request: { name: Ticket desk, kind: websocket, url: "{{desk}}", websocket: *routine } } }
        - wait: 500
    - text: |
        等待就是测试。打开运行器：集合的 **+** → **运行…**。在请求列表上方点 **无**，勾上 **Ticket desk**，按 **运行**。请求会连上、跑完步骤再关闭，那个等待会显示成一个通过的测试。
      hints:
        - "集合运行时，WebSocket 请求会连上、跑连接后步骤、再断开。每个「等待」步骤都是一个测试。"
        - "集合里「筛选」框旁边的 + 菜单里有「运行…」。运行器在新标签页里打开；点「无」可以清空选择。"
        - "只跑 Ticket desk：一个请求，一个通过的测试，名字是「等待一条 JSON 消息，条件 $.id == 2」。"
      check:
        run: { testsPassed: ">=1", testsFailed: 0 }
      solution:
        - call: { method: folder.create, params: { parent: "", name: Ticket desk checks } }
        - call:
            method: request.create
            params:
              parent: Ticket desk checks
              request: { name: Ticket desk, kind: websocket, url: "{{desk}}", websocket: *routine }
        - call: { method: runner.start, params: { folder: Ticket desk checks } }
        - wait: 1000
    - text: |
        让线路保活，再按你的方式挂断。加第二条消息 `Ping`，内容是 `ping`（格式 **文本**），再加第三个连接后步骤：**持续发送一条消息（心跳）**，选 Ping，每 `1000` 毫秒一次。重连，看着 `ping` 和 `pong` 来回跑。

        然后用你自己的关闭码挂断：在地址栏的 **⋯** 菜单里选 **用关闭码关闭…**，输入 `4001 Done for today`。
      hints:
        - "心跳能让安静的连接不被掐掉。取号台用 pong 回应 ping。"
        - "消息 → 添加消息：Ping，文本，ping。连接后 → 添加步骤 → 持续发送一条消息（心跳），选 Ping，每 1000 毫秒。然后连接。"
        - "两三次 ping 之后，⋯ → 用关闭码关闭… → 4001 Done for today → 关闭连接。发 {\"op\": \"bye\"} 也会让取号台用 4001 挂断。"
      check:
        all:
          - message: { server: desk, direction: in, text: ping, count: 2 }
          - message: { server: desk, kind: close, summary: "*4001*" }
      solution:
        - call:
            method: ws.connect
            params:
              connId: lab-ws
              request:
                name: Ticket desk
                kind: websocket
                url: "{{desk}}"
                websocket:
                  messages:
                    - { name: Open ticket, format: json, text: '{"id": 2, "op": "open"}' }
                    - { name: Ping, text: ping }
                  onConnect:
                    - { type: send, message: Open ticket }
                    - { type: wait, match: json, pattern: "$.id == 2" }
                    - { type: repeat, message: Ping, everyMs: 300 }
        - wait: 1200
        - call: { method: ws.close, params: { connId: lab-ws, code: 4001, reason: Done for today } }
        - wait: 300
quiz:
  - question: 一个 WebSocket 请求的连接后步骤是**发送 Login**，然后**等待一条 JSON 消息，条件 $.ok == true**。它在集合运行里会怎样？
    options:
      - 被跳过，因为运行只发 HTTP 请求
      - 它会连上、发出 Login，那个等待就是一个测试，答案按时到达就通过
      - 它会一直重复发送 Login 直到运行结束
    answer: 1
    explain: 运行时会连上、跑步骤、再关闭。每个「等待」步骤都变成测试，所以服务器不再应答会让你的运行失败，在 CI 里也一样。
  - question: "你发了 `{\"id\": 7, \"op\": \"open\"}`，消息还在陆续到达。Zorvik 把哪一条当成它的回复？"
    options:
      - 你这条之后到达的下一条
      - 「按路径配对回复」（$.id）上取值也是 7 的那一条
      - 最长的那一条
    answer: 1
    explain: 回答可能乱序回来，还混着服务器推送的更新。按 id 配对是 App（和 Zorvik）判断哪条回答属于哪条请求的办法。
  - question: 你的 App 因为会话过期关掉了一条 WebSocket。用哪个关闭码合适？
    options:
      - "1006"
      - 应用自己定义的码，4000 到 4999，比如 4001
      - "404"
    answer: 1
    explain: 4000 到 4999 留给应用自己定义，于是两端可以约定 4001 表示「会话过期」。1006 从不会被发送，它表示连接没打招呼就断了。
---

真实的 WebSocket API 很少停在「你好」这一步。一个交易 App 会连上、等欢迎语、登录、订阅、逐条检查回答，还时不时发一个「我还在」让连接别被掐掉。每次重连都重打一遍太烦，所以 Zorvik 的 WebSocket 请求会把这套流程一起存下来。

## 已保存的消息

**消息** 标签页保存你常发的消息，每条有名字、格式（**文本**、**JSON**，二进制字节用 **Hex**）和内容。`{{variables}}` 在发送时填充，所以 `{"op": "login", "token": "{{token}}"}` 在任何环境都能用。每条消息都有 **放入输入区** 和 **立即发送** 按钮。输入区的书签按钮 **已保存的消息** 也能列出它们，**保存为消息…** 会把刚输入的内容存下来。

## 哪条回复对应哪条请求？

很多 API 在每条请求里放一个 `id`，在回答里带回同一个 `id`，因为回答可能乱序到达，还混着服务器推送的更新。Zorvik 会配对：当收到的消息在 **按路径配对回复**（默认 `$.id`）上的取值，和你发出去的某条消息相同时，它就得到一个绿色小标签和耗时，比如 **↩ 152 ms**。点这个标签会高亮它在应答的那条消息。

```sequence
participants: 你, 取号台
你 -> 取号台: {"id": 1, "op": "open"}
你 -> 取号台: {"id": 2, "op": "open"}
取号台 --> 你: {"type": "notice"}（主动推送，不应答任何请求）
取号台 --> 你: {"id": 2, "ticket": "…"} ↩ 120 ms
取号台 --> 你: {"id": 1, "ticket": "…"} ↩ 160 ms
```

## 连接后：每次都跑的流程

**连接后** 标签页里的步骤，会在每次 **连接** 之后按顺序执行：

| 步骤 | 做什么 |
|---|---|
| **发送** | 发一条你保存的消息 |
| **等待** | 等一条消息：*包含*某段文字、*正好等于*它、*匹配正则*、*JSON where* 条件成立，或者*任意消息*；有时间上限（默认 5000 毫秒） |
| **持续发送** | 每隔若干毫秒发一条保存的消息：**心跳** |

*JSON where* 的条件长这样：`$.type == welcome`、`$.id == 2`，或者只写 `$.token`（表示这个值存在）。等待也会算上刚开始之前就到达的回答；作为第一步时，它能看到服务器的问候。日志会记下每一步（「连接后：已发送 Login」）。第一个失败的步骤会中止后面的步骤，而连接仍然开着，方便你四处看看。

```flow
连接 -> 等欢迎语 -> 发送 Login -> 等 $.ok == true -> 持续发 Ping
```

> [!note] 可以这样想……
> 打客服电话的脚本：拨号，等「您好，这里是取号台」，报你的号码，等「找到了」，然后每分钟问一句「还在吗」免得被挂断。写一次，每次都照它执行。

## 心跳与挂断

服务器和代理常常掐掉长时间安静的连接。除了 **持续发送** 步骤，**发送** 按钮上的菜单还能重复输入区里的消息（**每秒发送**、**每 5 秒发送**、**每…发送**），直到你按 **停止**。

**断开** 用 `1000` 正常关闭。想看 App 怎么应对别的结束方式，就在地址栏的 **⋯** 菜单里选 **用关闭码关闭…**，输入码和原因，比如 `4001 Session expired`。`4000` 到 `4999` 归应用自己定义；`1008` 表示*违反策略*。日志最后一行会说明这个码是什么意思。

## 等待变成测试

WebSocket 请求也能在集合运行器和 `zorvik run` 里跑：它连上、跑连接后步骤、关闭。每个 **等待** 步骤都是一个测试，名字像 *等待一条 JSON 消息，条件 $.id == 2*，所以服务器不应答就会让你的运行失败。持续发送的步骤在运行里不执行。

**什么时候用得上：** 你测的聊天、交易界面或游戏服务器，会话开头总是那几条消息：流程存一次，想重连多少次都行，让运行器在每次构建时检查回答。
