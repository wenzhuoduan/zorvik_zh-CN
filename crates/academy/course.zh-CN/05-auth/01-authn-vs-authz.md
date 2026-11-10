---
id: authn-vs-authz
title: 认证与授权
summary: 认证证明你是谁（不通过就是 401）；授权决定你能做什么（说不行就是 403）。
minutes: 5
lab:
  title: 三个访客，三种答案
  goal: 以未登录、普通用户、管理员三种身份访问同一个接口，读懂每个状态码的含义。
  minutes: 6
  vars:
    userToken: tok-user-7f3a
    adminToken: tok-admin-91c2
  servers:
    api:
      name: Reports API
      kind: http
      http:
        routes:
          - name: Admin
            method: GET
            path: /reports
            matchHeaders:
              - { key: Authorization, value: Bearer tok-admin-91c2 }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"reports": [{"id": 1, "title": "Q3 revenue"}, {"id": 2, "title": "Payroll"}]}'
          - name: Regular user
            method: GET
            path: /reports
            status: 403
            matchHeaders:
              - { key: Authorization, value: Bearer tok-user-7f3a }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"error": "forbidden", "message": "We know who you are, but your account may not see reports."}'
          - name: Nobody
            method: GET
            path: /reports
            status: 401
            headers:
              - { key: Content-Type, value: application/json }
              - { key: WWW-Authenticate, value: 'Bearer realm="reports"' }
            body: '{"error": "unauthorized", "message": "Who are you? Send a token in the Authorization header."}'
  steps:
    - text: 不登录，直接发送 `GET {{api}}/reports`。看看状态码。
      hints:
        - 新请求本来没有凭证，除非它的文件夹或工作区给了它。
        - 新建一个请求（⌘/Ctrl + N），输入 URL，按发送。
        - "方法 GET，URL {{api}}/reports，然后发送。应该拿到 401。"
      check:
        request: { server: api, method: GET, path: /reports, status: 401 }
      solution:
        - send: { method: GET, url: "{{api}}/reports" }
    - text: 这个 401 响应里有一个头，告诉客户端*该怎样*登录。它叫什么？
      hints:
        - 打开响应的 **Headers** 标签页。
        - 就是那个值以 `Bearer` 开头的头。
      check:
        answer: ["WWW-Authenticate", "WWW-Authenticate:*"]
      solution:
        - answer: WWW-Authenticate
    - text: |
        现在以普通用户身份发同一个请求。在 **Auth** 标签页里选 **Bearer token**，在 **Token** 里填 `{{userToken}}`。
      hints:
        - 实验在 Lab 环境里放了两个令牌。直接把变量连花括号一起打进去，Zorvik 会填上值。
        - "Auth 标签页：类型 = Bearer token，Token = {{userToken}}。前缀保持 Bearer。"
        - "然后发送：服务器应该回 403。"
      check:
        request: { server: api, method: GET, path: /reports, status: 403, headers: { authorization: "Bearer {{userToken}}" } }
      solution:
        - send: { method: GET, url: "{{api}}/reports", auth: { type: bearer, token: "{{userToken}}", prefix: Bearer } }
    - text: 把令牌换成 `{{adminToken}}`，再发一次。
      hints:
        - 只有令牌变了，请求本身不变。
        - "Auth 标签页：Token = {{adminToken}}，然后发送。应该拿到 200 和一份报告列表。"
      check:
        request: { server: api, method: GET, path: /reports, status: 200, headers: { authorization: "Bearer {{adminToken}}" } }
      solution:
        - send: { method: GET, url: "{{api}}/reports", auth: { type: bearer, token: "{{adminToken}}", prefix: Bearer } }
quiz:
  - question: 你带着一个过期的令牌发请求。哪个状态码最合适？
    options:
      - 401 Unauthorized
      - 403 Forbidden
      - 404 Not Found
    answer: 0
    explain: 服务器已经认不出你是谁了，也就是认证失败。重新登录，再重试。
  - question: 你登录得好好的，但你的账号不能删除发票。你预期哪个状态码？
    options:
      - 401 Unauthorized
      - 500 Internal Server Error
      - 403 Forbidden
    answer: 2
    explain: 服务器知道你是谁，答案是拒绝。再发同样的凭证也没用，你需要不同的权限。
  - question: 为什么有些 API 对你无权查看的东西回 404 而不是 403？
    options:
      - 因为 404 对服务器来说发得更快
      - 为了不暴露这个东西的存在
      - 因为 403 只在 HTTPS 上有效
    answer: 1
    explain: "\"Forbidden\" 等于确认那里有东西。对私密数据，有些 API 宁愿对陌生人说「这里什么都没有」。"
---

几乎每个真实 API 都想知道是谁在调用。这个问题背后其实是两道独立的检查，把它们混在一起，是「请求被拒」时最常见的困惑来源。

- **认证**（常缩写为 **authn**）：*你是谁？* 你用密码、密钥或令牌证明身份。你发出去的这份证明叫**凭证（credential）**。
- **授权**（**authz**）：*你能做什么？* 服务器知道你是谁之后，再检查你的权限：这个用户能不能读报告、删发票、看别人的数据？

```flow
请求 -> 你是谁？ -[不认识]-> 401 Unauthorized
你是谁？ -[认识]-> 你能做这件事吗？ -[不能]-> 403 Forbidden
你能做这件事吗？ -[能]-> 200 OK
```

> [!note] 可以这样想……
> 一栋办公楼。前台出示工牌，那是认证。你的工牌能开一些门但开不了另一些，那是授权。没有工牌，前台就不让你进（401）。工牌有效，但机房的门禁名单上没有你，门就不开（403）。

## 401 Unauthorized：「你是谁？」

名字虽然叫 Unauthorized，**401** 讲的其实是*认证*。服务器不知道你是谁：你没带凭证，或者凭证错了、过期了。401 响应通常带一个 **`WWW-Authenticate`** 头，说明服务器期望哪种方式，比如 `Bearer` 或 `Basic`。文档很薄的时候，这就是个大线索。

**该做什么：** 检查凭证到底有没有带上、有没有过期、是不是发给这台服务器的（测试环境的令牌在生产环境不生效）。

## 403 Forbidden：「我知道你是谁，不行」

**403** 表示认证过了，授权没过。再发同样的凭证不会改变任何事。你需要一个权限更多的账号，或者这个操作本来就不该由你来做。

**该做什么：** 看看你用的是哪个用户或令牌，它有什么角色和 scope。scope 是写进令牌里的权限；这一单元后面你会解码一个看看。

| 状态 | 哪一问没过 | 用同样的凭证重试？ |
|---|---|---|
| 401 | 你是谁？ | 不行：先修好或刷新凭证 |
| 403 | 你能做这件事吗？ | 不行：换一个有权限的账号 |

> [!tip] 404 也可以是「没给你看」
> 有些 API 对你无权查看的东西回 404，这样陌生人连它存不存在都无从得知。如果同事能看见某个东西而你拿到 404，先怀疑权限。

## Zorvik 里的凭证

请求的 **Auth** 标签页存放它的凭证。默认情况下请求显示为 **Inherit from parent**：它沿用所在文件夹或工作区的鉴权。这样你只要设一次登录，里面的每个请求都用它。实验里你会给一个请求设 **Bearer token**；接下来的几课会逐一介绍各种鉴权方式。

**什么时候用得上：** 昨天还好好的请求今天失败了。401 让你去查令牌；403 让你去查用户的角色。知道是哪一问没过，能省下一小时瞎猜。
