---
id: resolvers-and-doh
title: 解析器、公共 DNS 与 DNS over HTTPS
summary: 问哪个解析器会决定你看到什么；DoT 与 DoH 让你的查询不被旁人看见。
minutes: 6
lab:
  title: 两个解析器，两个答案
  goal: 向公司解析器和公共解析器问同一个问题，并看公司解析器把不认识的转发出去。
  minutes: 6
  servers:
    public:
      name: Public DNS
      kind: dns
      dns:
        records:
          - { name: cafe.test, type: A, value: 192.0.2.10, ttl: 300 }
    office:
      name: Office DNS
      kind: dns
      dns:
        records:
          - { name: intranet.cafe.test, type: A, value: 10.20.30.40, ttl: 300 }
        upstream: "{{public_host}}"
  steps:
    - text: |
        在 **工具 → DNS 查询** 里，用 `{{public_host}}` 上的 **Public DNS** 查 `intranet.cafe.test`（类型 **A**）。
      hints:
        - 有两个实验 DNS 服务器在跑：Public DNS 和 Office DNS，它们知道的名字不一样。
        - 解析器用「自定义…」，填这一步给出的 Public DNS 地址。
        - "类型 A · 名字 `intranet.cafe.test` · 解析器 自定义… → `{{public_host}}` · 查询。公共解析器根本没听说过它：NXDOMAIN。"
      check:
        message: { server: public, kind: dns, summary: "A intranet.cafe.test → NXDOMAIN*" }
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: intranet.cafe.test, dns: { server: "{{public_host}}" } } } }
    - text: 用 `{{office_host}}` 上的 **Office DNS** 问完全相同的问题。把它答出的地址填进来。
      hints:
        - Office DNS 扮演你公司的解析器。
        - 只换解析器，名字和类型都不动。
        - "解析器 自定义… → `{{office_host}}`，然后查询。从「数据」列复制地址。"
      check:
        all:
          - message: { server: office, kind: dns, summary: "A intranet.cafe.test → 10.20.30.40*" }
          - answer: "10.20.30.40"
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: intranet.cafe.test, dns: { server: "{{office_host}}" } } } }
        - answer: "10.20.30.40"
    - text: |
        现在用 **Office DNS** 查 `cafe.test`。它没有这个名字的记录，所以会把问题**转发**给公共解析器。在 **服务器** 里打开 **Lab · Office DNS**，看它的流量日志怎么记这一笔。
      hints:
        - 解析器还是 Office DNS，只改名字。
        - "类型 A · 名字 `cafe.test` · 解析器 `{{office_host}}` · 查询。你依然拿到 192.0.2.10，是从 Public DNS 取回来的。"
        - Office DNS 的流量日志里，那一行写的是「A cafe.test → 转发到」公共服务器的地址。
      check:
        message: { server: office, kind: dns, summary: 're:(?i)^[A-Z]+ cafe\.test → forwarded' }
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: cafe.test, dns: { server: "{{office_host}}" } } } }
quiz:
  - question: 在公司里 intranet.cafe.test 能用，在家里返回 NXDOMAIN。最可能的原因是什么？
    options:
      - 服务器晚上关机了
      - 你家的 Wi-Fi 封了 443 端口
      - 记录的 TTL 到期了
      - 公司解析器知道公共解析器不知道的内部名字
    answer: 3
    explain: 这叫分裂视图 DNS。私有名字只存在于公司的解析器上，你在公司或走 VPN 才能问到。
  - question: DNS over HTTPS（DoH）改变了什么？
    options:
      - 它加密查询，网络上其他人读不到也改不了
      - 它让每次查询都跳过缓存
      - 它让你能注册新域名
      - 它用名字替代 IP 地址
    answer: 0
    explain: 经典 DNS 以明文传输。DoH（和 DoT）把同样的问题和答案放进一条加密连接里。
  - question: Zorvik 里「系统」这个解析器预设会去问哪些服务器？
    options:
      - Cloudflare 的 1.1.1.1
      - 直接问每个域名的权威服务器
      - 你电脑网络设置里的解析器，包括 VPN 和公司 DNS
      - Google 的 8.8.8.8
    answer: 2
    explain: 「系统」用的就是你电脑其它程序用的解析器，所以它看到的和你其他应用看到的一样。
---

同一个名字，问不同的人可能得到不同答案。搞清楚是哪个解析器在回答你的查询，能解开一大半「但在我这儿是好的」之谜。

## 谁在回答你的查询？

你的电脑里内置了一个很小的**存根解析器**。它自己不遍历 DNS 树，而是把每个问题交给网络设置里列出的**递归解析器**，由后者去走（或者直接从自己的缓存回答）。

```flow
你的应用 -> 存根解析器（操作系统） -> 递归解析器 -> 根、顶级域和权威服务器
```

哪些递归解析器？看你在哪：

- **在家里**，通常是你家路由器，它再把问题转给宽带运营商。
- **在公司或 VPN 上**，是公司的解析器。它们常常知道 `jira.corp.internal` 这类别处根本不存在的内部名字。
- **公共解析器**任何人都能用：Cloudflare（`1.1.1.1`）、Google（`8.8.8.8`）、Quad9（`9.9.9.9`，它还会拦截已知的恶意域名）。

## 为什么答案不一样

- **分裂视图 DNS**：公司解析器把 `intranet.cafe.test` 解析成私有地址，而公共解析器说 NXDOMAIN。
- **缓存**：某个解析器可能还存着旧答案（回想 TTL 那一课）。
- **位置**：大站点会给每个解析器它附近数据中心的地址。
- **过滤**：有些解析器会故意拦截广告、恶意软件或某一类站点。

解析器也不必什么都知道。它可以把答不上来的问题**转发**给另一个解析器。公司解析器常常自己回答内部名字，其余的都转给公共解析器。

> [!note] 可以这样想……
> 你问「咖啡馆怎么走」。楼里的同事指你去大厅那家；街上的陌生人指你去市中心那家。站在他们的位置看，两个都没错。

## 让查询保持私密

经典 DNS 是明文消息，走 UDP 53 端口。路上的任何人都能看见你查了哪些名字，甚至能改掉答案（比如咖啡馆的 Wi-Fi）。两种较新的方式给它加上了加密：

| | 怎么传输 | 端口 |
|---|---|---|
| 经典 DNS | 明文 UDP（答案大时用 TCP） | 53 |
| **DoT**，DNS over TLS | 放进一条加密的 TLS 连接 | 853 |
| **DoH**，DNS over HTTPS | 作为 HTTPS 请求发到 `https://cloudflare-dns.com/dns-query` 这样的 URL | 443 |

DoH 看起来就跟普通网页流量一样，因此也很难被封锁。很多浏览器默认就用它。

> [!warning] 内部名字需要内部解析器
> 如果访问内部主机报「无法解析」，先确认你在 VPN 上，而且问的是公司的解析器，不是公共解析器。

## 在 Zorvik 里

**工具 → DNS 查询**（以及 DNS 查询的**解析器**标签页）里的按钮就是这些：**系统**（你电脑的解析器，含 VPN）、**Cloudflare**、**Google**、**Quad9**、**Cloudflare DoH**、**Google DoH**。**自定义…** 可以填任何服务器：`10.0.0.2` 这样的地址、DoT 用 `tls://`、DoH 用 `https://` URL。

**什么时候用得上：** 某个服务在你笔记本上好的、在服务器上不行（或者反过来），排查只在 VPN 里存在的主机，或者想看看公网看到的你的域名是什么样。
