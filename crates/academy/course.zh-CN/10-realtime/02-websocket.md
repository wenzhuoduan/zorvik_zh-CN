---
id: websocket-basics
title: "WebSocket：双向对话"
summary: WebSocket 从一个 HTTP 请求开始，随后变成一条敞开的两向线路，任何一方都能随时发消息。
minutes: 5
lab:
  title: 跟服务器聊天
  goal: 打开一条 WebSocket、发消息、读服务器的回答，最后规规矩矩地关掉连接。
  minutes: 7
  servers:
    chat:
      name: 聊天机器人
      kind: websocket
      websocket:
        mode: rules
        greeting: 欢迎来到实验聊天！打个招呼吧。
        rules:
          - { match: regex, pattern: "(?i)hello", reply: "Hello to you too! Today's password is {{secret.word}}." }
          - { match: regex, pattern: "(?i)^ping$", reply: pong }
          - { match: any, reply: "Sorry, I only understand hello and ping. You said: {{message}}" }
  steps:
    - text: |
        点标签栏末端的 **+**，选择 **WebSocket**。地址填 `{{chat}}`，按 **连接**。连接一打开，服务器就会跟你打招呼。
      hints:
        - "WebSocket 地址以 ws:// 开头（带 TLS 时是 wss://）。Lab 环境里用变量 chat 存着聊天服务器的地址。"
        - "标签栏的 + 菜单里选 WebSocket，在地址栏输入 {{chat}}。主按钮写的是「连接」而不是「发送」。"
        - "建一个 WebSocket 请求，地址 {{chat}}，按连接。日志里会出现「已连接」，然后是一条带蓝色箭头的问候。"
      check:
        message: { server: chat, kind: open }
      solution:
        - call: { method: ws.connect, params: { connId: lab-ws, request: { name: Lab chat, kind: websocket, url: "{{chat}}" } } }
    - text: |
        在底部的消息框输入 `hello`，按 **发送**。你的消息带绿色箭头，回答带蓝色箭头。
      hints:
        - "连上之后，流面板底部有一个输入区：一个消息框和一个发送按钮。"
        - "输入区保持「文本」，输入 hello 按发送（或 ⌘/Ctrl + Enter）。"
        - "在「要发送的消息」框里输入 hello，按发送。服务器立刻作答。"
      check:
        message: { server: chat, direction: in, text: "*hello*" }
      solution:
        - call: { method: ws.connect, params: { connId: lab-ws, request: { name: Lab chat, kind: websocket, url: "{{chat}}" } } }
        - call: { method: ws.send, params: { connId: lab-ws, message: { type: text, text: hello } } }
        - wait: 200
    - text: 服务器的回答里带着今天的口令。把它填在这里。
      hints:
        - "看最新那条带蓝色箭头（收到）的消息。"
        - "它写着：Hello to you too! Today's password is …。服务器那一侧也有：在服务器里打开 Lab · 聊天机器人，看它的流量。"
        - "复制 Today's password is 后面那个词（不要句号）。"
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
    - text: |
        发送 `ping`，看 `pong` 回来。然后按 **断开** 把连接规规矩矩地关掉。
      hints:
        - "聊天机器人有一条规则：ping 用 pong 回答。"
        - "输入 ping 按发送，然后用地址栏里的断开按钮。"
        - "发 ping，看到 pong 到，然后按断开。服务器的日志会记下这次关闭。"
      check:
        all:
          - message: { server: chat, direction: in, text: ping }
          - message: { server: chat, kind: close }
      solution:
        - call: { method: ws.connect, params: { connId: lab-ws, request: { name: Lab chat, kind: websocket, url: "{{chat}}" } } }
        - call: { method: ws.send, params: { connId: lab-ws, message: { type: text, text: ping } } }
        - wait: 200
        - call: { method: ws.close, params: { connId: lab-ws } }
        - wait: 300
quiz:
  - question: WebSocket 连接是怎么开始的？
    options:
      - 用一个请求协议的 HTTP 请求开始，服务器用 101 Switching Protocols 接受
      - 用一个发往 101 端口的 UDP 数据报
      - 用一次 WS 类型的 DNS 查询
    answer: 0
    explain: 升级握手让 WebSocket 能沿用网页那套端口、URL 和代理。
  - question: WebSocket 打开之后，谁可以发消息？
    options:
      - 只有客户端
      - 只有服务器
      - 双方任何时候都可以，不用等对方
    answer: 2
    explain: 这正是 WebSocket 的意义。跟 HTTP 不同，服务器不用等人来问。
  - question: 哪个地址代表受 TLS 加密保护的 WebSocket？
    options:
      - ws://chat.example.com
      - wss://chat.example.com
      - http://chat.example.com
    answer: 1
    explain: wss:// 之于 ws://，就像 https:// 之于 http://。正式环境一律用它。
---

HTTP 是一场规规矩矩的对话：客户端问，服务器答，结束。没人问，服务器就不开口。聊天 App 碰上这是个大问题：朋友写消息的时候，*他的*消息应该自己到你这里，而不是等你去问。

**WebSocket** 解决了这个。它给你一条长期存在的连接，**双方随时都能往上发消息**。

## 升级握手

WebSocket 一开始是一个普通的 HTTP 请求，请求服务器换一种协议：

```anatomy
GET /chat HTTP/1.1 | 从一次普通的 HTTP GET 开始
Upgrade: websocket | 「我们换成 WebSocket 吧」
Connection: Upgrade | 这条连接本身要变
Sec-WebSocket-Key: dGhlIHNhbXBsZQ== | 一个随机串；服务器的回答能证明它看懂了
HTTP/1.1 101 Switching Protocols | 服务器同意：从现在起，说的是 WebSocket 消息
```

`101` 之后，同一条 TCP 连接继续开着，双向传**消息**（规范里把它们叫*帧*）。

```sequence
App -> 服务器: GET /chat（Upgrade: websocket）
服务器 --> App: 101 Switching Protocols
服务器 --> App: 欢迎来到实验聊天！打个招呼吧。
App -> 服务器: hello
服务器 --> App: Hello to you too!
Note over App, 服务器: 任何一方随时都可以发
App -> 服务器: close（码 1000，正常关闭）
服务器 --> App: close
```

## WebSocket 上跑什么

- **文本消息**，常常是 JSON，比如 `{"type": "chat", "text": "hi"}`。
- **二进制消息**：原始字节，用于图片、音频或紧凑格式。
- **ping 和 pong**：很小的「你还在吗」检查，用来把闲置连接保活。
- **关闭**：带一个关闭码的告别，比如 `1000`（正常）或 `1001`（要走了）。如果连接一声不响就断了，那是出了问题。

地址用 `ws://`，带 TLS 加密（和 `https://` 同一套）时用 `wss://`。

> [!note] 可以这样想……
> HTTP 是在外卖柜台点单：你问、拿到东西、走人，厨师之后没法再喊你。WebSocket 是在吧台坐下：坐下之后，你和酒保谁有话都能开口，直到有人离开。

## 在 Zorvik 里

**WebSocket** 请求有 URL、**Params**、**Headers** 和 **Auth**，因为握手*本身就是* HTTP。**连接** 打开线路，之后日志用绿色 ↗（发出）或蓝色 ↙（收到）标记每条消息，并给出计数，比如「已发 3 · 已收 4」。底部的输入区可以发 **文本**、**JSON** 或 **二进制（hex）**。**断开** 会带一条正式的关闭消息收尾。

> [!tip] 自己的 WebSocket 服务器
> 实验里的聊天机器人就是一个普通的 Zorvik 服务器：在 **服务器** 里找到 **Lab · 聊天机器人**，能看到它的问候和应答规则，它的流量日志从服务器视角记录着同一段对话。

**什么时候用得上：** 你在测聊天、实时看板或多人功能：像 App 那样连上去，发你真正想发的消息（包括坏消息），再看服务器推回来什么。
