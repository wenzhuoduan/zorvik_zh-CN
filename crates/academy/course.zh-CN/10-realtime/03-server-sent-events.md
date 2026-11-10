---
id: server-sent-events
title: "Server-Sent Events：服务器单向报信"
summary: 一个 HTTP 请求一直挂着，服务器有消息时就往这条响应里写一条带名字的事件。
minutes: 5
lab:
  title: 收听新闻编辑室
  goal: 读一条实时事件流，然后带上 Last-Event-ID 重连，从断点继续。
  minutes: 7
  servers:
    news:
      name: 新闻编辑室
      kind: sse
      sse:
        intervalMs: 600
        events:
          - { event: headline, id: "1", data: Bootcamp opens its doors }
          - { event: headline, id: "2", data: Local server answers in under a millisecond }
          - { event: weather, id: "3", data: Sunny over 127.0.0.1 }
          - { event: headline, id: "4", data: "Breaking: the code word is {{secret.word}}" }
  steps:
    - text: |
        点标签栏末端的 **+**，选择 **事件流（SSE）**。地址填 `{{news}}/live`，按 **连接**。四条事件会陆续到达。
      hints:
        - "事件流就是一个一直挂着的 GET 请求。每到达一条事件，Zorvik 就列出一行。"
        - "在标签栏的 + 菜单里选「事件流（SSE）」，地址栏输入 {{news}}/live，按连接。"
        - "地址 {{news}}/live，按连接，等两秒左右：计数会到 4 条事件。"
      check:
        message: { server: news, kind: open }
      solution:
        - call: { method: sse.connect, params: { connId: lab-sse, request: { name: Newsroom, kind: sse, url: "{{news}}/live" } } }
    - text: id 为 `4` 的那条事件里有一个口令。把它填在这里。
      hints:
        - "日志里每一行都用徽标显示事件名。点一行就能看到它的 id 和完整数据。"
        - "最后一条 headline 事件的 id 是 4。服务器那一侧也有：在服务器里打开 Lab · 新闻编辑室，看它的流量。"
        - "它的数据是：Breaking: the code word is …，把 is 后面那个词复制下来。"
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
    - text: |
        假设你的连接在事件 `2` 之后断了。按 **断开**，打开 **Headers** 标签页，加一个 `Last-Event-ID` 头，值填 `2`，再按 **连接**。
      hints:
        - "Last-Event-ID 告诉服务器你最后看到的事件 id，它就能从那里接着发。"
        - "Headers 是地址栏下面的一个标签页。键写 Last-Event-ID，值写 2。"
        - "断开，在 Headers 标签页加 Last-Event-ID: 2，再按连接。"
      check:
        call: { method: sse.connect, params: { request: { headers: [{ key: Last-Event-ID, value: "2" }] } }, ok: true }
      solution:
        - call: { method: sse.connect, params: { connId: lab-sse, request: { name: Newsroom, kind: sse, url: "{{news}}/live", headers: [{ key: Last-Event-ID, value: "2" }] } } }
        - wait: 1000
        - call: { method: sse.close, params: { connId: lab-sse } }
    - text: 这次流不是从头开始的。重连之后你收到的**第一条**事件叫什么名字？
      hints:
        - "服务器跳过了直到 id 2（含）的所有事件。"
        - "看第二条「已连接」之后第一条事件的徽标。"
        - "带上 Last-Event-ID 2 之后，下一条事件 id 是 3，名字是 weather。"
      check:
        answer: weather
      solution:
        - answer: weather
quiz:
  - question: Server-Sent Events 的数据往哪个方向流？
    options:
      - 只从客户端到服务器
      - 只从服务器到客户端
      - 双向，和 WebSocket 一样
    answer: 1
    explain: 客户端发一个请求，之后只有服务器在写。客户端要发东西，就另发一个普通 HTTP 请求。
  - question: Last-Event-ID 头是干什么的？
    options:
      - 重连后接着断点接收，既不漏也不重
      - 登录事件流
      - 选择你想收哪些事件名
    answer: 0
    explain: 客户端把最后看到的事件 id 发过去，支持这个的服务器就从下一条继续。
  - question: 在事件流的文本里，什么标记一条事件的结束？
    options:
      - 一个逗号
      - 关闭连接
      - 一个空行
    answer: 2
    explain: 每条事件是几行 event、data 之类，后面跟一个空行。流本身一直开着。
---

有时候客户端不需要*说话*，只需要*听*：通知、比分直播、构建日志、进度条，或者一个逐字输出答案的 AI 助手。这种场景有个比 WebSocket 更简单的工具：**Server-Sent Events**（SSE）。

## 怎么工作

客户端发一个普通的 HTTP `GET`。服务器用 `Content-Type: text/event-stream` 作答，然后干脆**不结束**这个响应。有消息时，就往这个还没结束的响应里再写一条事件。

```sequence
App -> 服务器: GET /live（Accept: text/event-stream）
服务器 --> App: 200 OK，Content-Type: text/event-stream
服务器 --> App: id: 1, event: headline, data: …
服务器 --> App: id: 2, event: headline, data: …
Note over App: 连接断了
App -> 服务器: GET /live（Last-Event-ID: 2）
服务器 --> App: id: 3, event: weather, data: …
```

## 事件格式

流就是纯文本。每条事件是几行 `字段: 值`，再加一个空行：

```anatomy
id: 4 | 一个 id，客户端可以据此说自己停在哪
event: headline | 事件名（不写就叫 "message"）
data: Breaking: the code word is … | 内容；多行 data 会用换行拼起来
(an empty line) | 这条事件到此结束
```

以 `:` 开头的行是注释。服务器会时不时发一条（Zorvik 自己的 SSE 服务器每 15 秒发一次），只是为了让安静的连接不被掐掉。

## 重连时别丢消息

连接会断：地铁进隧道、笔记本合盖。浏览器会自己重连，并把最后看到的 id 放进 **`Last-Event-ID`** 头发出去。支持它的服务器就从那条事件之后接着发，于是既不漏也不重。实验里你会手动做一遍。

> [!note] 可以这样想……
> 一个广播电台。你调好频率，它一直播给你听，但你没法通过收音机回话。如果你中途断了，好电台能告诉你从你上次听到的那条新闻之后都错过了什么。

## SSE 还是 WebSocket？

| | SSE | WebSocket |
|---|---|---|
| 方向 | 服务器到客户端 | 双向 |
| 建立在 | 普通 HTTP | HTTP 升级，之后是自己的帧 |
| 重连与续传 | 标准里自带 | 得自己实现 |
| 内容 | 文本 | 文本或二进制 |

因为 SSE 就是普通 HTTP，它能穿过大多数代理和防火墙，`Authorization` 之类的头也照常工作。

在 Zorvik 里，**事件流（SSE）** 请求有 **Params**、**Headers**、**Auth** 和 **设置** 标签页。**连接** 打开流，每条事件带名字徽标出现在日志里；点一条能看到它的 id 和数据。计数器显示收到了多少条。

**什么时候用得上：** 你在测通知流，或者一个边算边输出答案的 AI 接口：连上去，盯着每条事件的名字、id 和数据，再确认带上 `Last-Event-ID` 重连能正确续上。
