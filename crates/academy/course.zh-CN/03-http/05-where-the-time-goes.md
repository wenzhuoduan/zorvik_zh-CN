---
id: where-the-time-goes
title: 时间花在哪里了
summary: 一个请求的耗时分成 DNS、连接、TLS、等待和下载，每个阶段指向不同的修法。
minutes: 6
lab:
  title: 找出慢的那一段
  goal: 在 Timing 标签页里对比一个快请求和一个慢请求，然后用超时让客户端放弃。
  minutes: 6
  playground: true
  steps:
    - text: 发送 `GET {{playground}}/delay/0`，打开响应的 **Timing** 标签页。每个阶段都极小，因为服务器就在你自己的电脑上，立刻就答。
      hints:
        - 实验场是一个练习服务器。/delay/0 不做任何等待就作答。
        - "发送 `GET {{playground}}/delay/0`，然后在响应的标签页里点 Timing。"
      check:
        send: { url: "*/delay/0", status: 200 }
      solution:
        - send: { method: GET, url: "{{playground}}/delay/0" }
    - text: 现在发送 `GET {{playground}}/delay/800`。服务器会等 800 毫秒才作答。
      hints:
        - 只改 URL 末尾的数字。
        - "发送 `GET {{playground}}/delay/800`，再看一次 Timing 标签页。"
      check:
        send: { url: "*/delay/800", status: 200 }
      solution:
        - send: { method: GET, url: "{{playground}}/delay/800" }
    - text: 对比两张瀑布图。哪个阶段大约多了 800 毫秒？填它的名字。
      hints:
        - DNS、连接和下载都没怎么变，只有一根柱子比别的长得多。
        - 那根长条是「发出请求」到「收到第一个字节」之间的时间。
        - 就是「等待首字节（TTFB）」那一项。填 TTFB 就够，填 waiting 也行。
      check:
        answer: ["*waiting*", "*ttfb*", "*first byte*"]
      solution:
        - answer: Waiting (TTFB)
    - text: |
        让客户端先放弃。在请求的 **Settings** 标签页把 **Timeout** 设成 `500`，然后发送 `GET {{playground}}/delay/2000`。
      hints:
        - 超时单位是毫秒。服务器要 2000，所以客户端会先停止等待。
        - 打开请求的 Settings 标签页（就在 Auth 后面），在 Timeout 里填 500。
        - "Timeout `500`，URL `{{playground}}/delay/2000`，发送。你拿到的不是响应，而是一个超时错误。"
      check:
        send: { url: "*/delay/*", errorKind: timeout }
      solution:
        - send: { method: GET, url: "{{playground}}/delay/2000", settings: { timeoutMs: 500 } }
quiz:
  - question: 哪个阶段包含了服务器处理你的请求所花的时间？
    options:
      - DNS 查询
      - TCP 连接
      - 下载
      - 等待首字节（TTFB）
    answer: 3
    explain: TTFB 从发出请求算到答案开始到达，所以服务器的全部思考都算在里面。
  - question: Timing 标签页里 DNS 查询显示 0 毫秒。为什么？
    options:
      - URL 用的是 IP 地址，没有名字需要解析
      - DNS 服务器坏了
      - 这个请求用的是 POST
      - 响应没有正文
    answer: 0
    explain: URL 里是 127.0.0.1 这样的地址时没什么可解析的，所以 DNS 阶段是空的。
  - question: 一个 API 调用要 3 秒，几乎全在「下载」上。最可能的原因是什么？
    options:
      - 服务器的数据库慢
      - DNS 解析器太远
      - 响应非常大，或者链路很慢
      - TLS 证书过期了
    answer: 2
    explain: 下载是接收正文的时间。响应巨大（或链路慢）就会很长。分页或只要更少的字段能缓解。
---

「这个 API 很慢」可能指的是五种不同的事。Zorvik 把每个请求分段计时，你能看出哪一段慢，而不用猜。

## 一个请求的各个阶段

```sequence
participants: Zorvik, DNS, 服务器
Zorvik -> DNS: api.cafe.test 在哪？
DNS --> Zorvik: 192.0.2.10
Note over Zorvik, 服务器: TCP 连接，握手
Note over Zorvik, 服务器: TLS 握手，只对 https
Zorvik -> 服务器: GET /menu
Note over 服务器: 计算答案
服务器 --> Zorvik: 响应的第一个字节
服务器 --> Zorvik: 正文的其余部分
```

| 阶段 | 发生了什么 | 什么时候会慢 |
|---|---|---|
| **DNS 查询** | 名字变成地址 | 解析器慢或远（URL 里是 IP 地址时为 0） |
| **TCP 连接** | 握手打开连接 | 服务器远：大约一个往返 |
| **TLS 握手** | 双方商定加密（仅 https） | 距离远（再多一两个往返），或服务器忙 |
| **等待首字节（TTFB）** | 服务器干活，直到第一个字节回来 | 服务器慢：数据库查询、调别的 API、冷启动 |
| **下载** | 正文的其余部分到达 | 正文大，或链路慢 |

**TTFB** 是 **time to first byte** 的缩写，包含一个网络往返加上服务器的全部思考。API 慢，通常慢在这里。

> [!note] 可以这样想……
> 打电话订披萨。查号码（DNS）、拨号等人接（连接）、商定订单（TLS）、等它烤（TTFB）、外送路上（下载）。如果你等了一小时，是烤箱慢还是小电驴慢，差别很大。

## 读瀑布图

响应的 **Timing** 标签页把各阶段画成条形，一根接着上一根的结束开始，像瀑布，底部是总计。Zorvik 每个请求都用新连接，所以 DNS、连接和 TLS 一定被测量。

- **DNS 查询**很长？看解析器（DNS 单元）。
- **TCP 连接**或 **TLS 握手**很长？距离远，或者服务器吃力：ping 一下（网络单元）。
- **等待首字节（TTFB）**很长？是服务器自己在干活：它的日志、它的数据库、它调用的 API。
- **下载**很长？响应太大：分页、压缩，或者少要一些字段。

> [!warning] 超时
> 客户端不会无限等。时间到了还没有答案，它就以**超时**错误放弃。Zorvik 里每个请求都能在 **Settings** 标签页设置自己的上限（**Timeout**，毫秒）。

练习用的**实验场**提供 `/delay/<毫秒>`，会先等那么多毫秒再作答：一台按需变慢的服务器，用来测超时和加载状态正合适。

**什么时候用得上：** 有人说「好慢」。你可以回一个数字加一个阶段，比如「服务器在首字节之前花了 800 毫秒」，而不是一个感觉。
