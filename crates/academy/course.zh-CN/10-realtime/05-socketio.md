---
id: socketio
title: "Socket.IO：事件、命名空间与确认"
summary: Socket.IO 建在 WebSocket 之上（必要时退回长轮询），额外提供命名事件、命名空间，以及可以等的答复。
minutes: 5
added: 0.2.0
lab:
  title: 游戏大厅
  goal: 加入一个 Socket.IO 命名空间、发出事件，并从服务器拿到确认。
  minutes: 7
  servers:
    lobby:
      name: 游戏大厅
      kind: socketio
      socketio:
        mode: rules
        greetingEvent: welcome
        greetingArgs: '{"players": 3, "tables": ["poker", "chess"]}'
        rules:
          - { event: join, ack: '{"ok": true, "table": {{event.arg0}}, "seat": "{{secret.seat}}"}' }
          - { event: chat, replyEvent: chat, replyArgs: '["host", {{event.arg0}}]', broadcast: true }
          - { event: "*", replyEvent: unknown, replyArgs: "{{event.name}}" }
  steps:
    - text: |
        点标签栏末端的 **+**，选择 **Socket.IO 客户端**。地址填 `{{lobby}}/games`：路径就是要加入的**命名空间** `/games`。按 **连接**，服务器会用一条 `welcome` 事件跟你打招呼。
      hints:
        - "Socket.IO 的地址是服务器加命名空间。不写路径就是主命名空间 /。"
        - "标签栏的 + 菜单里选「Socket.IO 客户端」，地址栏填 {{lobby}}/games，按连接。"
        - "Socket.IO 客户端，地址 {{lobby}}/games，连接。日志会显示已加入 /games，然后是带参数的 welcome 事件。"
      check:
        message: { server: lobby, summary: joined /games }
      solution:
        - call: { method: socket.connect, params: { connId: lab-io, path: null, request: { name: Lobby, kind: socketio, url: "{{lobby}}/games" } } }
        - wait: 200
    - text: |
        入座：在底部输入区把 **事件** 设成 `join`，打开 **Ack**，参数写 `"poker"`，按 **发出**。服务器会确认你的座位号。把它填在这里。
      hints:
        - "参数是 JSON：\"poker\"（带引号）是一个文本参数。打开 Ack 就是让服务器对这条事件作答。"
        - "事件 join，打开 Ack，参数 \"poker\"（JSON 模式），然后发出。答复会显示成 ack #1。"
        - "打开 ack #1 那一行：它的参数里有 seat，复制那个值。"
      check:
        all:
          - message: { server: lobby, summary: "/games join (asks for acknowledgement*" }
          - answer: "{{secret.seat}}"
      solution:
        - call: { method: socket.connect, params: { connId: lab-io, path: null, request: { name: Lobby, kind: socketio, url: "{{lobby}}/games" } } }
        - call: { method: socket.send, params: { connId: lab-io, message: { type: emit, event: join, args: '"poker"', ack: true } } }
        - wait: 200
        - answer: "{{secret.seat}}"
    - text: |
        发一条大厅不认识的事件，比如 `dance`（Ack 关掉，不用参数）。服务器会用一条 `unknown` 事件把名字回给你。然后按 **断开**。
      hints:
        - "大厅对所有处理不了的事件有一条兜底规则。"
        - "把事件设成 dance，清空参数，按发出，然后在地址栏按断开。"
        - "发出 dance，看到 unknown [\"dance\"] 到达，然后断开。大厅的流量里能看到客户端离开。"
      check:
        all:
          - message: { server: lobby, direction: out, summary: /games unknown }
          - message: { server: lobby, kind: close }
      solution:
        - call: { method: socket.connect, params: { connId: lab-io, path: null, request: { name: Lobby, kind: socketio, url: "{{lobby}}/games" } } }
        - call: { method: socket.send, params: { connId: lab-io, message: { type: emit, event: dance, args: "" } } }
        - wait: 200
        - call: { method: socket.close, params: { connId: lab-io } }
        - wait: 300
quiz:
  - question: Socket.IO 在普通 WebSocket 之上加了什么？
    options:
      - 命名事件、命名空间、确认机制，以及退回长轮询的能力
      - 加密，WebSocket 没有加密
      - 什么都没加，它就是 WebSocket 的另一个名字
    answer: 0
    explain: "WebSocket 只负责搬消息。Socket.IO 给消息起名字（事件）、把连接分组（命名空间、房间）、让发送方等答复（确认），并在 WebSocket 被封的地方也能用。"
  - question: 用普通 WebSocket 客户端连一个 Socket.IO 服务器会怎样？
    options:
      - 能用，只是事件以 JSON 到达
      - 能连上，但它不会说 Socket.IO 的包格式，所以什么也做不了
      - 服务器会自动把它升级成 Socket.IO
    answer: 1
    explain: Socket.IO 在传输层之上有自己的握手和包格式。要说得用 Socket.IO 客户端，比如 socket.io-client 或 Zorvik 的。
  - question: 什么是确认（acknowledgement）？
    options:
      - 浏览器在消息送达时显示的收据
      - 接收方对**某一条**事件的答复，回传给发送方
      - 一个保活的 ping
    answer: 1
    explain: 带确认时，发送方传一个回调（或者 await emitWithAck），接收方就对那条事件作答。
---

普通 WebSocket 只搬消息，仅此而已。真实的 App 很快就想要更多：带名字的消息、连接的分类，以及知道对方处理了某件事的办法。**Socket.IO** 就是建在 WebSocket 上、专门补这些的库。

## 事件而不是消息

用 Socket.IO，你不发原始文本，而是**发出一个事件**：一个名字加一些参数。

```js
socket.emit("chat", "Hello!", { room: "lobby" });

socket.on("chat", (text, info) => {
  console.log(text, info.room);
});
```

服务器用同样的方式监听 `chat`。参数可以是任何 JSON，甚至二进制。

## 确认

有时候发送方需要对**这条**事件的答复：「我的订单过了吗？」**确认**就是这个答复。

```sequence
客户端 -> 服务器: emit join "poker"（要求确认）
服务器 --> 客户端: ack {"ok": true, "seat": 4}
```

写代码时，客户端把回调当作最后一个参数传进去，或者 await `emitWithAck`。在 Zorvik 里，在输入区打开 **Ack**。

## 命名空间与房间

一台服务器可以承载多个互相独立的频道，叫**命名空间**：`/chat`、`/games`、`/admin`。客户端在地址里挑一个（`http://host:3000/games`），只会看到那个命名空间的事件。在命名空间内部，服务器还可以把连接放进**房间**，并向整个房间广播——聊天室和多人游戏就是这么做的。

> [!note] 可以这样想……
> 一栋写字楼。命名空间是你去的楼层，房间是那层的会议室，事件是有人开口说的话，确认是有人回你一句「收到」。

## 它怎么连

Socket.IO 通常先用 **HTTP 长轮询**（发出去就等着消息的普通请求）起步，这样几乎能穿任何代理，然后能升级就**升级**成 WebSocket。心跳持续检查连接，断了客户端会自己重连。

所以普通 WebSocket 客户端跟 Socket.IO 服务器说不上话，反过来也一样：Socket.IO 在传输层之上有自己的握手和包格式。

## 模拟一个 Socket.IO 后端

Zorvik 也能跑 **Socket.IO 服务器**（服务器 → **+** → **Socket.IO 服务器**）。把 App 的 socket.io-client 指过来，就能用原样回显、用规则（确认、回复、向命名空间广播）或者直接在流量面板里手动发事件来作答。实验里的大厅就是这样一个服务器。
