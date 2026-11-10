---
id: bearer-and-jwt
title: Bearer 令牌与 JWT
summary: 登录之后你带的是令牌而不是密码；JWT 是一种你能读、但改不了的令牌。
minutes: 6
lab:
  title: 先读懂你的令牌，再用它
  goal: 登录、解开拿回来的 JWT，再用 Bearer 令牌访问受保护的接口。
  minutes: 7
  vars:
    token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1LTEwMjQiLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwicm9sZSI6ImF1ZGl0b3IiLCJzY29wZSI6InJlcG9ydHM6cmVhZCIsImlzcyI6Imh0dHBzOi8vbG9naW4ubGFiLnRlc3QiLCJpYXQiOjE3NjcyMjU2MDAsImV4cCI6NDEwMjQ0NDgwMH0.VxHJbhbaSOClPgIMxg0BB4Bm556QllkS7HKtOxXER1I
  servers:
    api:
      name: Accounts API
      kind: http
      http:
        routes:
          - name: Log in
            method: POST
            path: /login
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1LTEwMjQiLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwicm9sZSI6ImF1ZGl0b3IiLCJzY29wZSI6InJlcG9ydHM6cmVhZCIsImlzcyI6Imh0dHBzOi8vbG9naW4ubGFiLnRlc3QiLCJpYXQiOjE3NjcyMjU2MDAsImV4cCI6NDEwMjQ0NDgwMH0.VxHJbhbaSOClPgIMxg0BB4Bm556QllkS7HKtOxXER1I", "token_type": "Bearer", "expires_in": 3600}'
          - name: Me
            method: GET
            path: /me
            matchHeaders:
              - { key: Authorization, value: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1LTEwMjQiLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwicm9sZSI6ImF1ZGl0b3IiLCJzY29wZSI6InJlcG9ydHM6cmVhZCIsImlzcyI6Imh0dHBzOi8vbG9naW4ubGFiLnRlc3QiLCJpYXQiOjE3NjcyMjU2MDAsImV4cCI6NDEwMjQ0NDgwMH0.VxHJbhbaSOClPgIMxg0BB4Bm556QllkS7HKtOxXER1I }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"id": "u-1024", "name": "Ada Lovelace", "role": "auditor"}'
          - name: No token
            method: GET
            path: /me
            status: 401
            headers:
              - { key: Content-Type, value: application/json }
              - { key: WWW-Authenticate, value: Bearer }
            body: '{"error": "unauthorized", "message": "Send Authorization: Bearer <token>."}'
  steps:
    - text: |
        登录：发送 `POST {{api}}/login`，JSON 正文 `{"username": "ada", "password": "lovelace"}`。答案里有一个 `access_token`。
      hints:
        - 方法 POST，**Body** 标签页，类型 **JSON**。
        - "练习服务器接受任何用户名和密码；真实的服务可不会。"
        - "POST {{api}}/login，JSON 正文 {\"username\": \"ada\", \"password\": \"lovelace\"}，然后发送。"
      check:
        request: { server: api, method: POST, path: /login }
      solution:
        - send:
            method: POST
            url: "{{api}}/login"
            body: { type: json, text: "{\"username\": \"ada\", \"password\": \"lovelace\"}" }
    - text: |
        复制 `access_token` 的值并解码它：**工具 → 编解码 → JWT**。这个令牌给你的 `role` 是什么？
      hints:
        - 复制 `"access_token":` 后面引号里那一长串。它里面有两个点。
        - 在左侧栏打开 **工具**，再点 **编解码**，选 **JWT** 粘贴进去。**Payload** 框里列出了所有 claim。
        - "在 Payload 里找到 \"role\"，把它的值填进来。"
      check:
        answer: auditor
      solution:
        - answer: auditor
    - text: |
        以这个用户身份访问 `GET {{api}}/me`。实验把同一个令牌存在变量 `{{token}}` 里：在 **Auth** 标签页选 **Bearer token**，**Token** 里填 `{{token}}`。
      hints:
        - 不带令牌的话，`/me` 会回 401。
        - "Auth 标签页：类型 = Bearer token，Token = {{token}}，前缀 = Bearer（默认）。"
        - "用这个鉴权访问 GET {{api}}/me，然后发送。应该拿到 200 和 Ada 的资料。"
      check:
        all:
          - request: { server: api, method: GET, path: /me, status: 200, headers: { authorization: "Bearer {{token}}" } }
          - send: { auth: bearer, status: 200 }
      solution:
        - send: { method: GET, url: "{{api}}/me", auth: { type: bearer, token: "{{token}}", prefix: Bearer } }
quiz:
  - question: 谁都能解开 JWT 的 payload。那是什么阻止他们把 role 改成 "admin"？
    options:
      - payload 是加密的，只有服务器能读
      - 签名对不上了，服务器会拒收
      - JWT 一旦签发就变成只读
    answer: 1
    explain: 签名用的密钥只有签发方有。payload 里改一个字符，校验就失败。
  - question: bearer 令牌通常放在哪？
    options:
      - "放在 Authorization 头里：`Bearer <token>`"
      - 放在 URL 里，写成 `?token=`
      - 放在每个请求的 JSON 正文里
    answer: 0
    explain: Authorization 头是标准位置。URL 里的令牌会泄漏到日志和浏览器历史里。
  - question: 一个 JWT 的 `exp` claim 已经是过去时间。API 最可能回什么？
    options:
      - 403 Forbidden
      - 200 OK，过期时间只是个提示
      - 401 Unauthorized，你需要一个新令牌
    answer: 2
    explain: 过期的令牌不再能证明你是谁。重新登录（或者用刷新令牌）换一个新的。
---

每个请求都带上密码是危险的：它走得越频繁，能泄漏的地方就越多。所以现代 API 大多让你**登录一次**，然后给你一个**令牌**——一串代表「这个用户已登录，有效期到某个时刻」的长字符串。之后每次请求你带的是这个令牌。

```sequence
你 -> API: POST /login {"username": "ada", "password": "…"}
Note over API: 只验证一次密码
API --> 你: 200 {"access_token": "eyJhbGci…"}
你 -> API: GET /me（Authorization: Bearer eyJhbGci…）
API --> 你: 200 {"name": "Ada Lovelace"}
```

## Bearer 令牌

**Bearer 令牌**像现金：谁*持有*它就能用，不过问来历。它放在 `Authorization` 头里，前面加一个 `Bearer`：

```http
GET /me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…
```

在 Zorvik 里，**Auth** 标签页选 **Bearer token**，把令牌（或者更好的做法：`{{token}}` 这样的变量）放进 **Token**。**前缀** 保持 `Bearer`，除非 API 另有要求。

## JWT：你能读的令牌

很多令牌是 **JWT**（JSON Web Token，读作 "jot"）。一个 JWT 是三段 Base64，用点连起来：

```anatomy
eyJhbGciOiJIUzI1NiJ9 | header：用哪种算法签的名
.eyJzdWIiOiJ1LTEwMjQiLCJyb2xlIjoi… | payload：claims，关于你的事实
.VxHJbhbaSOClPgIMxg0BB4Bm… | 签名：证明前两段没被人改过
```

payload 里装的是 **claims**，也就是一条条 JSON 小事实：

| Claim | 含义 |
|---|---|
| `sub` | subject：这个令牌是关于谁的，通常是用户 id |
| `iss` | issuer：谁签发了它 |
| `exp` | expires：过期时间，1970 年 1 月 1 日以来的秒数 |
| `iat` | issued at：什么时候签发的 |
| `scope`、`role` | 持有者能做什么（名字各家不同） |

> [!note] 可以这样想……
> 音乐节的手环，上面印着你的信息。谁都能读上面的字，但手环有防拆封条。你想剪开把「单日票」改成「后台通行」，封条就断了，门口的保安立刻看出来。

## 解码不等于验证

**工具 → 编解码 → JWT** 会显示 header、payload，并把 `exp` 和 `iat` 翻译成看得懂的日期，令牌过期时还会提醒你。它*不*校验签名——那需要只有服务器才有的密钥。所以解码对调试很有用（「这个令牌过期了吗？是哪个用户的？」），但别因为能解开就相信一个令牌。

> [!warning] 把令牌当密码对待
> JWT 的 payload 谁都能读，所以绝不能往里放秘密，也不要把生产环境的真令牌粘到你不信任的网站上。放在标为秘密的变量里。

**什么时候用得上：** API 突然回 401。解一下令牌：如果 `exp` 是过去时间，你需要新令牌；如果 `scope` 或 `role` 里少了某个权限，你就知道为什么拿到 403 了。
