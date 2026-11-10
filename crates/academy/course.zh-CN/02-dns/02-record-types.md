---
id: dns-record-types
title: "记录类型：A、AAAA、CNAME、MX、TXT"
summary: 一个名字可以挂好几种记录，每种类型回答不同的问题。
minutes: 6
lab:
  title: 读一张名片
  goal: 问一个域名的邮件服务器、跟一次别名，并从 TXT 记录里找出验证码。
  minutes: 7
  servers:
    dns:
      name: Cafe DNS
      kind: dns
      dns:
        records:
          - { name: cafe.test, type: A, value: 192.0.2.10, ttl: 300 }
          - { name: cafe.test, type: AAAA, value: "2001:db8::10", ttl: 300 }
          - { name: www.cafe.test, type: CNAME, value: cafe.test., ttl: 300 }
          - { name: cafe.test, type: MX, value: 10 mail.cafe.test., ttl: 300 }
          - { name: mail.cafe.test, type: A, value: 192.0.2.25, ttl: 300 }
          - { name: cafe.test, type: TXT, value: "v=spf1 mx -all", ttl: 300 }
          - { name: cafe.test, type: TXT, value: "cafe-verification={{secret.word}}", ttl: 300 }
  steps:
    - text: |
        在 **工具 → DNS 查询** 里，向实验的 DNS 服务器（**自定义…** → `{{dns_host}}`）查 `cafe.test` 的 **MX** 记录：哪个服务器负责接收这家咖啡馆的邮件？
      hints:
        - 记录类型在名字左边。点一下，选 MX。
        - 解析器和上一课一样，用「自定义…」填实验服务器的地址。
        - "类型 MX · 名字 `cafe.test` · 解析器 自定义… → `{{dns_host}}` · 查询。答案是 10 mail.cafe.test。"
      check:
        message: { server: dns, kind: dns, summary: "MX cafe.test → *mail.cafe.test*" }
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: MX, url: cafe.test, dns: { server: "{{dns_host}}" } } } }
    - text: 现在用 **A** 类型查 `www.cafe.test`。注意答案先是一条 **CNAME** 记录，然后才是它指向的地址。
      hints:
        - 别名（CNAME）指向另一个名字，地址在那个名字上。
        - 把类型换回 A，名字改成 www.cafe.test。
        - "类型 A · 名字 `www.cafe.test` · 同一个解析器 · 查询。你会看到两条记录：CNAME cafe.test，然后 A 192.0.2.10。"
      check:
        message: { server: dns, kind: dns, summary: "A www.cafe.test → CNAME*" }
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: A, url: www.cafe.test, dns: { server: "{{dns_host}}" } } } }
    - text: 这家咖啡馆用一条 **TXT** 记录证明它拥有自己的域名。查 `cafe.test` 的 TXT 记录，把验证码（`cafe-verification=` 后面那段）填进来。
      hints:
        - 类型选 TXT，名字填 cafe.test。
        - 有两条 TXT 记录。一条是给邮件用的（v=spf1…），另一条里是验证码。
        - 复制「cafe-verification=」后面的那个词和数字。
      check:
        all:
          - message: { server: dns, kind: dns, summary: "TXT cafe.test → *" }
          - answer: "{{secret.word}}"
      solution:
        - call: { method: dns.query, params: { request: { name: DNS lookup, kind: dns, method: TXT, url: cafe.test, dns: { server: "{{dns_host}}" } } } }
        - answer: "{{secret.word}}"
quiz:
  - question: 哪种记录类型存放 IPv6 地址？
    options:
      - A
      - CNAME
      - MX
      - AAAA
    answer: 3
    explain: A 是 IPv4 地址，AAAA（读作 "quad A"）是 IPv6。
  - question: 某个服务让你「把这段验证码加到你的域名里」。这通常用什么记录类型？
    options:
      - TXT
      - MX
      - A
      - PTR
    answer: 0
    explain: TXT 记录存放自由文本，所以被拿来做归属校验和邮件安全设置。
  - question: 你查 api.example.com 的 MX 记录，得到 NOERROR 但没有记录。这说明什么？
    options:
      - 这个名不存在
      - DNS 服务器坏了
      - 名字存在，但它没有 MX 记录
      - 答案来自缓存
    answer: 2
    explain: NOERROR 表示名字存在。答案为空只说明它没有你要的那种记录。名字不存在才会是 NXDOMAIN。
---

一个 DNS 名字就像一张名片：可以挂好几条信息，每条各有用途。每一条叫一条**记录**，有**类型**、**值**和**TTL**（可以记多少秒）。这是记录在 *zone 文件*（记录它们的经典写法）里长什么样：

```text
cafe.test.       300  IN  A      192.0.2.10
cafe.test.       300  IN  AAAA   2001:db8::10
www.cafe.test.   300  IN  CNAME  cafe.test.
cafe.test.       300  IN  MX     10 mail.cafe.test.
cafe.test.       300  IN  TXT    "v=spf1 mx -all"
```

把其中一行拆开看：

```anatomy
www.cafe.test. | 名字：这条记录说的是谁
300 | TTL：可以缓存多少秒
IN | class：「Internet」，几乎永远是它
CNAME | 类型：这是哪种记录
cafe.test. | 值：数据，格式由类型决定
```

## 每周都会遇到的五种

- **A**：一个 IPv4 地址。「`cafe.test` 在 `192.0.2.10`。」一个名字可以有多条 A 记录，客户端挑一条，就把负载分到了不同服务器上。
- **AAAA**（"quad A"）：同上，只是 IPv6 地址。
- **CNAME**（规范名）：别名。「`www.cafe.test` 其实就是 `cafe.test`，去查那个。」解析器会顺着别名走，并把 CNAME 和最终地址都返回。带 CNAME 的名字不能再有别的记录。
- **MX**（邮件交换器）：哪个服务器接收这个域名的邮件，带一个优先级数字，数字小的先试。
- **TXT**：自由文本。用来证明域名归你所有（Google、Microsoft 等让你加的验证码就是这个），也用于 SPF、DKIM、DMARC 等邮件安全设置。

跟一个 CNAME 是这样的：

```flow
www.cafe.test -[CNAME]-> cafe.test -[A]-> 192.0.2.10
```

另外还有几种：**NS**（负责这个域名的名称服务器）、**SRV**（某个服务的主机和端口）、**PTR**（从 IP 地址反查名字）、**CAA**（哪些证书机构可以为这个域名签发证书）。

> [!note] 可以这样想……
> 一张名片。A 和 AAAA 是家庭住址，MX 说「信寄到办公室」，CNAME 说「看我另一张名片」，TXT 是备注栏，什么都能写。

> [!warning] 要问对类型
> 问一个名字没有的类型不算错误：答案就是空的（NOERROR，没有记录）。查到空结果时，先检查类型对不对。

## 在 Zorvik 里

**工具 → DNS 查询** 里，记录类型在名字左边；鼠标停在上面能看到每种类型的简短说明。应答会列出每条记录的**名称**、**类型**、**TTL** 和**数据**。涉及 CNAME 时你能看到整条链，别名在前。

**什么时候用得上：** 把自定义域名指向某个 API、把邮件迁到新服务商，或者某个服务让你「添加这条 TXT 记录来验证域名」。
