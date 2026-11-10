---
id: names-to-addresses
title: 名字如何变成地址
summary: DNS 顺着一条服务器链把名字问成地址，然后把答案记下来。
minutes: 6
lab:
  title: 查一次
  goal: 向实验里的 DNS 服务器询问一个名字的地址，再看看查一个不存在的名字会发生什么。
  minutes: 6
  servers:
    dns:
      name: Shop DNS
      kind: dns
      dns:
        records:
          - { name: shop.lab.test, type: A, value: 192.0.2.44, ttl: 300 }
          - { name: api.shop.lab.test, type: A, value: 192.0.2.45, ttl: 300 }
  steps:
    - text: |
        打开 **工具 → DNS 查询**。记录类型保持 **A**，名字填 `shop.lab.test`。在解析器按钮下面选 **自定义…**，输入 `{{dns_host}}`，也就是实验的 DNS 服务器。按 **查询**。
      hints:
        - shop.lab.test 这类实验名字只存在于实验的 DNS 服务器上，所以必须直接问它。
        - 在 DNS 查询里，点解析器按钮那一行（系统、Cloudflare 等）中的「自定义…」，在出现的输入框里填实验服务器的地址。
        - "类型 A · 名字 `shop.lab.test` · 解析器 自定义… → `{{dns_host}}` · 查询。"
      check:
        message: { server: dns, kind: dns, summary: "A shop.lab.test → 192.0.2.44*" }
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: shop.lab.test, dns: { server: "{{dns_host}}" } } } }
    - text: "`shop.lab.test` 指向哪个 IPv4 地址？填进来。"
      hints:
        - 看结果的「应答」部分，「数据」那一列。
        - 是四组用点分隔的数字，以 192 开头。
        - 在服务器里打开 Lab · Shop DNS，它的流量日志也记录了服务器给出的每个应答。
      check:
        answer: "192.0.2.44"
      solution:
        - answer: "192.0.2.44"
    - text: 现在在同一个解析器上查一个实验服务器上不存在的名字，比如 `shopp.lab.test`（注意那个拼写错误）。看看服务器回了什么。
      hints:
        - 实验服务器上没有记录的任何名字都行。
        - 只改名字，再按一次查询。解析器不用动。
        - "名字 `shopp.lab.test`，类型 A，解析器 `{{dns_host}}`，查询。答案是 NXDOMAIN：没有这个名字。"
      check:
        message: { server: dns, kind: dns, summary: "* → NXDOMAIN*" }
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: shopp.lab.test, dns: { server: "{{dns_host}}" } } } }
quiz:
  - question: DNS 解析器替你做了什么？
    options:
      - 加密你的流量
      - 帮你找出名字对应的地址，必要时去问其他 DNS 服务器
      - 托管网站
      - 给你的电脑分配 IP 地址
    answer: 1
    explain: 解析器负责跑腿完成一次查询，并把答案缓存起来。给设备分配 IP 地址是另一件事（DHCP）。
  - question: shop.example 的记录，最后由谁说了算？
    options:
      - 根服务器
      - .example 顶级域的服务器
      - shop.example 的权威服务器
      - 你自己的电脑
    answer: 2
    explain: 根服务器和顶级域服务器只负责指路。真正的记录在域名的权威服务器上。
  - question: 一次查询返回 NXDOMAIN。最可能的原因是什么？
    options:
      - 名字不存在，通常是拼错了
      - 服务器过载了
      - 端口被关了
      - 证书过期了
    answer: 0
    explain: NXDOMAIN 表示「不存在的域名」。检查拼写，并确认你问的解析器认识这个名字。
---

计算机之间用 IP 地址连接，但人记的是名字。**DNS**（Domain Name System）就是互联网的通讯录：你给它一个名字比如 `api.shop.example`，它还你一个地址比如 `93.184.216.34`。你发出的几乎每个请求之前，都会先发生这件事。

## 怎么读一个名字

名字要从右往左读，从最笼统的部分读到最具体的部分：

```anatomy
api.shop.example. | 完整名字（最后的点代表根，通常省略）
example | 顶级域（TLD），比如 com、org 或 uk
shop.example | 别人注册的域名
api | 子域，由域名所有者自己定
```

## 查找的过程

没有哪台服务器知道互联网上所有的名字。实际情况是，每一层都知道下一层由谁负责：

- **根服务器** 知道每个顶级域（`com`、`org`、`example` 等）由哪些服务器负责。
- **顶级域服务器** 知道它下面注册的每个域名由哪些服务器负责。
- 域名的**权威服务器** 保存它真正的记录。它说了算。

你的电脑并不亲自跑这一趟，而是去问一个**解析器**：一台替你跑腿的 DNS 服务器，通常由你的宽带、公司或某个公共服务提供。解析器会替你把这条链走完：

```sequence
participants: 你, 解析器, 根, 顶级域, 权威
你 -> 解析器: api.shop.example 在哪？
解析器 -> 根: api.shop.example？
根 --> 解析器: 去问 .example 的服务器
解析器 -> 顶级域: api.shop.example？
顶级域 --> 解析器: 去问 shop.example 的服务器
解析器 -> 权威: api.shop.example？
权威 --> 解析器: 93.184.216.34
解析器 --> 你: 93.184.216.34
Note over 解析器: 记下来，下次直接用
```

四个往返听起来慢，但解析器会**缓存**（记住）它问到的答案。绝大多数查询一两毫秒就从它的记忆里答出来了。它能记多久，是 TTL 那一课的内容。

> [!note] 可以这样想……
> 去找一位人脉很广的图书管理员问书。他不知道每本书在哪，但他知道哪个馆在哪个楼、哪层楼有哪个书架，而且他记得今天早些时候有人问过哪些书。

## 你会看到的应答

- **NOERROR** 加记录：找到了。
- **NXDOMAIN**（「不存在的域名」）：这个名不存在，通常是拼错了。
- **SERVFAIL**：解析器试过了，但中间某一步失败了。
- **超时**：完全没有 DNS 服务器应答。

> [!tip] 以 .test 结尾的名字
> `.test` 是留给测试的，真实互联网上永远不存在，所以做实验很安全。`shop.lab.test` 这类名字只存在于实验自己的 DNS 服务器上。

## 在 Zorvik 里

**工具 → DNS 查询** 可以向任意 DNS 服务器提问。选记录类型、填名字、选问谁：**系统** 是你电脑平时用的解析器，**自定义…** 可以填任何服务器，比如 `127.0.0.1:5353`。想把查询留在集合里，就用标签栏的 **+ → DNS 查询**：用法一样，服务器填在它的**解析器**标签页。

**什么时候用得上：** 请求报「无法解析主机」。在怪服务器之前，先确认这个名字到底能不能变成地址，以及变成的是不是你期望的地址。
