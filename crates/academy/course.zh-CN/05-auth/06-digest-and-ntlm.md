---
id: challenge-auth
title: Digest 与 NTLM
summary: 有些服务器会用一次挑战来回应你的第一个请求；Digest 和 NTLM 能在不发送密码的前提下证明你知道密码。
minutes: 6
added: 0.2.0
lab:
  title: 回应挑战
  goal: 读懂服务器的 Digest 挑战，用 Digest 鉴权作答，然后用 NTLM 登录一个 Windows 风格的服务器。
  minutes: 7
  playground: true
  vars:
    user: ada
    password: "{{secret.pw}}"
    domain: LAB
  steps:
    - text: |
        先不拿钥匙敲门。不带鉴权发送 `GET {{playground}}/digest-auth/auth/{{user}}/{{password}}`。服务器回 `401 Unauthorized`，它的 `WWW-Authenticate` 头里就是挑战。它声明了哪个 `realm`？填在下面。
      hints:
        - 新请求会继承工作区的鉴权，这里是「无鉴权」，所以直接发就行。挑战在响应头里，不在正文里。
        - "发送后，打开响应的 **Headers** 标签页，找到 WWW-Authenticate。它以 Digest 开头，后面是 name=\"value\" 对。"
        - "它写着 realm=\"zorvik@test\"。在答案框里输入 zorvik@test，然后点检查。"
      check:
        all:
          - send:
              url: "*/digest-auth/auth/ada/{{secret.pw}}"
              status: 401
              responseHeaders: { www-authenticate: "Digest *" }
          - answer: zorvik@test
      solution:
        - send: { method: GET, url: "{{playground}}/digest-auth/auth/{{user}}/{{password}}", auth: { type: none } }
        - answer: zorvik@test
    - text: |
        现在回应挑战。在 **Auth** 标签页选 **Digest 鉴权**，用户名 `{{user}}`，密码 `{{password}}`，再把同一个请求发一次。Zorvik 会读挑战、算出答案、把请求再发一遍，全都是一次点击内完成。
      hints:
        - 你只提供用户名和密码。realm、nonce 和算法都来自服务器的挑战。
        - "Auth 标签页 → 类型 **Digest 鉴权** → 用户名 {{user}}，密码 {{password}}（变量连花括号一起输入）。"
        - "同一个 URL，Digest 鉴权如上，然后发送。你会拿到 200 和 \"authenticated\": true。响应 **Info** 标签页的「已发送的请求」里能看到发出去的 Authorization: Digest … 头。"
      check:
        send:
          url: "*/digest-auth/auth/ada/{{secret.pw}}"
          status: 200
          auth: digest
          json: { authenticated: true }
          headers: { authorization: "Digest *" }
      solution:
        - send:
            method: GET
            url: "{{playground}}/digest-auth/auth/{{user}}/{{password}}"
            auth: { type: digest, username: "{{user}}", password: "{{password}}" }
    - text: |
        公司的文件服务器跑在 Windows 上，要 NTLM。用 **NTLM（Windows）** 鉴权发送 `GET {{playground}}/ntlm/{{domain}}/{{user}}/{{password}}`：用户名 `{{domain}}\{{user}}`，密码 `{{password}}`。
      hints:
        - NTLM 在同一条连接上走三条消息（你好、挑战、答案）。你按发送时 Zorvik 会把三条都发完。
        - "Auth 标签页 → 类型 **NTLM（Windows）** → 用户名 {{domain}}\\{{user}}（或者用户名填 {{user}}、**域** 填 {{domain}}），密码 {{password}}。"
        - "URL {{playground}}/ntlm/{{domain}}/{{user}}/{{password}}，NTLM 鉴权如上，然后发送。答案会写 \"authenticated\": true，带上你的用户和域。"
      check:
        send:
          url: "*/ntlm/LAB/ada/{{secret.pw}}"
          status: 200
          auth: ntlm
          json: { authenticated: true, domain: LAB }
      solution:
        - send:
            method: GET
            url: "{{playground}}/ntlm/{{domain}}/{{user}}/{{password}}"
            auth: { type: ntlm, username: "{{domain}}\\{{user}}", password: "{{password}}" }
quiz:
  - question: 用 Digest 鉴权时，你的密码是怎么到服务器那边的？
    options:
      - 以明文放在 Authorization 头里
      - 像 Basic 鉴权那样用 Base64
      - 根本没传。只有用它和服务器 nonce 算出的哈希会发出去
    answer: 2
    explain: 服务器发来一个新鲜的随机 nonce；Zorvik 用你的用户名、密码、nonce 和请求算一个哈希作答。密码本身从不离开你的电脑。
  - question: 为什么 Digest 请求要跑两个往返？
    options:
      - 第一个拿到挑战（401），第二个带上答案
      - Zorvik 为了保险每个请求都发两次
      - 服务器唤醒慢
    answer: 0
    explain: 没有挑战就没有可回答的东西。Zorvik 显示的耗时包含两个往返。
  - question: NTLM 登录的是连接，而不是单个请求。由此可以推出什么？
    options:
      - 你必须手动把挑战复制到下一个请求里
      - 它的消息都在同一条连接上，所以 NTLM 只能用 HTTP/1.1，也不能做负载测试
      - 任何 HTTP 版本都行，每条消息可以用新连接
    answer: 1
    explain: 答案只在拿到挑战的那条连接上有效。所以 Zorvik 把 NTLM 保持在一条 HTTP/1.1 连接上，负载测试也没法用 Digest 或 NTLM。
---

Basic 鉴权每个请求都把用户名和密码带上。Base64 只是把它们伪装了一下，任何看到请求的人一秒就能解开。有些服务器要求更聪明的做法：**挑战**。它不说「把密码告诉我」，而是说「这里有个随机数：用你的密码和它算一下，证明你知道密码」。

## 挑战与应答

```sequence
participants: Zorvik, 服务器
Zorvik -> 服务器: GET /files
服务器 --> Zorvik: 401, WWW-Authenticate: Digest realm="…", nonce="7f3a…"
Note over Zorvik: 用用户名、密码、nonce、方法和路径算哈希
Zorvik -> 服务器: GET /files, Authorization: Digest … response="c81e…"
Note over 服务器: 做同样的计算并比对
服务器 --> Zorvik: 200 OK
```

服务器的第一个应答是 `401`，带一个 `WWW-Authenticate` 头。对 **Digest** 鉴权来说它长这样：

```anatomy
Digest | 方案：用 Digest 鉴权作答
realm="zorvik@test" | 用哪一组用户和密码
nonce="7f3a9c…" | 一个随机数，每次挑战都是新的
qop="auth" | 答案覆盖哪些内容（auth-int 连正文一起）
algorithm=MD5 | 用哪种哈希（较新的服务器用 SHA-256）
```

Zorvik 用一个**哈希**作答：由用户名、密码、nonce、方法和路径算出的一枚指纹。服务器用它那边保存的密码做同样的计算。两边一致，你就进去了。

> [!note] 可以这样想……
> 一个哨兵和今天的口令。哨兵喊出一个随机词；你根据它和你们共享的秘密算出一个词回过去。旁边偷听的人也得不到能重复使用的东西，因为明天哨兵会喊另一个词。

## Zorvik 里的 Digest

在 **Auth** 标签页选 **Digest 鉴权**，填 **用户名** 和 **密码**，最好用 `{{变量}}`。其余全部来自服务器的挑战：算法（MD5、SHA-256 以及它们的 `-sess` 形式）、`qop`、`opaque`。你按 **发送** 时，Zorvik 先发请求、读挑战，再带着答案发一次。密码错了就会把服务器的 `401` 作为响应给你。

响应的 **Info** 标签页在 **已发送的请求** 下面显示第二次尝试的 `Authorization: Digest …` 头，耗时包含两个往返。

## NTLM：Windows 的方式

Windows 服务器（IIS、SharePoint、Exchange 以及很多公司内网）用 **NTLM**。它也是一种挑战，但分成三条消息：

```flow
协商 -> 挑战 -> 认证 -> 200 OK
```

NTLM 登录的是**连接**而不是请求，所以三条消息必须走同一条连接。Zorvik 在 HTTP/1.1 上替你完成这件事。选 **NTLM（Windows）**，用户名可以写成 `user`、`DOMAIN\user` 或 `user@domain`；**域** 和 **工作站** 是可选的。只接受 Kerberos 的服务器会拒绝 NTLM。

> [!warning] 密码是安全的，数据不是
> 挑战保护的是你的密码，而不是请求和响应。旁观者照样能读到你发出去和收回来的内容，所以重要的东西一定用 `https://`。

因为答案只在拿到挑战的那条连接上有效，Digest 和 NTLM 不能用于负载测试——那里请求会共用和复用连接。

**什么时候用得上：** 你测一个老的企业系统、路由器的管理页面，或一个对每个请求都回 `401` 加 `WWW-Authenticate` 头的 Windows 内网 API。选它声明的方案，剩下的来回由 Zorvik 处理。
