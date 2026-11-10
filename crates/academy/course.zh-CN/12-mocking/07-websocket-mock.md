---
id: websocket-mock
title: Mock 一个 WebSocket 服务器
summary: Zorvik 里的 WebSocket 服务器会向客户端打招呼、按规则作答、定时推送消息、按指令挂断，让你在后端就绪之前就能做出实时应用。
minutes: 6
added: 0.3.0
lab:
  title: 你自己的行情推送
  goal: 搭一个按 id 作答、每秒推一次价格、按请求挂断的 WebSocket 服务器，然后连上去和它对话。
  minutes: 10
  servers:
    sample:
      name: Sample feed
      kind: websocket
      websocket:
        mode: rules
        rules:
          - { match: json, pattern: '$.op == "bye"', reply: '{"type": "bye"}', close: 4001 }
          - { match: json, pattern: $.id, reply: '{"id": {{message.id}}, "price": 42.5}' }
        schedule:
          - { message: '{"type": "tick", "price": {{$randomPrice(5, 50)}}}', everyMs: 1000 }
  steps:
    - text: |
        在左侧栏打开 **服务器**，点 **＋**，选择 **WebSocket 服务器**。命名为 **Price feed**，按 **创建**。

        在 **回复** 下选择 **规则**，按 **添加规则**。把 **时机** 设为 **JSON 条件**，**消息** 设为 `$.id`，**回复** 设为：

        ```json
        {"id": {{message.id}}, "price": 42.5}
        ```

        用 **⌘/Ctrl + S** 保存，然后按 **启动**。（**服务器** 下的 **实验 · Sample feed** 是一个已经搭好的版本，方便你之后对照。）
      hints:
        - "JSON 条件规则匹配满足某个条件的 JSON 消息。只写 $.id 的意思是：这条消息里带有 id。"
        - "在 Price feed 标签页里：回复 → 规则 → 添加规则。时机是一个下拉列表；消息和回复是文本框。启动在右上角。"
        - "规则：JSON 条件 · $.id · {\"id\": {{message.id}}, \"price\": 42.5}。然后 ⌘S 再按启动：圆点会变绿。"
      check:
        saved:
          server:
            name: Price feed
            kind: websocket
            running: true
            websocket:
              mode: rules
              rules: [{ match: json, reply: "*{{message.id}}*" }]
      solution:
        - call:
            method: server.create
            params:
              server: &feed
                name: Price feed
                kind: websocket
                port: 0
                websocket:
                  mode: rules
                  rules:
                    - { match: json, pattern: $.id, reply: '{"id": {{message.id}}, "price": 42.5}' }
        - call:
            method: server.save
            params: { id: Price feed, server: *feed }
        - call:
            method: server.start
            params: { id: Price feed, server: *feed }
    - text: |
        再让它能推送，并按请求挂断。在 **定时消息** 下按 **添加定时消息**，填入下面这段，间隔保持 **1000** 毫秒：

        ```json
        {"type": "tick", "price": {{$randomPrice(5, 50)}}}
        ```

        然后再按一次 **添加规则**：**JSON 条件** 填 `$.op == "bye"`，回复填 `{"type": "bye"}`，**然后关闭** 填 `4001`。用 **⌘/Ctrl + S** 保存。
      hints:
        - "定时消息会按计时器发给每个已连接的客户端，不受规则影响。然后关闭会在规则回复之后结束这条连接。"
        - "定时消息这一段在欢迎语下面。规则表格里，然后关闭是延迟（毫秒）后面那一列。"
        - "定时消息：{\"type\": \"tick\", \"price\": {{$randomPrice(5, 50)}}}，每 1000 毫秒一次。规则：JSON 条件 · $.op == \"bye\" · {\"type\": \"bye\"} · 然后关闭 4001。最后 ⌘S。"
      check:
        saved:
          server:
            name: Price feed
            kind: websocket
            running: true
            websocket:
              schedule: [{ message: "*tick*" }]
              rules: [{ match: json, close: 4001 }]
      solution:
        - call:
            method: server.save
            params:
              id: Price feed
              server: &feed2
                name: Price feed
                kind: websocket
                port: 0
                websocket:
                  mode: rules
                  rules:
                    - { match: json, pattern: '$.op == "bye"', reply: '{"type": "bye"}', close: 4001 }
                    - { match: json, pattern: $.id, reply: '{"id": {{message.id}}, "price": 42.5}' }
                  schedule:
                    - { message: '{"type": "tick", "price": {{$randomPrice(5, 50)}}}', everyMs: 1000 }
        - call:
            method: server.start
            params: { id: Price feed, server: *feed2 }
    - text: |
        连上去聊聊。点标签栏末尾的 **+**，选 **WebSocket**，填入你的服务器地址——它的标签页上会显示（例如 `ws://127.0.0.1:3001`）。按 **连接**：每秒都会来一条 tick。

        把编辑区切到 **JSON**，发送 `{"id": 7}`。回复里会带上同样的 `id`。
      hints:
        - "服务器运行时，地址就在 Price feed 标签页的客户端一栏里。"
        - "新建一个 WebSocket 请求，URL 填 ws://127.0.0.1 加你的服务器端口，按连接，然后切到 JSON → {\"id\": 7} → 发送。"
        - "{\"id\": 7, \"price\": 42.5} 会带着一个 ↩ 标记回来，夹在 tick 之间。服务器下的实验 · Sample feed 是一个搭好的推送，可以拿来对照。"
      check:
        all:
          - call: { method: ws.connect, ok: true, params: { request: { url: 're:(?i)^(wss?://)?(127\.0\.0\.1|localhost|\[::1\]):\d+/?$' } } }
          - call: { method: ws.send, ok: true, params: { message: { text: '*"id"*' } } }
      solution:
        - call: { method: ws.connect, params: { connId: lab-ws, request: { name: Price feed client, kind: websocket, url: "{{sample}}" } } }
        - call: { method: ws.send, params: { connId: lab-ws, message: { type: text, text: '{"id": 7}' } } }
        - wait: 300
    - text: |
        现在发送 `{"op": "bye"}`。你的服务器先回一条，然后用规则里的关闭码挂断。日志最后一行会说明这个关闭码的含义：把那里给出的含义填在这里（照抄英文原文）。
      hints:
        - "4000 到 4999 的关闭码不在 WebSocket 标准的列表里；它们的含义由谁决定？"
        - "以 JSON 发送 {\"op\": \"bye\"}。日志最后一行以 Disconnected by server (code 4001 · …) 开头。"
        - "日志里写的是 Disconnected by server (code 4001 · Defined by the application)。请填写 Defined by the application。"
      check:
        all:
          - call: { method: ws.send, ok: true, params: { message: { text: "*bye*" } } }
          - answer: "*application*"
      solution:
        - call: { method: ws.connect, params: { connId: lab-ws, request: { name: Price feed client, kind: websocket, url: "{{sample}}" } } }
        - call: { method: ws.send, params: { connId: lab-ws, message: { type: text, text: '{"op": "bye"}' } } }
        - wait: 300
        - answer: Defined by the application
quiz:
  - question: '规则的回复是 `{"id": {{message.id}}, "ok": true}`，客户端发来 `{"id": 42, "op": "buy"}`。它会收到什么？'
    options:
      - '`{"id": 42, "ok": true}`'
      - '`{"id": {{message.id}}, "ok": true}`'
      - '`{"id": "42", "ok": true}`'
    answer: 0
    explain: "`{{message.id}}` 会被客户端 JSON 消息里的 id 替换。数字按 JSON 原样写入、不加引号，所以回复仍是合法 JSON。"
  - question: 每个已连接的客户端都该每秒收到一次价格，哪怕它什么也不发。靠什么实现？
    options:
      - 一条匹配任意消息的规则
      - 每 1000 毫秒一条定时消息
      - 欢迎语
    answer: 1
    explain: 规则只对消息作答，欢迎语也只发一次。定时消息按计时器发给每个客户端，每次都会重新填充。
  - question: '一条规则匹配 `$.op == "bye"`，并且设置了然后关闭 `4001`。客户端发来 `{"op": "bye"}` 时会发生什么？'
    options:
      - 整个服务器停止
      - 服务器先发出这条规则的回复（如果有），然后用关闭码 4001 关闭该客户端的连接
      - 客户端收到错误，但仍保持连接
    answer: 1
    explain: 只有那一条连接会关闭，就像真实服务器结束一次会话那样。你可以借此检查 App 是否显示了正确的界面，或者能否自动重连。
---

实时股价牌、聊天室或者多人游戏大厅，都需要一个 WebSocket 服务器来对话。可当这个服务器还没搭好、时好时坏，或者只在开市时才推价格，就可以在 Zorvik 里做一个替身：一个会向客户端打招呼、按规则作答、定时推送消息、收到指令就挂断的 **WebSocket 服务器**。

## 需要设置什么

| 部分 | 作用 |
|---|---|
| **回复** | **回显**（把每条消息原样发回）、**规则**（第一条匹配的规则作答）、**手动**（你从流量面板回复）或 **放弃** |
| **欢迎语** | 客户端一连接就发给它 |
| **定时消息** | 每隔若干毫秒发给所有已连接的客户端 |
| **客户端** | 用来连接的地址；路径随意 |

## 规则

一条规则包含 **时机**（包含、正好是、匹配正则、**JSON 条件** 或 任意消息）、**消息** 模式、**回复**、**延迟（毫秒）**，在 WebSocket 服务器上还有 **然后关闭**。按顺序第一条匹配的启用规则作答；没有规则匹配的消息不会得到回复。

**JSON 条件** 会读取 JSON 消息并检查一个条件：`$.op == "subscribe"`、`$.id != 0`，或者只写 `$.id`（表示消息里有 id）。

回复是模板。`{{message}}` 是整条消息；对 JSON 消息来说，`{{message.id}}` 或 `{{message.params.symbol}}` 是其中的某个值。数字和对象按 JSON 写入，文本按原样写入，所以文本值要自己加引号：`"symbol": "{{message.params.symbol}}"`。`{{$uuid}}`、`{{$isoTimestamp}}` 和环境变量同样可用。

```sequence
participants: App, Mock
App -> Mock: 连接
App -> Mock: {"id": 7, "op": "quote"}
Note over Mock: JSON 条件 $.id 匹配
Mock --> App: {"id": 7, "price": 42.5}
Mock --> App: {"type": "tick", "price": 18.25}（每秒一次）
App -> Mock: {"op": "bye"}
Mock --> App: {"type": "bye"}，然后关闭 4001
```

> [!tip] 顺序很重要
> 把具体的规则（`$.op == "bye"`）放在笼统的规则（`$.id`、任意消息）上面：第一条匹配的才会作答。

## 定时推送

**定时消息** 每隔若干毫秒（最少 10）发给每个客户端，与回复模式无关。每条都会重新填充，所以 `{"price": {{$randomPrice(5, 50)}}}` 每次带来的都是新价格。客户端连接后，第一条会在一个间隔之后到达。取消勾选某条即可暂停它。

## 按指令挂断

真实服务器会关闭连接：会话过期、用户被移除、服务器重启。规则里的 **然后关闭** 需要一个关闭码（`1000`，或 `3000` 到 `4999`）：服务器先发出回复（如果有），然后用这个码关闭那条连接。配一条像 `{"op": "bye"}` 这样的测试消息，就能检查你的 App 是否显示了正确的界面，或者是否会重连。

> [!note] 可以这样想……
> 一个在正式演员到场前陪你排练的替角。你一进门他就问好，每个提示点都有台词备着，不用人催每分钟报一次时间，你说「再见」他就下台。

## 看着它工作

服务器的 **流量** 面板会从服务器视角展示每一次连接、消息和关闭，还能手动给某个客户端或所有客户端发消息。用 Zorvik 里的一个 WebSocket 请求来试，是最快的客户端。

**什么时候用得上：** 后端还没做出来，前端就需要实时数据；想看看 App 面对慢响应或服务器主动挂断时的表现；或者演示时必须每次都显示同一块行情牌。