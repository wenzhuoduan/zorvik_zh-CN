---
id: tcp-framing
title: "分帧：一条消息到哪里结束？"
summary: TCP 流没有消息边界，所以协议得自己标出来：用换行，或者在前面放一个长度。
minutes: 6
lab:
  title: 行与盒子
  goal: 跟一个按行读的服务器和一个带长度前缀的服务器对话，再看分帧对不上时会发生什么。
  minutes: 8
  servers:
    lines:
      name: 按行计数
      kind: tcp
      socket:
        mode: rules
        framing: line
        rules:
          - { match: regex, pattern: "(?i)^order ", reply: "ACCEPTED: {{message}} (ticket {{secret.ticket}})" }
          - { match: any, reply: "ERROR: start your line with ORDER, for example ORDER tea" }
    boxes:
      name: 按盒计数
      kind: tcp
      socket:
        mode: rules
        framing: lengthPrefixed
        lengthBytes: 2
        rules:
          - { match: regex, pattern: "(?i)^ping\\s*$", reply: "PONG {{secret.word}}" }
          - { match: any, reply: "ERROR: send PING" }
  steps:
    - text: |
        打开一个到 `{{lines}}` 的 **TCP 连接**，按 **连接**，发送 `ORDER tea`。等一下：什么都不会回来，因为服务器还在等这一行结束。

        现在按 **断开**，打开 **选项** 标签页，把 **每条文本消息追加** 设成 **\n（LF）**，再按 **连接** 并重新发一次 `ORDER tea`。
      hints:
        - "这个服务器一次读一行。一行只有遇到换行才结束，而默认情况下 Zorvik 就发你输入的原样，不多一个字节。"
        - "「每条文本消息追加」在 TCP 请求的选项标签页里。选项在连接时生效，所以改完要断开再连。"
        - "选项 → 每条文本消息追加：\\n（LF）。连到 {{lines}}，发 ORDER tea。回答会以 ACCEPTED 开头。"
      check:
        message: { server: lines, direction: in, text: "ORDER *", summary: "!unfinished*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: Line counter, kind: tcp, url: "{{lines}}", socket: { lineEnding: lf } } } }
        - call: { method: socket.send, params: { connId: lab-tcp, message: { type: text, text: ORDER tea } } }
        - wait: 200
    - text: 服务器接受了你的订单，给了你一个号牌。把号牌填在这里。
      hints:
        - "回答带蓝色箭头，以 ACCEPTED 开头。"
        - "号牌在括号里面。服务器那一侧也有：在服务器里打开 Lab · 按行计数，看它的流量。"
        - "复制 ticket 后面那段，不要右括号。"
      check:
        answer: "{{secret.ticket}}"
      solution:
        - answer: "{{secret.ticket}}"
    - text: |
        第二个服务器要求每条消息都装进一个盒子：先 2 个字节的长度，然后是内容。打开一个到 `{{boxes}}` 的 **TCP 连接**。在 **选项** 里把 **消息分帧** 设成 **长度前缀（大端）**，**前缀长度** 设成 **2 字节**。然后 **连接** 并发送 `PING`。
      hints:
        - "带长度前缀时，Zorvik 会把消息长度放在前面（读回复也按同样方式）。不需要换行。"
        - "「消息分帧」和「前缀长度」都在选项标签页里，按连接之前先设好。"
        - "选项：消息分帧＝长度前缀（大端），前缀长度＝2 字节。连到 {{boxes}}，发 PING。回答以 PONG 开头。"
      check:
        message: { server: boxes, direction: in, text: PING, summary: "!unfinished*" }
      solution:
        - call: { method: socket.connect, params: { connId: lab-tcp, request: { name: Box counter, kind: tcp, url: "{{boxes}}", socket: { framing: lengthPrefixed, lengthBytes: 2 } } } }
        - call: { method: socket.send, params: { connId: lab-tcp, message: { type: text, text: PING } } }
        - wait: 200
    - text: 按盒计数的服务器在回复的 `PONG` 后面跟了一个什么词？
      hints:
        - "Zorvik 把回复里那 2 个字节的长度去掉了，只显示消息本身。"
        - "看最新那条收到的消息，或者看服务器里 Lab · 按盒计数 的流量。"
        - "回复是 PONG 加一个带数字的词。把那个词连数字一起填上。"
      check:
        answer: "{{secret.word}}"
      solution:
        - answer: "{{secret.word}}"
        - call: { method: socket.close, params: { connId: lab-tcp } }
quiz:
  - question: 你在 TCP 上快速连发两次 HELLO。服务器可能读到什么？
    options:
      - 永远是两个独立的 5 字节块
      - 一整段 HELLOHELLO，或者 10 个字节被切在任意位置
      - 只有第二个 HELLO
    answer: 1
    explain: TCP 交付的是流。服务器每次读到多少，不必和你的每次发送对应，所以消息需要分帧。
  - question: 一条消息以 2 字节长度前缀 00 05 开头。后面的消息有多长？
    options:
      - 5 个字节
      - 2 个字节
      - 500 个字节
    answer: 0
    explain: 00 05 是用两个字节写出的数字 5，高位字节在前（大端）。
  - question: 你给一个按行读的服务器发了 ORDER tea，却一直没回应。最可能的原因是什么？
    options:
      - TCP 把你的消息弄丢了
      - 服务器只接受二进制数据
      - 你的消息没有以换行结尾，服务器还在等这一行剩下的部分
    answer: 2
    explain: TCP 不会悄悄丢字节。按行读的服务器需要那个换行，才知道你的消息说完了。
---

上一课你学到 TCP 是**字节流**，不是一串消息。发了 `ORDER tea` 再发 `ORDER cake`，服务器可能一次读到 `ORDER teaORDER cake`，也可能先读到 `ORD` 再读到剩下的。那它怎么知道一条消息在哪里结束、下一条从哪里开始？

TCP 上面的每个协议都用**分帧**来回答这个问题：一条标记消息边界的规则。常见的有三种。

## 1. 分隔符，通常是换行

消息在一个特殊字符处结束，几乎总是换行。有两种口味：**LF**（line feed，写作 `\n`）和 **CRLF**（回车加换行，`\r\n`）。SMTP（邮件）、Redis 和 HTTP/1.1 的请求头部分都是这么干的。

```anatomy
ORDER tea\n | 一条消息：到换行为止的所有内容
ORDER cake\r\n | CRLF 也行；很多服务器两种都接受
```

简单、可读，但消息里不能含分隔符，而且接收方得逐字节扫才能找到它。

## 2. 长度前缀

每条消息前面用几个字节说明它有多长。接收方先读长度，然后正好读那么多字节。二进制协议最爱这个：gRPC 在每条消息前放 5 字节头，MQTT 和很多数据库也编码了长度。

```anatomy
00 04 | 长度前缀：2 个字节，大端，表示 4
50 49 4E 47 | 消息的 4 个字节：P I N G
```

**大端**的意思是高位字节在前，和我们写数字的方式一样：`01 00` 就是 256。消息里可以含任何字节，也不用扫描。

## 3. 固定长度

每条消息正好，比如说，64 字节。今天很少见，但在老旧或极简的设备上会碰到。

不管用哪种规则，两边必须用同一种：

```flow
你的消息 -[加边界]-> TCP 字节流 -[找边界]-> 同样的消息
```

> [!note] 可以这样想……
> 句子需要句号。一串没有标点的词很难正确切分。换行就是句号；长度前缀相当于在开口之前先说「下一句有七个词」。

> [!warning] 分帧对不上时
> 两边不一致不会崩：接收方就只是等。按行读的服务器永远等不到换行，就一直等。带长度前缀的服务器收到裸的 `PING`，会把 `50 49` 读成长度 20,553，然后等两万多字节，而那些字节永远不会来。服务器「不理你」的时候，先查分帧。

## 在 Zorvik 里

TCP 请求的 **选项** 标签页负责分帧的两侧：**消息分帧**（**按到达原样**、**每行一条消息** 或 **长度前缀（大端）**）、**前缀长度**（1、2 或 4 字节），以及 **每条文本消息追加**（不追加、`\n` 或 `\r\n`）。选项在连接时生效。Zorvik 的服务器也有同样的设置，连接在消息中途关闭时，它们的流量会把剩下的字节标成**未完成的消息**。

**什么时候用得上：** 一台设备或服务「不理」你手打的消息。十有八九消息本身没问题，只是分帧错了：少一个换行，或者少一个长度前缀。
