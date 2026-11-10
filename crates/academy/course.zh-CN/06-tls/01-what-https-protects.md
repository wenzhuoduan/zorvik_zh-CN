---
id: what-https-protects
title: HTTPS 保护了什么
summary: HTTPS 就是跑在 TLS 里的 HTTP，它让你发送的内容保持私密、不被篡改，并且确实送到正确的服务器。
minutes: 6
lab:
  title: 窃听一次登录
  goal: 通过一个中继用明文 HTTP 发送登录，看清窃听者能看到的一切。
  minutes: 5
  vars:
    password: "{{secret.pw}}"
  servers:
    bank:
      name: Piggy Bank API
      kind: http
      http:
        routes:
          - name: Log in
            method: POST
            path: /login
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"session": "{{secret.session}}", "balance": 1250.75}'
    tap:
      name: Wiretap
      kind: tcpProxy
      proxy:
        target: "{{bank_host}}"
  steps:
    - text: |
        实验在你和 Piggy Bank API 之间放了一个 **Wiretap**：一个把每个字节都原样转发并记录下来的中继。用明文 HTTP *经过窃听器* 登录：

        `POST http://{{tap_host}}/login`，JSON 正文 `{"user": "ada", "password": "{{password}}"}`
      hints:
        - 地址是窃听器的，不是银行的。窃听器会把一切转发给银行。
        - "方法 POST，URL http://{{tap_host}}/login，Body：JSON。"
        - "JSON 正文 {\"user\": \"ada\", \"password\": \"{{password}}\"}，然后发送。应该拿到 200 和一个会话。"
      check:
        all:
          - message: { server: tap, kind: data, direction: toTarget, text: "*POST /login*" }
          - message: { server: tap, kind: data, direction: toTarget, text: "*{{secret.pw}}*" }
          - request: { server: bank, method: POST, path: /login }
      solution:
        - send:
            method: POST
            url: "http://{{tap_host}}/login"
            body: { type: json, text: "{\"user\": \"ada\", \"password\": \"{{password}}\"}" }
    - text: |
        现在你来当窃听者。打开 **服务器 → Lab · Wiretap**，读它的流量。你的密码就明明白白写在那里，银行的回答也一样。把窃听器看到的、银行回过来的 `session` 值填进来。
      hints:
        - 流量列表显示每一块字节。点一条就能看到全部。
        - 一条是你发往银行的请求；下一条是银行回来的回答。
        - "在回答里复制 \"session\": 后面的值，不要引号。"
      check:
        answer: "{{secret.session}}"
      solution:
        - answer: "{{secret.session}}"
quiz:
  - question: 下面哪一项是 HTTPS 能从同一个 Wi-Fi 上的人眼前藏住的？
    options:
      - 你连接的服务器地址和端口
      - 你请求的路径、请求头和正文
      - 你正在上网这件事本身
    answer: 1
    explain: TLS 加密整条 HTTP 消息。服务器的地址还是看得见，通常名字也看得见，因为网络要靠它们把数据送到。
  - question: TLS 的「完整性」防的是什么？
    options:
      - 有人在中途改了你的数据却不被发现
      - 有人读你的数据
      - 服务器宕机
    answer: 0
    explain: 每条 TLS 记录都带一个校验，哪怕改了一个比特也会失败，所以篡改能被发现。
  - question: 一个网站有有效证书、也显示了小锁。这能证明什么？
    options:
      - 网站背后的公司是诚实的，可以放心购买
      - 服务器被检查过有没有安全漏洞
      - 你正在和那个域名的所有者私密通信
    answer: 2
    explain: HTTPS 证明你在跟谁通信，并保护这条连接。它完全不说明那个网站值不值得信任。
---

到目前为止你发出去的一切都是明文。你和服务器之间的任何人都能读到：咖啡馆同一个 Wi-Fi 上的人、被入侵的路由器、爱管闲事的网络。**HTTPS** 解决了这件事。它还是你熟悉的那个 HTTP，只是跑在一条叫 **TLS**（Transport Layer Security，旧名字 SSL 现在还会冒出来）的保护隧道里。

```layers
HTTP | 方法、请求头、正文：你的请求，原样不动
TLS | 加密、校验并认证它上面的一切
TCP | 按序投递字节
IP | 在各地址之间搬运数据包
```

## TLS 给你什么

1. **私密**（加密）：只有你和服务器能读数据。在网线上它看起来就是一堆噪声。
2. **完整**：如果有人在中途改了一个比特，另一端立刻发现并断开连接。
3. **认证**：在发送任何东西之前，你的客户端会检查服务器的**证书**——一份签名文件，证明「我确实是 shop.example」。这样就挡住了直接冒充服务器的攻击者。

## 握手

在第一个 HTTP 字节之前，客户端和服务器要做一次简短的 **TLS 握手**：

```sequence
participants: 你, 服务器
你 -> 服务器: ClientHello：我支持的 TLS 版本和加密算法，我的密钥分片
服务器 --> 你: ServerHello：我的选择，我的密钥分片
Note over 你, 服务器: 双方算出相同的密钥；从此以后全部加密
服务器 --> 你: 证书，外加一个签名证明我持有它的私钥
Note over 你: 检查证书：签发者可信任？名字对得上？没过期？
你 -> 服务器: Finished
你 -> 服务器: GET /account（已加密）
服务器 --> 你: 200 OK（已加密）
```

双方商量出新鲜密钥，却从不把密钥本身发出去：各自发一个*密钥分片*，只有两端才能把它们合成同一把钥匙。这叫**密钥交换**。**加密算法（cipher）**是用这把钥匙加密的具体配方。

> [!note] 可以这样想……
> 寄明信片，和交给快递员一个封好、拆开能看出来的信封——快递员还要核对收件人证件。明文 HTTP 是明信片：每个分拣员都能读。HTTPS 是那个信封：人们仍然看得见寄往哪个地址，但看不到里面，而且封口一破就露馅。

## HTTPS *不*隐藏的东西

- **你连向哪里**：服务器的 IP 地址和端口，通常还有它的名字（客户端在握手时就会发它，服务器才知道该出哪张证书）。
- **多少、什么时候**：流量的大小和时间。
- **两端之内**：服务器照样看得见你发的一切；你自己电脑上运行的东西也是。

> [!warning] 明文 HTTP 只适合本机
> 实验服务器用明文 `http://`，因为它们从不离开你的电脑。任何处理密码、令牌或个人数据的真实 API 都必须用 `https://`。

**什么时候用得上：** 有人问「用 http 传 API Key 可以吗，反正只是测试环境？」你会知道答案是不行，而且能讲清楚窃听者会看到什么。
