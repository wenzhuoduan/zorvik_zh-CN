---
id: tcp-streams
title: "TCP：一条字节流"
summary: TCP 给两个程序一条可靠、有序、双向的字节流；剩下的全靠它们自己约定。
minutes: 5
lab:
  title: 敲一扇原始 TCP 的门
  goal: 手工打开一条 TCP 连接、读服务器的问候，再用它那套极简文本协议对话。
  minutes: 6
  servers:
    desk:
      name: 服务台
      kind: tcp
      socket:
        mode: rules
        greeting: WELCOME TO THE LAB HELP DESK. Send HELLO to get a ticket.
        lineEnding: lf
        rules:
          - { match: regex, pattern: "(?i)^hello", reply: "HELLO! Your ticket number is {{secret.ticket}}." }
          - { match: any, reply: "UNKNOWN COMMAND. Send HELLO to get a ticket." }
  steps:
    - text: |
        点标签栏末端的 **+**，选择 **TCP 连接**。地址填 `{{desk}}`，按 **连接**。服务器先开口：在日志里读它的问候。
      hints:
        - "TCP 地址长得像 tcp://host:port。Lab 环境里用变量 desk 存着服务台的地址。"
        - "在标签栏的 + 菜单里选「TCP 连接」，地址栏输入 {{desk}}，按连接。"
        - "地址 {{desk}}，按连接。日志会显示已连接，然后是一条带蓝色箭头的 WELCOME TO THE LAB HELP DESK。"
      check:
        message: { server: desk, kind: open }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: Help desk, kind: tcp, url: "{{desk}}" } } }
    - text: |
        在底部的消息框输入 `HELLO`，按 **发送**。
      hints:
        - "连上之后，底部输入区会把你输入的内容原样按字节发出去。"
        - "输入区保持「文本」，输入 HELLO 按发送（或 ⌘/Ctrl + Enter）。"
        - "在「要发送的消息」框里输入 HELLO 按发送。服务器会把你的号牌回给你。"
      check:
        message: { server: desk, direction: in, text: "hello*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: Help desk, kind: tcp, url: "{{desk}}" } } }
        - call: { method: socket.send, params: { connId: lab-tcp, message: { type: text, text: HELLO } } }
        - wait: 200
    - text: 服务台给你的号牌是多少？填在这里。
      hints:
        - "它在最新那条带蓝色箭头（收到）的消息里。"
        - "回答写着：HELLO! Your ticket number is …。服务器那一侧也有：在服务器里打开 Lab · 服务台，看它的流量。"
        - "复制 Your ticket number is 后面的内容，不要句号。"
      check:
        answer: "{{secret.ticket}}"
      solution:
        - answer: "{{secret.ticket}}"
        - call: { method: socket.close, params: { connId: lab-tcp } }
quiz:
  - question: TCP 对它所连接的两个程序承诺了什么？
    options:
      - 字节完整、按序到达；否则它们会知道连接断了
      - 每条消息都在一毫秒内到达
      - 数据是加密的
    answer: 0
    explain: TCP 会重传丢失的部分并重新排序。速度和加密是另外的事（TLS 在它上面加加密）。
  - question: TCP 连接打开之后，哪一方先发？
    options:
      - 永远是客户端
      - 看应用层协议怎么定；TCP 本身允许双方随时发
      - 永远是服务器
    answer: 1
    explain: 实验里的服务台先问候你，而 HTTP 服务器会等你的请求。TCP 本身允许任何一方先发。
  - question: 你在 TCP 上先发 "HEL" 再发 "LO"。对方可能读到什么？
    options:
      - 永远正好两段：HEL 和 LO
      - 只有 LO，因为 TCP 保留最后一条消息
      - 一整段 HELLO，或者以任何其他方式被切开
    answer: 2
    explain: TCP 是字节流，没有消息边界。你的每次发送怎么被切分成读取，由网络决定，所以协议需要分帧（下一课）。
---

在网络那一单元里你远远见过 TCP：三次握手，以及「可靠、有序的字节流」这个承诺。HTTP、WebSocket、MQTT、数据库和邮件全都跑在它上面。这一单元你往下走一层，自己接住这条流，中间没有 HTTP。

## 一条连接，两个套接字

**套接字（socket）** 是程序用来操作一条连接的那个把手：它这一端。一条 TCP 连接由四样东西确定——两侧各自的地址和端口。服务器在大家都知道的端口上监听；你这一侧由操作系统随便挑一个临时的。所以服务器的流量日志会写 `#1 connected from 127.0.0.1:53712` 这样一行。

```anatomy
tcp:// | 一条原始 TCP 连接（tls:// 会加上 TLS 加密）
127.0.0.1 | 服务器的 IP 地址
:9000 | 服务器的端口：那台机器上的哪个程序
```

## 谁先开口？

连接打开之后，TCP 不在乎谁在什么时候说话：哪一方都可以随时发。真正决定的是**应用层协议**，也就是两个程序约定的规矩。有些服务器先开口问候（邮件服务器会自报 `220 …`）；另一些等客户端（HTTP、Redis 都是）。很多协议就是纯文本行，你手打就能说：给 Redis 发 `PING`，它回 `+PONG`。

```sequence
你 -> 服务器: connect（SYN、SYN-ACK、ACK）
服务器 --> 你: WELCOME TO THE LAB HELP DESK…
你 -> 服务器: HELLO
服务器 --> 你: HELLO! Your ticket number is…
你 -> 服务器: FIN：我不再发了
服务器 --> 你: FIN：我也不发了
```

## 是流，不是消息

TCP 搬的是**字节**，不是消息。你发 `HEL` 再发 `LO`，对方可能一次读到 `HELLO`，也可能读到 `H` 和 `ELLO`。对 TCP 来说这都是同一条流。下一课讲协议怎么标出「一条消息到此为止」。

> [!note] 可以这样想……
> 一根花园水管。你一杯一杯往里倒水，另一头按顺序全都流出来，一滴不丢。但在那一头，它只是一股水流：看不出这一杯到哪里结束、下一杯从哪里开始。

## 关闭

礼貌的关闭是 **FIN**（「我不再发了」）。两个方向各自关闭，所以一方可以停止发送而仍在接收。粗暴的关闭是 **reset**（RST），你会以「connection reset by peer」这个错误遇到它：对方没打招呼就断了，常常因为它崩了，或者不喜欢你发的东西。

## 在 Zorvik 里

**TCP 连接** 请求接受 `tcp://127.0.0.1:9000` 这样的地址。**连接** 会真的打开连接（握手真的发生，所以服务器能在你发任何东西之前先问候你）。日志显示收到的（蓝色 ↙）和你发出的（绿色 ↗），输入区可以发 **文本**、**JSON** 或 **二进制（hex）** 字节。**选项** 标签页决定收到的字节怎么切成消息，以及你每条消息发出时追加什么。

**什么时候用得上：** 你测的东西不是 HTTP：Redis 或邮件服务器、游戏服务器、支付终端，或者车间里的一台设备。你连上去，手打它的协议，看它到底回什么。
