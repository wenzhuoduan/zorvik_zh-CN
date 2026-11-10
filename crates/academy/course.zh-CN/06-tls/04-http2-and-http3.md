---
id: http2-and-http3
title: HTTP/2 与 HTTP/3
summary: 更新的 HTTP 版本保留同样的方法、请求头和状态码，但用更高效的方式承载；HTTP/3 则从 TCP 换到了 QUIC。
minutes: 6
lab:
  title: 换个档位
  goal: 用 HTTP/1.1 和 HTTP/2 发送同一个请求，再看清 HTTP/3 为什么必须走 HTTPS。
  minutes: 5
  playground: true
  steps:
    - text: |
        发送 `GET {{playground}}/echo`。练习服务器会把你的请求原样回显，包括它到达时用的 HTTP 版本。也看看响应上标的版本。
      hints:
        - 版本显示在响应状态旁边（**Info** 里也有），回显的 `httpVersion` 字段里也有。
        - "GET {{playground}}/echo，然后发送。走明文 http:// 时，Zorvik 默认用 HTTP/1.1。"
      check:
        send: { url: "{{playground}}/echo", status: 200 }
      solution:
        - send: { method: GET, url: "{{playground}}/echo" }
    - text: |
        在请求的 **Settings** 标签页把 **HTTP version** 设成 **HTTP/2 only**，再发一次。
      hints:
        - 请求自己的 **Settings** 标签页会覆盖应用默认值，只影响这一个请求。
        - "Settings 标签页 → HTTP version → HTTP/2 only，然后发送。"
        - "回显里现在写着 \"httpVersion\": \"HTTP/2\"。"
      check:
        send: { url: "{{playground}}/echo", status: 200, httpVersion: HTTP/2, json: { httpVersion: HTTP/2 }, request: { settings: { httpVersion: http2 } } }
      solution:
        - send: { method: GET, url: "{{playground}}/echo", settings: { httpVersion: http2 } }
    - text: |
        现在选 **HTTP/3 (QUIC)** 再发一次。它是故意失败的：读读原因。
      hints:
        - HTTP/3 跑在和前两种不同的传输层上。
        - "Settings 标签页 → HTTP version → HTTP/3 (QUIC)，然后发送，读错误。"
        - "错误会说明 HTTP/3 需要 https:// 地址，因为 QUIC 永远是加密的。"
      check:
        send: { url: "*/echo", request: { settings: { httpVersion: http3 } }, error: "*HTTP/3 needs an https*" }
      solution:
        - send: { method: GET, url: "{{playground}}/echo", settings: { httpVersion: http3 } }
quiz:
  - question: HTTP/1.1、HTTP/2 和 HTTP/3 之间，什么是不变的？
    options:
      - 字节在网络上怎么走
      - 方法、请求头、状态码和正文
      - 加密是不是可选的
    answer: 1
    explain: 请求的含义不变，变的只是打包和运送的方式。你保存的请求在任何版本下都能用。
  - question: HTTP/2 里的多路复用是什么？
    options:
      - 一条连接上同时进行很多请求和响应
      - 为了保险每个请求发两次
      - 自动压缩图片
    answer: 0
    explain: HTTP/1.1 每条连接一次只能一个请求。HTTP/2 会把许多请求交错发送，所以一个慢应答不会拖住其他请求。
  - question: HTTP/3 在你办公室失败，而 HTTP/2 正常。可能的原因是什么？
    options:
      - HTTP/3 只支持 GET 请求
      - 服务器的证书对 HTTP/3 来说太旧了
      - 网络屏蔽了 UDP，而 QUIC 跑在 UDP 上
    answer: 2
    explain: HTTP/3 用跑在 UDP 443 上的 QUIC，一些防火墙和代理会拦它。浏览器这时会悄悄退回 TCP 上的 HTTP/2。
---

你一直在用的 HTTP 是 **HTTP/1.1**，1997 年的版本，至今无处不在。两个更新的版本用更聪明的方式承载*同样的*请求（同样的方法、请求头、状态码和正文）。你的请求不用改，变的是网络上传的东西。

## HTTP/1.1：一次一个

HTTP/1.1 把请求以可读文本的形式发在一条 **TCP** 连接上，一次一个请求加一个响应。一个慢响应会挡住这条连接上的下一个请求，所以浏览器会并排开好几条连接。

## HTTP/2：同时很多个

**HTTP/2**（2015）只用一条 TCP 连接，把每条消息切成小的二进制**帧**。不同请求的帧交错发送，于是很多请求同时在途中；这叫**多路复用**。它还会压缩请求头，而请求头在请求之间大量重复。

```sequence
participants: 你, 服务器
Note over 你, 服务器: 一条连接
你 -> 服务器: stream 1: GET /users
你 -> 服务器: stream 3: GET /orders
服务器 --> 你: stream 3: 200（快的那条）
服务器 --> 你: stream 1: 200（慢的那条）
```

在互联网上，HTTP/2 走 HTTPS：客户端和服务器在 TLS 握手时用 **ALPN** 这个机制商量好（TLS 检查器会显示 `ALPN h2` 这样的结果）。走明文 `http://` 时，只有双方事先都知道才会用，比如实验里的练习服务器。

> [!note] 可以这样想……
> 超市收银。HTTP/1.1 是一个收银员一次服务一位顾客：前面那位磨蹭，整队都等。HTTP/2 是一个收银员轮流扫几个篮子的东西，没人会卡在一辆装满的购物车后面。

## HTTP/3：换一条路

HTTP/2 还有一个弱点：TCP 严格按顺序交付字节，所以丢一个包会让*所有*流都卡住，直到它被重传。**HTTP/3**（2022）用 **QUIC** 取代 TCP，这是一种建在 UDP 上的传输协议。每条流独立交付，连接建立也更快。

```flow
HTTP/1.1 或 HTTP/2 -> TLS（走 https 时）-> TCP -> IP
HTTP/3 -> QUIC（内置 TLS 1.3）-> UDP -> IP
```

加密是 QUIC 本身的一部分，所以 HTTP/3 只存在于 `https://` 之上。有些网络屏蔽 UDP，浏览器这时会悄悄退回 HTTP/2。

## Zorvik 里的版本

| 设置 | 含义 |
|---|---|
| 自动（支持时用 HTTP/2） | HTTPS 服务器支持时用 HTTP/2，否则 HTTP/1.1（应用默认） |
| 仅 HTTP/1.1 | 从不升级 |
| 仅 HTTP/2 | 服务器不会 HTTP/2 就失败 |
| HTTP/3（QUIC） | UDP 上的 QUIC：只走 https，且从不经过代理 |

在 **设置 → 请求 → HTTP version** 里为所有请求设置，或在单个请求的 **Settings** 标签页里单独设置。响应会显示实际用到的版本。**工具 → HTTP/3 检查** 能告诉你某个站点是否支持 HTTP/3。

> [!tip] 什么时候版本重要
> 大多数时候不重要。当一个 bug 只在某个版本出现（把 HTTP/2 弄乱的代理、不支持 HTTP/3 的负载均衡），或者你在比较性能时，它才重要。

**什么时候用得上：** 客户的浏览器表现和你的测试不一致，或者某个 API 在你笔记本上很快、经过代理就很慢。把版本钉住比一比，就能知道是不是传输层的问题。
