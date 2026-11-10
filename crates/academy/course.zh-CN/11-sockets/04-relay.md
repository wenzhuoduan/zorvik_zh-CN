---
id: tcp-relay
title: 用中继看清线路上的字节
summary: TCP 中继站在客户端和服务器之间，把每个字节原样转发，并把两个方向都摊给你看。
minutes: 5
lab:
  title: 给线路上接个窃听器
  goal: 通过中继跟后端对话，并从中继的流量日志里读到两个方向的完整对话。
  minutes: 7
  servers:
    backend:
      name: 后端
      kind: tcp
      socket:
        mode: rules
        greeting: BACKEND READY
        lineEnding: lf
        rules:
          - { match: regex, pattern: "(?i)^ping\\s*$", reply: "PONG {{secret.word}}" }
          - { match: any, reply: "GOT: {{message}}" }
    relay:
      name: 窃听器
      kind: tcpProxy
      proxy:
        target: "{{backend_host}}"
  steps:
    - text: |
        打开一个指向**中继** `{{relay}}`（不是后端）的 **TCP 连接**，按 **连接**，发送 `PING`。你会收到后端的问候和回答，就像直接在跟它说话。
      hints:
        - "中继在自己的端口上监听，把所有东西转发给后端。你的 App 只需要知道中继的地址。"
        - "从标签栏的 + 菜单建一个 TCP 连接，地址栏填 {{relay}}，按连接。"
        - "地址 {{relay}}，连接，输入 PING 按发送。BACKEND READY 和 PONG … 会回来。"
      check:
        message: { server: relay, direction: toTarget, text: "PING*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: Relay, kind: tcp, url: "{{relay}}" } } }
        - call: { method: socket.send, params: { connId: lab-tcp, message: { type: text, text: PING } } }
        - wait: 200
    - text: |
        现在从中间看。打开左侧栏的 **服务器**，点 **Lab · 窃听器**。它的 **流量** 会显示每一段字节：**→ target** 是从你到后端，**← target** 是从后端回来。回来的路上 `PONG` 后面跟了什么词？
      hints:
        - "服务器是左侧栏里的一个图标。中继以 Lab · 窃听器 的名字列在那里。"
        - "在中继的流量里，看标着 ← target 的行：那些字节来自后端。"
        - "找到含 PONG 的那条 ← target 行，把 PONG 后面那个词连数字一起复制下来。"
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
    - text: |
        中继还会记下它把每条连接转发到哪，写成 `#1 relayed to 127.0.0.1:…` 这样一行。后端在哪个**端口**上监听？
      hints:
        - "滚到中继流量的顶部，就在你的连接被打开之后。"
        - "那一行写着 #1 relayed to 127.0.0.1:…（# 后面的数字是你的连接序号）。冒号后面就是端口。"
        - "只填 relayed to 那行里 127.0.0.1: 后面的数字。"
      check:
        answer: "{{backend_port}}"
      solution:
        - answer: "{{backend_port}}"
    - text: |
        最后，绕开中继：直连后端 `{{backend}}`，发送 `DIRECT hello`。然后对比两份流量日志。中继从没见过这条消息，而后端的日志里会看到一条来自中继的连接、一条直接来自你的连接。
      hints:
        - "中继只能看到经过它的东西。"
        - "用一个新的 TCP 连接（或者改地址后重连），地址写 {{backend}}。"
        - "连到 {{backend}}，发 DIRECT hello，然后在服务器里打开 Lab · 后端，看它的流量。"
      check:
        message: { server: backend, direction: in, text: "DIRECT*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: Backend, kind: tcp, url: "{{backend}}" } } }
        - call: { method: socket.send, params: { connId: lab-tcp, message: { type: text, text: DIRECT hello } } }
        - wait: 200
        - call: { method: socket.close, params: { connId: lab-tcp } }
quiz:
  - question: 中继流量日志里标着「→ target」的行装的是什么？
    options:
      - 中继从客户端收到、并转发给目标的字节
      - 目标回给客户端的字节
      - 中继遇到的错误
    answer: 0
    explain: 箭头表示方向。「→ target」是客户端到目标，「← target」是回来的回答。
  - question: 你通过中继连接。后端看到的客户端是哪个地址？
    options:
      - 你的 App 的地址
      - 你办公室路由器的地址
      - 中继的地址，因为中继自己向后端开了连接
    answer: 2
    explain: 中继持有两条连接，一条跟你、一条跟目标。目标只跟中继说话。
  - question: 为什么要在 App 和服务器之间放一个中继？
    options:
      - 让网络更快
      - 看清双方到底交换了哪些字节，而不用改动任何一方
      - 自动加密一切
    answer: 1
    explain: App 只要把地址指向中继。中继原样转发字节并记录下来。
---

当 App 和服务器一起出问题时，最好的证据就是那段对话本身：双方到底发了哪些字节。但你不总能给 App 加日志（一个手机游戏、一台设备、一个数据库驱动），服务器也可能是别人的。办法就是站到中间去。

## 中继做什么

**TCP 中继**（也叫 TCP 代理）在自己的端口上监听。有客户端连上来，中继就向**目标**服务器开第二条连接，然后把字节原样双向复制，并记录它转发的一切。

```flow
你的 App -[字节]-> 中继 -[同样的字节]-> 目标服务器
目标服务器 -[回复]-> 中继 -[同样的回复]-> 你的 App
```

在 App 这边唯一的变化是地址：它连的是中继，而不是真服务器。

```sequence
participants: 你, 中继, 后端
你 -> 中继: connect
中继 -> 后端: connect（第二条连接）
后端 --> 中继: BACKEND READY
中继 --> 你: BACKEND READY
你 -> 中继: PING
中继 -> 后端: PING
后端 --> 中继: PONG …
中继 --> 你: PONG …
Note over 中继: 把每个字节块都记下来，两个方向都记
```

从这张图能推出两件事：

- 中继持有**两条连接**。后端把中继当成客户端，不是你。
- 中继只看得到**经过它**的东西。直接跟后端说话，中继一无所知。

> [!note] 可以这样想……
> 一个逐字复述每一句话、并且全都记下来的口译员。双方都不用改变说话方式，事后你还有一份完整对话的记录。

## 读流量

在 Zorvik 中继的 **流量** 里，每一块字节是一行：

- **→ target**：来自客户端，转发给目标。
- **← target**：来自目标，回给客户端。
- `#1 relayed to 127.0.0.1:9000` 这样的行说明每条连接去了哪里，`#1` 是连接编号，方便区分。

这些行是*字节块*，也就是网络碰巧交付的那一段，不是消息。分帧依然成立：一条消息可能横跨两行，一行也可能装两条消息。

## 在 Zorvik 里

在 **服务器** 里用 **+** 和 **TCP 中继** 新建一个，填上 **目标服务器**（`host:port`）。中继在自己的 **端口** 上监听。开关 **用 TLS 连接目标** 让纯文本客户端能接上 TLS 服务器，这样本来会在出口被加密的流量就变得可读。

> [!warning] 只在你被允许测试的系统上用
> 中继能看到每一个字节，包括明文发送的密码。只用在你自己的 App、测试环境和你有权检查的服务器上。

**什么时候用得上：** 某个客户端库、设备或老系统用它自己的协议跟服务器说话，然后出了问题。把它指向中继，复现问题，读两个方向的确切字节，而不是靠猜。
