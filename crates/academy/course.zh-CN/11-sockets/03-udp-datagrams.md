---
id: udp-datagrams
title: "UDP：发完就不管"
summary: UDP 发一条条自包含的数据报，不建连接、不保证送达，换来的是快和简单。
minutes: 5
lab:
  title: 用无线电呼叫气象站
  goal: 向气象站发 UDP 数据报、读它的回答，并体会 UDP 不告诉你的事。
  minutes: 6
  servers:
    station:
      name: 气象站
      kind: udp
      socket:
        mode: rules
        rules:
          - { match: regex, pattern: "(?i)^status", reply: "STATION OK. Ask TEMP? for a reading." }
          - { match: regex, pattern: "(?i)^temp", reply: "TEMP 18.4 C, reading id {{secret.reading}}" }
  steps:
    - text: |
        点标签栏末端的 **+**，选择 **UDP 套接字**。地址填 `{{station}}`，按 **连接**，然后发送 `STATUS`。
      hints:
        - "UDP 地址长得像 udp://host:port。连接不会联系气象站：它只决定你的数据报往哪发。"
        - "在标签栏的 + 菜单里选「UDP 套接字」，地址栏输入 {{station}}，按连接，然后在底部输入区输入。"
        - "地址 {{station}}，连接，输入 STATUS 按发送。气象站回 STATION OK。"
      check:
        message: { server: station, direction: in, text: "status*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-udp, request: { name: Weather station, kind: udp, url: "{{station}}" } } }
        - call: { method: socket.send, params: { connId: lab-udp, message: { type: text, text: STATUS } } }
        - wait: 200
    - text: 现在发送 `TEMP?`，把气象站回答里的**读数 id** 填进来。
      hints:
        - "你每发一个数据报，都会收到一个自己的回答数据报。"
        - "发 TEMP?，看最新那条收到的消息。气象站的流量里也有（服务器 → Lab · 气象站）。"
        - "回答是 TEMP 18.4 C, reading id …，把末尾那个 id 复制下来。"
      check:
        answer: "{{secret.reading}}"
      solution:
        - call: { method: socket.connect, params: { connId: lab-udp, request: { name: Weather station, kind: udp, url: "{{station}}" } } }
        - call: { method: socket.send, params: { connId: lab-udp, message: { type: text, text: "TEMP?" } } }
        - answer: "{{secret.reading}}"
    - text: |
        发完就不管：发送 `LOG door opened`。气象站会默默记下日志行，所以不会有回答。也不会有错误：从你这一侧看，到达的数据报和丢掉的数据报一模一样。
      hints:
        - "像前面那样发就行。重点在于之后什么都没发生。"
        - "只有气象站自己的流量能证明你的数据报到了：在服务器里打开 Lab · 气象站。"
        - "输入 LOG door opened，按发送，然后去气象站的流量里找你这一行。"
      check:
        message: { server: station, direction: in, text: "log*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-udp, request: { name: Weather station, kind: udp, url: "{{station}}" } } }
        - call: { method: socket.send, params: { connId: lab-udp, message: { type: text, text: LOG door opened } } }
        - wait: 200
        - call: { method: socket.close, params: { connId: lab-udp } }
quiz:
  - question: 一个 UDP 数据报在路上丢了。谁会注意到？
    options:
      - UDP 会像 TCP 那样自动重发
      - 没人，除非应用程序自己检查，比如等回复、超时后再问一次
      - 接收方的计算机会主动再要一次
    answer: 1
    explain: UDP 没有确认也没有重发。在意的应用自己加上，比如超时后重试的 DNS 客户端。
  - question: 为什么 UDP 适合实时视频通话？
    options:
      - 它保证每一帧都到达
      - 它会自动加密视频
      - 迟到的帧没有意义，所以丢掉它比等重传更好
    answer: 2
    explain: TCP 会一直憋着等丢的包重传，画面就卡住了。UDP 让通话继续往前走。
  - question: UDP 里的消息边界是怎么处理的？
    options:
      - 每个数据报要么整条到达、要么完全不到，所以一次发送就是一条消息
      - 数据报会像 TCP 那样合并成流
      - 需要像 TCP 一样加长度前缀
    answer: 0
    explain: 数据报自带边界。UDP 不保证的是它到不到、到几次、按不按顺序到。
---

TCP 很谨慎：握手、确认、重传、排序。在网络那一单元你把它和 UDP 比过；现在你要亲手用 UDP。先问一句：为什么会有人放弃这些谨慎？因为有时候它们碍事。视频通话宁愿丢一帧，也不愿为了等它而卡住。DNS 查询就是一问一答，何必建连接？为此有了 **UDP**，User Datagram Protocol。

## 数据报

UDP 发的是**数据报**：自包含的字节包，每个都带目标地址和端口。没有连接，也没有握手。每个数据报独立上路，**要么整条到达，要么一条都不到**。

UDP *不* 保证的是：

- 数据报到底能不能到，
- 是不是只到一次，
- 是不是按发送顺序到达。

换来的是快、几乎没有额外开销，而且每次发送正好就是一条消息，不需要分帧。

```sequence
你 -> 气象站: STATUS
气象站 --> 你: STATION OK
你 -> 气象站: TEMP?
Note over 你, 气象站: 这条丢了，而且没人告诉你
你 -> 气象站: TEMP?（超时后又问了一次）
气象站 --> 你: TEMP 18.4 C
你 -> 气象站: LOG door opened
Note over 气象站: 已记录；按设计不回复
```

如果程序需要可靠性，就自己在上面加：等回答，超时后再问一次。DNS 客户端就是这么干的。

> [!note] 可以这样想……
> 在忙乱的厨房里隔着台子喊单。每次喊都短而完整（「两份汤！」）。大多数能听见，有些淹没在噪音里，唯一确认的办法是等厨师回一句。真要紧，就再喊一次。

## 在 UDP 之上

UDP 是个最低限度的底子，所以上面的协议只加自己需要的那点东西，一点不多：

| 协议 | 在 UDP 之上加了什么 |
|---|---|
| DNS | 一个 id 把回答和问题对上，以及超时重试 |
| 游戏 | 每次更新带个编号，迟到的旧位置直接忽略 |
| 视频与语音通话 | 丢包什么都不加：迟到的帧没用，跳过 |
| QUIC（HTTP/3 的底座） | 自己的重传、排序和加密，但没有 TCP 那种「为一个丢包卡住全部」的毛病 |

> [!warning] 数据报要小
> 理论上一个数据报能装约 64 KB，但太大的会在路上被切开，丢任何一片就等于整条丢掉。真实协议通常控制在 1,200 字节以内。

## 在 Zorvik 里

**UDP 套接字** 请求接受 `udp://127.0.0.1:9001` 这样的地址。**连接** 只是决定你的数据报往哪发：不按 **发送** 就一个包都不会发出去。你发出的和收到的每个数据报都会出现在日志里，收到的还会显示发送方地址。Zorvik 的 UDP 服务器同样会把每个发送方当成一条伪连接列在流量里，从第一个数据报开始。

**什么时候用得上：** 你测 DNS、游戏服务器、VoIP 系统，或者一台说 UDP 的物联网设备；以及某样东西「就是不理你」的时候——你会知道，用 UDP 时沉默并不能说明你的消息到没到。
