---
id: ttl-and-caching
title: TTL 与缓存
summary: 每个应答都说明了自己能被记多久，这就是为什么 DNS 改动要过一阵才传遍所有人。
minutes: 5
lab:
  title: 一个答案能保鲜多久？
  goal: 读两条记录的 TTL，算出旧答案最多还能赖多久。
  minutes: 5
  servers:
    dns:
      name: Cafe DNS
      kind: dns
      dns:
        records:
          - { name: menu.cafe.test, type: A, value: 192.0.2.30, ttl: 1800 }
          - { name: status.cafe.test, type: A, value: 192.0.2.31, ttl: 30 }
  steps:
    - text: |
        在 **工具 → DNS 查询** 里，用实验的 DNS 服务器 `{{dns_host}}` 查 `menu.cafe.test`（类型 **A**）。这个答案可以被缓存多久？填 TTL，秒数或者 Zorvik 显示的写法都行。
      hints:
        - TTL 列在「类型」和「数据」之间。鼠标停在上面能看到准确的秒数。
        - "类型 A · 名字 `menu.cafe.test` · 解析器 自定义… → `{{dns_host}}` · 查询。"
        - Zorvik 显示 30m，也就是 1800 秒。两种答案都算对。
      check:
        all:
          - message: { server: dns, kind: dns, summary: "A menu.cafe.test → *" }
          - answer: ["1800", "1800s", "1800 s", "1800 sec", "1800 seconds", "30m", "30 m", "30 min", "30 minutes"]
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: menu.cafe.test, dns: { server: "{{dns_host}}" } } } }
        - answer: "1800"
    - text: 某个解析器在 **10 分钟前**缓存了这个答案。它还能继续给出这份缓存副本多少**分钟**？填数字。
      hints:
        - TTL 是 30 分钟，倒计时从解析器缓存它的那一刻开始。
        - 30 分钟 TTL 减去已经过去的 10 分钟。
        - 30 − 10 = 20。填 20。
      check:
        answer: ["20", "20m", "20 m", "20 min", "20 minutes"]
      solution:
        - answer: "20"
    - text: |
        现在查 `status.cafe.test`。如果咖啡馆此刻把状态页换到新地址，最长多少**秒**内，仍会有人被送到旧地址？
      hints:
        - 旧副本最多活到 TTL 那么久。
        - "用 `{{dns_host}}` 查 `status.cafe.test`（类型 A），读它的 TTL。"
        - TTL 是 30 秒，所以答案是 30。
      check:
        all:
          - message: { server: dns, kind: dns, summary: "A status.cafe.test → *" }
          - answer: ["30", "30s", "30 s", "30 sec", "30 seconds"]
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: status.cafe.test, dns: { server: "{{dns_host}}" } } } }
        - answer: "30"
quiz:
  - question: 记录的 TTL 说明了什么？
    options:
      - 缓存可以保留这个答案多少秒
      - 这条记录可以被查多少次
      - 有多少台服务器存了副本
      - 这个域名注册了多久
    answer: 0
    explain: TTL 是 "time to live"，单位秒。到期后，下一次查询要回到权威服务器。
  - question: 你一小时前改了 API 的 A 记录，但有些用户还在访问老服务器。为什么？
    options:
      - 改动失败了，得重做一次
      - DNS 改动需要重启服务器
      - 解析器缓存了旧地址，会一直用到 TTL 到期
      - 用户把 URL 打错了
    answer: 2
    explain: 互联网上并没有什么在「扩散」。只是旧副本到期了而已，TTL 长就要等得久。
  - question: 下周你要把 API 迁到新服务器。最聪明的第一步是什么？
    options:
      - 把 TTL 提到一周
      - 现在就调小这条记录的 TTL，这样过几天切换时大家都能很快跟上
      - 删掉记录再重新建一条
      - 什么都不用做，DNS 改动是即时的
    answer: 1
    explain: 提前几天调小 TTL，让原来那个长 TTL 先过期。之后改动几分钟内就能被所有人拿到。
---

如果每次查询都从根服务器一路走到权威服务器，互联网会慢得没法用。所以答案在几乎每一步都会被**缓存**（留着复用）：解析器里、你的操作系统里、浏览器里，甚至应用里。

## TTL：存活时间

每条记录都带一个 **TTL**（time to live）：缓存可以保留它多少秒。这个值由域名所有者决定。

```sequence
participants: 应用, 解析器, 权威
应用 -> 解析器: api.cafe.test？
解析器 -> 权威: api.cafe.test？
权威 --> 解析器: 192.0.2.30，TTL 3600
解析器 --> 应用: 192.0.2.30，TTL 3600
Note over 解析器: 保留一小时
应用 -> 解析器: api.cafe.test？（10 分钟后）
解析器 --> 应用: 192.0.2.30，TTL 3000，来自缓存
```

缓存会把 TTL 倒着数。你从缓存拿到的答案里，TTL 是**剩余**时间，不是原始值。数到零，这份副本就被丢掉，下一次查询再去问权威服务器。

> [!note] 可以这样想……
> 一张便利贴上写着朋友的电话号码，还标了「有效期到周五」。周五之前你都信这张纸条。如果朋友周三换了号码，你还是会一直拨旧的，直到周五。

## 为什么「DNS 改动要等一阵」

假设你把 API 迁到新服务器，并改了它的 A 记录。缓存过旧地址的解析器会继续给出旧地址，直到自己的副本过期。TTL 如果是 86,400 秒（一天），有些用户最长会有一整天还在访问老服务器。人们说的「等 DNS 生效」就是这个意思：没有什么在扩散，只是旧副本在慢慢过期。

选 TTL 是个取舍：

| TTL | 适合 | 代价 |
|---|---|---|
| 60–300 秒 | 可能很快要搬的东西、故障切换 | 查询更多，等待略高 |
| 3,600 秒（1 小时） | 大多数记录 | 改动最多一小时后生效 |
| 86,400 秒（1 天） | 几乎从不改动的记录 | 改动最多一天后生效 |

> [!tip] 搬家日的小技巧
> 迁移前一两天，把 TTL 调到 60 或 300 秒。等原来那个长 TTL 过期，再改地址：所有人几分钟内就拿到新地址。之后再把 TTL 调回去。

解析器也会记住某个名字*不存在*一段时间，这叫**否定缓存**。如果你在创建名字之前先查了它，那么名字建好之后的几分钟里，你可能还会拿到 NXDOMAIN。

## 在 Zorvik 里

每个 DNS 应答都有 **TTL** 列，显示成 `30m` 这样的简写；鼠标停在上面能看到准确秒数。直接问权威服务器（比如实验的 DNS 服务器）时，看到的总是完整 TTL；公共解析器可能显示一个更小的数字，会在多次查询之间倒数。

**什么时候用得上：** 你改了域名指向，但有些用户还在访问旧服务器；或者同事问「为什么我的笔记本上好的，你的不行？」
