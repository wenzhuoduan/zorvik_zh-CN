---
id: chaining-requests
title: 把请求串起来
summary: 从一个响应里存下值，比如令牌或新 id，再在下一个请求里用。
minutes: 5
lab:
  title: 先登录，再用令牌
  goal: 用脚本存下登录令牌和新订单的 id，在后面的请求里用它们。
  minutes: 9
  servers:
    api:
      name: Account API
      kind: http
      http:
        routes:
          - method: POST
            path: /login
            headers:
              - key: Content-Type
                value: application/json
            body: '{"token": "{{secret.token}}", "expiresIn": 3600}'
          - method: GET
            path: /me
            matchHeaders:
              - key: Authorization
                value: "Bearer {{secret.token}}"
            headers:
              - key: Content-Type
                value: application/json
            body: '{"name": "Ada Lovelace", "plan": "pro"}'
          - method: GET
            path: /me
            status: 401
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "Log in first: send a Bearer token"}'
          - method: POST
            path: /orders
            status: 201
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": "ord-{{secret.order}}", "status": "created"}'
          - method: GET
            path: /orders/:id
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": "{{request.params.id}}", "status": "paid", "total": 42.5}'
  steps:
    - text: |
        发送 `POST {{api}}/login`（这个练习服务器谁都放行，不需要正文）。发送之前，给它加一个 **响应后** 脚本，把答案里的令牌存下来：

        ```js
        const body = pm.response.json();
        pm.environment.set("token", body.token);
        ```
      hints:
        - 脚本在答案到达之后运行，所以它能读 body.token，并存进当前环境。
        - 新建请求，方法 POST，URL {{api}}/login。脚本标签页 → 响应后，粘贴这两行，然后发送。
        - "发送之后，把鼠标停在任意 {{token}} 上，或者按 ⌘E：Lab 环境的「由脚本设置」里会显示 token。"
      check:
        all:
          - request: { server: api, method: POST, path: /login }
          - send: { url: "*/login", status: 200, request: { scripts: { postResponse: "*.set(*token*" } } }
      solution:
        - send:
            method: POST
            url: "{{api}}/login"
            scripts:
              postResponse: |
                const body = pm.response.json();
                pm.environment.set("token", body.token);
    - text: 现在发送 `GET {{api}}/me`。在它的 **Auth** 标签页选 **Bearer token**，Token 填 `{{token}}`。你现在是以谁的身份登录的？
      hints:
        - 没有令牌时服务器会回 401。这个变量把登录答案里的令牌带到了这个请求。
        - 新建请求，URL {{api}}/me，鉴权标签页 → 类型 Bearer token → Token {{token}}。然后发送。
        - "Token 字段填 {{token}}（变量，不是令牌的文本）。答案是 200，返回 Ada Lovelace 的账号。"
      check:
        all:
          - request: { server: api, method: GET, path: /me, status: 200, headers: { authorization: "Bearer {{secret.token}}" } }
          - any:
              - send: { url: "*/me", request: { auth: { token: "*token*" } } }
              - send: { url: "*/me", request: { headers: [{ value: "*token*" }] } }
      solution:
        - send: { method: GET, url: "{{api}}/me", auth: { type: bearer, token: "{{token}}" } }
    - text: |
        再串一次。发送 `POST {{api}}/orders`，响应后脚本把新订单的 id 存成 `orderId`。然后发送 `GET {{api}}/orders/{{orderId}}`，把这张订单读回来。
      hints:
        - 和令牌是同一个套路。POST /orders 的答案里有一个 id 字段。
        - "POST /orders 的响应后：pm.environment.set(\"orderId\", pm.response.json().id);"
        - "然后新建请求：GET {{api}}/orders/{{orderId}}。答案里是同一个 id，状态 paid。"
      check:
        all:
          - request: { server: api, method: GET, path: "/orders/ord-{{secret.order}}" }
          - send: { method: GET, request: { url: "*/orders/*orderId*" } }
      solution:
        - send:
            method: POST
            url: "{{api}}/orders"
            scripts:
              postResponse: pm.environment.set("orderId", pm.response.json().id);
        - send: { method: GET, url: "{{api}}/orders/{{orderId}}" }
quiz:
  - question: '`pm.environment.set("token", …)` 把令牌存在哪里？'
    options:
      - 存在环境文件里，所以会提交到 Git
      - 存在当前环境里，只在这台电脑上，列在「由脚本设置」下
      - 哪里都不存，脚本结束就没了
    answer: 1
    explain: 脚本设置的值留在你的电脑上，并且胜过了文件里的值。它们永远不会被写进工作区文件。
  - question: 你还没发过登录请求，就先发了 `GET /me`。会发生什么？
    options:
      - 服务器收到的就是 `Bearer {{token}}`，回 401
      - Zorvik 替你自动登录
      - 请求会等令牌出现再发
    answer: 0
    explain: 这个变量还没有值。在一条链里顺序很重要；集合运行时要把登录请求放在最前面。
  - question: 你只需要一个值在某一次发送或某一次集合运行期间有效。用哪个？
    options:
      - "`pm.globals.set`"
      - "`pm.environment.set`"
      - "`pm.variables.set`"
    answer: 2
    explain: "`pm.variables` 活得最短，也最强：只对一次发送或一次运行有效，之后什么都不留。"
---

真实的 API 是对话，不是一问一答。你先**登录**拿到令牌，然后所有请求都用这个令牌。你**创建**一张订单拿到 id，然后按 id 查询、支付或取消。每个请求都需要上一个答案里的东西。把它们连起来就叫**串联**。

## 配方

1. 在第一个请求的**响应后脚本**里，从响应中读那个值。
2. 用 `pm.environment.set("name", value)` 把它存进变量。
3. 在下一个请求里像普通变量一样用它：`{{name}}`。

```sequence
participants: Zorvik, 服务器
Zorvik -> 服务器: POST /login
服务器 --> Zorvik: {"token": "eyJhbGci…"}
Note over Zorvik: pm.environment.set("token", …)
Zorvik -> 服务器: GET /me，Authorization: Bearer {{token}}
服务器 --> Zorvik: 200 {"name": "Ada Lovelace"}
```

下次登录时脚本会存下新令牌，所有写着 `{{token}}` 的请求都用它。不用复制粘贴，也不会有一个一小时前就过期的令牌藏在某个请求头里。

> [!note] 可以这样想……
> 衣帽间。你把外套交出去，拿到一张带编号的小票。你不需要背那个编号：留着票，回来时出示就行。脚本替你保管这张票。

## 存下来的值去了哪里

脚本可以在不同层级存值，就像你已经认识的变量一样：

| 脚本调用 | 活多久 | 存在哪 |
|---|---|---|
| `pm.variables.set` | 一次发送，或一次集合运行 | 哪里都不存，之后消失 |
| `pm.environment.set` | 直到你改它 | 随当前环境，存在这台电脑 |
| `pm.collectionVariables.set` | 直到你改它 | 随工作区变量，存在这台电脑 |
| `pm.globals.set` | 直到你改它 | 所有工作区，存在这台电脑 |

脚本存下的值会出现在 **环境与变量**（**⌘/Ctrl + E**）的 **由脚本设置** 下面。它们胜过文件里的值，但从不写进文件，所以登录拿到的令牌永远不会进 Git。那里的 **全部清空** 可以把它们删掉。

> [!tip] 在脚本里读值
> 脚本也能读变量：`pm.environment.get("token")`，或者 `pm.variables.get("token")`——后者会按层级依次查找，和 `{{token}}` 的行为一样。

## 让链保持诚实

链是有顺序的：登录必须在 `/me` 之前。下一课的**集合运行器**会按顺序发送整个文件夹，所以一条链能从第一个请求跑到最后一个。每一步都加个测试，比如 `pm.test("Logged in", …)`，这样断掉的那一环会表现为一个失败的测试，而不是三个请求之后一个莫名其妙的 401。

**什么时候用得上：** 你的 API 发的是短期令牌。你只登录一次，集合里每个请求都拿到新令牌，再也不会因为一个过期令牌而白白耗掉一下午。
