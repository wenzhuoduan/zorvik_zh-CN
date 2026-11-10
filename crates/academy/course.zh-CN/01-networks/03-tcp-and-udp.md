---
id: tcp-and-udp
title: TCP 与 UDP
summary: TCP 在连接上传送可靠、有序的字节流；UDP 一条条发消息，什么也不保证。
minutes: 6
lab:
  title: 一个电话，一张明信片
  goal: 打开一条 TCP 连接并收到问候，然后完全不建连接地发一个 UDP 数据报。
  minutes: 8
  servers:
    tcp:
      name: TCP Greeter
      kind: tcp
      socket:
        mode: echo
        greeting: "Hello, you are connected! Your code word is {{secret.word}}."
    udp:
      name: UDP Mailbox
      kind: udp
      socket:
        mode: rules
        rules:
          - match: contains
            pattern: ping
            reply: pong
  steps:
    - text: |
        用标签栏右端的 **+** 新建标签页 → **TCP 连接**。地址填 `{{tcp}}`，按 **连接**。
      hints:
        - 标签栏右端的 + 按钮提供所有类型的请求。
        - 选「TCP 连接」，在地址栏输入 `{{tcp}}`（里面存着 tcp://127.0.0.1 和实验端口）。
        - "+ → TCP 连接，地址 `{{tcp}}`，然后连接。连上以后按钮会变成「断开」。"
      check:
        message: { server: tcp, kind: open }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: TCP Greeter, kind: tcp, url: "{{tcp}}" } } }
    - text: 连接一打开、你什么都还没发的时候，服务器就打招呼了。把它问候里的暗号填进来。
      hints:
        - 问候是这条连接消息列表里的第一条消息。
        - 找「Your code word is」，把后面的词和数字复制下来。
        - 没有连接标签页，是因为用了「帮我做」？在服务器里打开 Lab · TCP Greeter，它的流量日志里有发出去的问候。
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
    - text: 在底部的消息框输入 `hello` 并按 **发送**。这个服务器会把每条消息原样回显。
      hints:
        - 留在第一步打开的 TCP 连接标签页里，连接还是通的。
        - 消息框在消息列表下面。必须先连上。
        - 输入 hello，然后按发送（或 ⌘↩ / Ctrl+Enter）。你的消息和回显都会出现在列表里。
      check:
        message: { server: tcp, kind: data, direction: in, text: "*hello*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: TCP Greeter, kind: tcp, url: "{{tcp}}" } } }
        - call: { method: socket.send, params: { connId: lab-tcp, message: { type: text, text: hello } } }
    - text: |
        现在寄张明信片。打开 **+** → **UDP 套接字**，地址填 `{{udp}}`，按 **连接**。UDP 的「连接」只是把你这一侧准备好：什么都还没到服务器。然后发送 `ping`。
      hints:
        - UDP 没有握手，服务器没法主动问候你，只有你发东西它才知道你。
        - "+ → UDP 套接字，地址 `{{udp}}`，连接，然后在消息框输入 ping 并按发送。"
        - 服务器会回「pong」。在服务器里打开 Lab · UDP Mailbox，就能看到你的数据报到达。
      check:
        message: { server: udp, kind: data, direction: in, text: "*ping*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-udp, request: { name: UDP Mailbox, kind: udp, url: "{{udp}}" } } }
        - call: { method: socket.send, params: { connId: lab-udp, message: { type: text, text: ping } } }
quiz:
  - question: 哪个协议在发数据之前会先握手建立连接？
    options:
      - UDP
      - TCP
      - 两个都会
      - 两个都不会
    answer: 1
    explain: TCP 以 SYN、SYN-ACK、ACK 握手开始；UDP 直接发。
  - question: 视频通话和游戏为什么常用 UDP？
    options:
      - 迟到的一帧没有意义，等重传只会增加延迟
      - UDP 一定是加密的
      - UDP 的数据包永远不会丢
      - UDP 不需要 IP 地址
    answer: 0
    explain: TCP 会卡住后面所有数据等丢失的包重传。对实时音视频来说，丢掉继续走更好。
  - question: 你发了一个 UDP 数据报，什么也没回来。你能确定什么？
    options:
      - 服务器挂了
      - 端口号写错了
      - 确定不了什么。数据报或回复可能丢了，也可能那个端口没程序监听
      - 服务器收到了但不想回
    answer: 2
    explain: UDP 不报告投递结果。没有消息可能有很多原因，测试时要看服务器日志或加超时。
---

IP 把数据包送到正确的电脑，端口把它送到正确的程序。但万一包在路上丢了，或者两个包顺序反了怎么办？这是**传输协议**的活，几乎所有场景都用两个之一：**TCP** 或 **UDP**。

## 分层

网络协议是层层叠上去的。每一层用下面那一层，但不关心它怎么实现：

```layers
应用层 | HTTP、DNS、WebSocket、gRPC、MQTT
传输层 | TCP（可靠流）与 UDP（数据报）
网络层 | IP：地址与跨网络的选路
链路层 | Wi-Fi、以太网、移动网络
```

你的 HTTP 请求由 TCP 承载，TCP 由 IP 承载，IP 走你的 Wi-Fi。一路上数据被切成**数据包**：每块最多约 1,500 字节。一个大文件下载就是几千个包，其中任何一个都可能延迟或丢失。

## TCP：谨慎的那位

**TCP**（Transmission Control Protocol）先用一个三步问候打开连接，叫**握手**：

```sequence
participants: 客户端, 服务器
客户端 -> 服务器: SYN（能说话吗？）
服务器 --> 客户端: SYN-ACK（可以，你听得见我吗？）
客户端 -> 服务器: ACK（很清楚）
Note over 客户端, 服务器: 连接已打开，数据可双向流动
```

之后 TCP 会给每个字节编号。接收方确认收到了什么；丢了的重发，乱序的重新排好。对面程序看到的就是一条干净的**字节流**，和发出时一模一样。代价是：握手要花一个往返，数据才能开始走；而且丢一个包会卡住后面所有内容。

用在：HTTP/1.1 与 HTTP/2、WebSocket、数据库、SSH、邮件。

## UDP：轻快的那位

**UDP**（User Datagram Protocol）没有握手，也没有连接。你把一个**数据报**（一条自包含的消息）发到某个地址和端口，就完事了。它可能到达、可能到两次、可能乱序、也可能根本没到，而且没人会告诉你。换来的是快和简单。

用在：DNS 查询（一个小问题，一个小回答）、语音和视频通话、游戏，以及 QUIC——HTTP/3 底下的协议，它在 UDP 之上自己实现可靠性。

> [!note] 可以这样想……
> TCP 是一通电话：你拨号，对方接起，双方都知道通了，听不清就说「不好意思，再说一遍」。UDP 是一张明信片：又便宜又快，但你永远不知道它到没到、什么时候到。

| | TCP | UDP |
|---|---|---|
| 先建连接 | 是，要握手 | 不 |
| 投递 | 保证，且保序 | 尽力而为 |
| 数据形态 | 一条字节流 | 一个个数据报 |
| 典型用途 | Web、API、数据库 | DNS、语音、视频、游戏 |

## 在 Zorvik 里

标签栏的 **+** 可以打开 **TCP 连接** 或 **UDP 套接字**。对 TCP，**连接**会真的建立连接（握手会发生），所以服务器能在你发任何东西之前先问候你。对 UDP，连接只是把你这一侧准备好：在按 **发送** 之前，什么都到不了服务器。

> [!warning] 对 UDP 来说，没有回应是正常的
> UDP 服务器不回你时，你得到的是沉默，而不是错误。测 UDP 时看服务器日志，才知道你的数据报有没有到。

**什么时候用得上：** 排查 HTTP 以下的任何问题：用自有 TCP 协议的设备、发 UDP 的监控程序，或者一个「就是超时」的 DNS 查询。
