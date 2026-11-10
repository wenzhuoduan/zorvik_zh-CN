---
id: oauth-client-credentials
title: OAuth 2.0 客户端凭证
summary: 用 OAuth 2.0 时，应用拿自己的 client id 和 secret 到令牌端点换一个短期访问令牌，再把这个令牌当 bearer 令牌用。
minutes: 7
lab:
  title: 拿两次令牌
  goal: 先手动取一个 OAuth 2.0 访问令牌，再让 Zorvik 替你取并自动带上。
  minutes: 8
  playground: true
  vars:
    clientId: test-client
    clientSecret: test-secret
  steps:
    - text: 不带鉴权发送 `GET {{playground}}/oauth/protected`。它是锁着的。
      hints:
        - 新请求会继承工作区的鉴权，训练营工作区里没有鉴权。
        - "GET {{playground}}/oauth/protected，然后发送。应该拿到 401。"
      check:
        send: { url: "*/oauth/protected", status: 401 }
      solution:
        - send: { method: GET, url: "{{playground}}/oauth/protected" }
    - text: |
        自己向令牌端点要一个令牌。发送 `POST {{playground}}/oauth/token`，正文用 **Form URL-encoded**：

        | 键 | 值 |
        |---|---|
        | `grant_type` | `client_credentials` |
        | `client_id` | `{{clientId}}` |
        | `client_secret` | `{{clientSecret}}` |
      hints:
        - 令牌端点收的是表单，不是 JSON。就是上一单元那个 **Form URL-encoded** 正文类型。
        - 方法 POST，**Body** 标签页，**Form URL-encoded**，然后三行。变量连花括号一起输入。
        - "POST {{playground}}/oauth/token，grant_type=client_credentials，client_id={{clientId}}，client_secret={{clientSecret}}。答案里有一个 access_token。"
      check:
        send: { method: POST, url: "*/oauth/token", status: 200, json: { token_type: Bearer, access_token: "*" } }
      solution:
        - send:
            method: POST
            url: "{{playground}}/oauth/token"
            body:
              type: formUrlencoded
              form:
                - { key: grant_type, value: client_credentials }
                - { key: client_id, value: "{{clientId}}" }
                - { key: client_secret, value: "{{clientSecret}}" }
    - text: |
        现在让 Zorvik 来跳这支舞。回到 `GET {{playground}}/oauth/protected`（新开一个标签页也行），在 **Auth** 标签页选 **OAuth 2.0** 并填好：

        - **授权类型**：客户端凭证
        - **令牌 URL**：`{{playground}}/oauth/token`
        - **Client ID**：`{{clientId}}`
        - **Client secret**：`{{clientSecret}}`

        然后发送。
      hints:
        - 发送前 Zorvik 会先取一个令牌，一直留到它过期，并替你加上 `Authorization` 头。
        - "客户端鉴权保持 Basic 鉴权头：练习服务器两种方式都接受。"
        - "鉴权 = OAuth 2.0，上面四个字段，URL {{playground}}/oauth/protected，然后发送。应该拿到 200 和 {\"ok\": true}。"
      check:
        send: { url: "*/oauth/protected", status: 200, auth: oauth2 }
      solution:
        - send:
            method: GET
            url: "{{playground}}/oauth/protected"
            auth:
              type: oauth2
              grantType: clientCredentials
              tokenUrl: "{{playground}}/oauth/token"
              clientId: "{{clientId}}"
              clientSecret: "{{clientSecret}}"
              clientAuth: basicHeader
              headerPrefix: Bearer
quiz:
  - question: 在客户端凭证流程里，被认证的是谁？
    options:
      - 一个人，输入自己的密码
      - 一个应用，用它自己的 client id 和 secret
      - 令牌端点
    answer: 1
    explain: 客户端凭证用于机器对机器调用。没有人登录，是应用在证明自己是谁。
  - question: 你的访问令牌过期了。客户端会怎么做？
    options:
      - 向令牌端点要一个新的
      - 继续发送旧令牌，服务器会给它续期
      - 换掉自己的 client secret
    answer: 0
    explain: 访问令牌故意做得很短命。Zorvik 会保存到过期，下次发送时再取新的。
  - question: 为什么短期访问令牌比「每个请求都发 client secret」更安全？
    options:
      - 令牌更短，所以更难猜
      - 令牌是加密的，所以复制不了
      - 泄漏的令牌很快过期；而 secret 只发给令牌端点
    answer: 2
    explain: 长期有效的 secret 很少出动，而且只去一个地方；经常在路上的是一个会自己过期的令牌。
---

API Key 和密码都是长期有效的：一旦泄漏，在有人发现之前一直能用。**OAuth 2.0** 用一个中间人来解决这个问题。应用不把 secret 发给每个 API，而是先到一个**授权服务器**证明自己是谁，换回一个短期的**访问令牌**，然后用这个令牌（当成 bearer 令牌）调用 API。

OAuth 2.0 有几种**授权类型**，也就是拿令牌的方式。这一课讲最简单的**客户端凭证**，用在一个程序跟另一个程序对话、没有真人参与的场景：夜间的计费任务、后端调用合作方的 API。

```sequence
participants: 应用, 令牌端点, API
应用 -> 令牌端点: POST /oauth/token（client id + secret）
Note over 令牌端点: 核验凭证
令牌端点 --> 应用: {"access_token": "…", "expires_in": 3600}
应用 -> API: GET /data（Authorization: Bearer …）
API --> 应用: 200 OK
```

## 各个部件

| 术语 | 是什么 |
|---|---|
| **Client** | 申请访问权限的那个应用 |
| **Client ID** | 应用的「用户名」，公开的 |
| **Client secret** | 应用的「密码」：必须保密 |
| **令牌端点** | 发放令牌的 URL，通常是 `…/oauth/token` |
| **Scope** | 可选：这个令牌应该具备哪些权限 |
| **访问令牌** | 结果：一个带有效期的 bearer 令牌，常常是 JWT |

取令牌是一个 **Form URL-encoded** 的 POST，带 `grant_type=client_credentials`。client id 和 secret 可以放在 Basic 鉴权头里，也可以放在表单里；每家服务商说明自己接受哪种。答案是一段 JSON，含 `access_token`、它的 `token_type`（`Bearer`）和 `expires_in`（还有多少秒过期）。

> [!note] 可以这样想……
> 一家酒店。在前台（令牌端点）你出示一次护照（client id 和 secret），拿到一张房卡（访问令牌），它到退房前都能开你的房间（API）。房卡丢了，退房时也自然失效；而你的护照始终没离开前台。

## 让 Zorvik 来做

手动取令牌很适合理解原理，但每小时来一次就烦了。在 **Auth** 标签页选 **OAuth 2.0**，设好**授权类型**、**令牌 URL**、**Client ID** 和 **Client secret**（用变量），然后发送。Zorvik 会：

1. 如果手上还没有有效令牌，就向令牌端点要一个；
2. 把令牌保存到过期；
3. 给你的请求加上 `Authorization: Bearer <token>`。

**Fetch token** 可以立刻取一个并显示过期时间；**Clear** 把它丢掉。把 OAuth 2.0 配置放在文件夹上，里面的每个请求共用这个令牌。

> [!tip] 其他授权类型
> 当*真人*登录时，API 用**授权码**模式：弹出一个浏览器窗口去登录，Zorvik 接住结果。Zorvik 也支持这种模式；思路一样，只是第一步不同。

**什么时候用得上：** 你在测试里调用云厂商的 API、支付服务或公司内部服务——它们几乎都是这样发令牌的。在文件夹上配一次，就再也不用管令牌过期。
