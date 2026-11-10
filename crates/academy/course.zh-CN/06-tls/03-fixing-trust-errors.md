---
id: fixing-trust-errors
title: 正确地修复信任错误
summary: HTTPS 出问题时，先弄清是哪一项检查没过，然后通过信任正确的 CA 来修，绝不要关掉校验。
minutes: 7
lab:
  title: 诊断一次信任错误
  goal: 让一个 HTTPS 请求失败、读懂原因，再用 TLS 检查器区分「信任问题」和「名字问题」。
  minutes: 7
  playground: { tls: true }
  steps:
    - text: |
        发送 `GET {{playgroundTls}}/json`。练习服务器的证书来自实验自己的私有 CA，你的电脑不认识它，所以请求会失败。
      hints:
        - 这就是一个普通的 GET 请求，指向一个 `https://` 地址。
        - "新建请求，URL 填 {{playgroundTls}}/json，按发送，然后读那个代替响应的错误。"
        - "如果它反而成功了，说明你已经信任了实验的 CA：那正是本课最后的修法，这一步照样算完成。"
      check:
        any:
          - send: { url: "*/json", errorKind: tls }
          - send: { url: "{{playgroundTls}}/json", status: 200 }
      solution:
        - send: { method: GET, url: "{{playgroundTls}}/json" }
    - text: 错误信息用两个词说明了哪里出了问题（在技术细节部分连在一起写）。把它们填进来。
      hints:
        - 从错误信息开头读起。「invalid peer certificate」后面就是原因。
        - 意思是「这张证书是被我不认识的机构签的」。
        - "填：unknown issuer。"
      check:
        answer: ["re:(?i)unknown\\s*issuer", "re:(?i)not\\s+trusted"]
      solution:
        - answer: unknown issuer
    - text: |
        信任错误并不是唯一的一种。再用 **工具 → TLS 检查器** 检查 `{{=playgroundTls}}`，这次把 **Server name (SNI)** 设成 `shop.example`，就像你用一个证书并未覆盖的名字去连接。看 **Name matches** 这一项。
      hints:
        - SNI 字段决定客户端要哪个名字，并拿它和证书里的名字比对。
        - "Server = `{{=playgroundTls}}`，Server name (SNI) = shop.example，然后检查。"
        - "摘要里会显示 Name matches: No。这张证书只列了 localhost、127.0.0.1 和 ::1。"
      check:
        call: { method: tools.tlsInspect, ok: true, params: { sni: "*" }, result: { hostnameMatches: false } }
      solution:
        - call: { method: tools.tlsInspect, params: { host: "{{playgroundTls}}", sni: shop.example, runId: lab-tls-sni } }
quiz:
  - question: 一个内部 API 报「unknown issuer」。正确的修法是什么？
    options:
      - 对那个主机关掉证书校验
      - 从你信任的来源拿到公司 CA 的证书并信任它
      - 在公司网内把 URL 换成 http://
    answer: 1
    explain: 证书本身没问题，只是客户端不知道是谁签的。把那个 CA 加进来，所有检查照旧开着。
  - question: 你连的是 `https://10.0.0.5`，但证书只列了 `api.internal`。哪一项检查没过？
    options:
      - 名字检查
      - 日期检查
      - 证书链检查
    answer: 0
    explain: 你连接时用的名字必须是证书名字之一。改用 `https://api.internal`，而不是 IP 地址。
  - question: 关掉证书校验到底做了什么？
    options:
      - 没什么大不了，流量照样加密、照样私密
      - 让握手更快，在公司网络里很安全
      - 中间任何人都能冒充服务器并读到你的内容
    answer: 2
    explain: 只有加密没有认证，挡不住任何能坐到中间的人。正是校验让 HTTPS 可信。
---

HTTPS 请求迟早会在开始之前就失败，报一个关于证书的错误。让错误消失很诱人。这一课讲的是让它*正确地*消失。

## 是哪一项检查没过？

回想上一课的三项检查。每一种都有自己的错误，也都有自己的修法：

| 错误说 | 没过的检查 | 常见原因 | 正确的修法 |
|---|---|---|---|
| unknown issuer、not trusted | 证书链 | 私有或公司 CA；或者服务器漏发了中间证书 | 信任那个 CA；或修好服务器的证书链 |
| not valid for name | 名字 | 你用了 IP 地址或证书没列出的别名 | 用证书覆盖的名字连接；或重新签发 |
| expired、not yet valid | 日期 | 证书过期了；或者你电脑的时钟不准 | 续期；或修好时钟 |

**TLS 检查器**一眼给出这三个答案：**Trusted**、**Name matches**，以及还剩几天。

```flow
HTTPS 失败 -> TLS 检查器 -[不受信任]-> 信任那个 CA
TLS 检查器 -[名字不匹配]-> 换用正确的名字
TLS 检查器 -[已过期]-> 续期
```

> [!note] 可以这样想……
> 一个不认识访客证件的保安。「开除保安」（关掉校验）能让这位访客进去，也能让后面每一个冒充者进去。正确的做法是告诉保安该接受哪个发证机构。

## 为什么「关掉校验」不是修法

Zorvik 的错误信息里会提到可以关掉证书校验，**设置 → 请求** 和每个请求的 **Settings** 标签页里也确实有一个 **Verify TLS certificates** 开关。请让它保持开启。没有校验，你的客户端会接受*任何*证书，于是你和服务器之间的任何人都能在它的位置上作答。数据照样加密，只是加密给了攻击者。而且「只为测试」翻过的开关，总会不知不觉留在脚本、共享工作区和生产环境里。

## 正确的修法：信任那个 CA

你的公司，或者像这个训练营这样的测试环境，常常运行自己的**私有 CA**。它的证书完全有效，只是你的电脑还不认识这个 CA。告诉它：

- **公司 CA** 通常由 IT 装在你的电脑上。Zorvik 使用系统的信任库，所以那些本来就能用。
- **其他 CA**：在 Zorvik 里打开 **设置 → 证书**（错误信息也会指向那里），把它的 PEM 文件选为 **额外 CA 证书**。它会*在系统 CA 之外*被信任，其他所有检查照旧开着。

> [!warning] 只信任从可信渠道拿到的 CA
> 一个受信任的 CA 可以为*任何*名字背书。文件要通过你信任的渠道拿（IT 团队、项目的仓库），绝不要从那个正在失败的服务器上拿，不需要时就删掉。

## 实验之后试一试

实验的 CA 在 `lab-ca.pem` 里，就在训练营工作区文件夹中。那个文件夹是 `bootcamp`，位于 **设置 → 数据与隐私** 显示的应用数据文件夹里。

1. 打开 **设置 → 证书**，点 **额外 CA 证书** 旁边的 **Browse…**，选中 `lab-ca.pem`，然后 **保存**。
2. 再发送一次 `GET {{playgroundTls}}/json`：`200 OK`，校验依然是开着的。TLS 检查器现在显示 **Trusted**。
3. 用完之后回来点 **Clear**，再 **保存**。重置训练营会删掉 `lab-ca.pem`，而只要这个设置指向一个不存在的文件，Zorvik 就无法校验任何 HTTPS 服务器。

**什么时候用得上：** 新的内部服务、预发环境或公司代理报「unknown issuer」。要那份 CA 证书，加进来，校验继续开着。
