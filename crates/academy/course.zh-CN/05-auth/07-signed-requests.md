---
id: signed-requests
title: 请求签名
summary: 有些 API 不要你发密钥，而是要求每个请求都用密钥签名；Zorvik 每次发送都替你签好——JWT、AWS Signature v4、OAuth 1.0 都支持。
minutes: 6
added: 0.2.0
lab:
  title: 用三种方式签名
  goal: 分别用 JWT、AWS Signature v4 和 OAuth 1.0 发送签过名的请求，看看服务器收到什么样的签名。
  minutes: 8
  vars:
    jwtSecret: "{{secret.jwt}}"
    awsAccessKey: AKIALABEXAMPLE7
    awsSecretKey: "{{secret.aws}}"
    consumerKey: lab-app
    consumerSecret: "{{secret.oauth}}"
  servers:
    api:
      name: Cloud API
      kind: http
      http:
        routes:
          - name: Signed
            method: "*"
            path: /*
            matchHeaders:
              - { key: Authorization, value: "" }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"ok": true, "path": "{{request.path}}", "note": "A real service recomputes the signature here. This practice server only checks that one is there."}'
          - name: Not signed
            method: "*"
            path: /*
            status: 401
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"error": "unauthorized", "message": "Sign the request: this API wants an Authorization header."}'
  steps:
    - text: |
        你们团队的报告服务信任用共享密钥签出的令牌。用 **JWT（由 Zorvik 签名）** 鉴权发送 `GET {{api}}/reports`：算法 **HS256**，密钥 `{{jwtSecret}}`，载荷如下：

        ```json
        {"sub": "ada", "exp": {{$timestamp(+1h)}}}
        ```
      hints:
        - Zorvik 用你的载荷拼出令牌、用密钥签名，每次发送都是新的。`{{$timestamp(+1h)}}` 让它一小时之后过期。
        - "Auth 标签页 → 类型 **JWT（由 Zorvik 签名）** → 算法 HS256，密钥 {{jwtSecret}}，载荷如上。添加到保持 Authorization 头。"
        - "用这个鉴权访问 GET {{api}}/reports，然后发送。在服务器里打开 Lab · Cloud API：它的流量里能看到 Authorization: Bearer eyJ…"
      check:
        all:
          - request: { server: api, method: GET, path: /reports, status: 200, headers: { authorization: "Bearer eyJ*.*.*" } }
          - send: { url: "*/reports", auth: jwt }
      solution:
        - send:
            method: GET
            url: "{{api}}/reports"
            auth:
              type: jwt
              algorithm: HS256
              secret: "{{jwtSecret}}"
              payload: "{\"sub\": \"ada\", \"exp\": {{$timestamp(+1h)}}}"
              prefix: Bearer
              queryParam: token
    - text: |
        账单 API 跑在 AWS 后面。用 **AWS Signature v4** 发送 `GET {{api}}/invoices`：access key `{{awsAccessKey}}`，secret key `{{awsSecretKey}}`，区域 `eu-west-1`，服务 `execute-api`。
      hints:
        - 签名覆盖方法、路径、时间和你的请求头，用 secret key 算出。access key 只是说明是谁签的。
        - "Auth 标签页 → 类型 **AWS Signature v4** → Access key {{awsAccessKey}}，Secret key {{awsSecretKey}}，区域 eu-west-1，服务 execute-api。"
        - "用这个鉴权访问 GET {{api}}/invoices，然后发送。服务器会收到 Authorization: AWS4-HMAC-SHA256 Credential=… 和一个 X-Amz-Date 头。"
      check:
        all:
          - request:
              server: api
              method: GET
              path: /invoices
              status: 200
              headers:
                authorization: "AWS4-HMAC-SHA256 Credential=AKIALABEXAMPLE7/*/eu-west-1/execute-api/aws4_request*Signature=*"
                x-amz-date: "re:^\\d{8}T\\d{6}Z$"
          - send: { url: "*/invoices", auth: awsSigV4 }
      solution:
        - send:
            method: GET
            url: "{{api}}/invoices"
            auth:
              type: awsSigV4
              accessKey: "{{awsAccessKey}}"
              secretKey: "{{awsSecretKey}}"
              region: eu-west-1
              service: execute-api
    - text: |
        有个老合作方的 API 还在用 OAuth 1.0。用 **OAuth 1.0** 发送 `GET {{api}}/timeline`：consumer key `{{consumerKey}}`，consumer secret `{{consumerSecret}}`，签名方法 **HMAC-SHA1**。然后再发一次，比较服务器 **流量** 里两个 `Authorization` 头。
      hints:
        - OAuth 1.0 用时间戳和随机 nonce 签名，所以两次发送的签名不会一样。
        - "Auth 标签页 → 类型 **OAuth 1.0** → 签名方法 HMAC-SHA1，Consumer key {{consumerKey}}，Consumer secret {{consumerSecret}}。令牌和其他字段留空。"
        - "用这个鉴权访问 GET {{api}}/timeline，发送两次。在服务器里打开 Lab · Cloud API：两次的 oauth_nonce 和 oauth_signature 都不一样。"
      check:
        all:
          - request:
              server: api
              method: GET
              path: /timeline
              status: 200
              headers: { authorization: "OAuth *oauth_consumer_key=\"lab-app\"*oauth_signature=*" }
              count: 2
          - send: { url: "*/timeline", auth: oauth1 }
      solution:
        - send: &oauth1
            method: GET
            url: "{{api}}/timeline"
            auth:
              type: oauth1
              consumerKey: "{{consumerKey}}"
              consumerSecret: "{{consumerSecret}}"
              signatureMethod: HMAC-SHA1
        - send: *oauth1
quiz:
  - question: 为什么别人不能把昨天那个 AWS 请求的签名抄下来今天用？
    options:
      - 签名覆盖了时间和请求本身，所以它只对那个请求、只在那几分钟内有效
      - AWS 每天夜里给所有人换密钥
      - Zorvik 在发送后就把签名删掉
    answer: 0
    explain: 改路径、改请求头、改正文或改时间，签名就对不上了。这正是签名的意义。
  - question: 「JWT（由 Zorvik 签名）」比「Bearer token」多做了什么？
    options:
      - 把令牌放在正文里而不是请求头里
      - 每次发送都根据你的声明和密钥生成并签名一个新令牌
      - 加密令牌，让别人读不到
    answer: 1
    explain: 用 Bearer 时你粘贴的是别人给的令牌；用 JWT（由 Zorvik 签名）时密钥在你手上，Zorvik 每次发都签一个新的，带你写的声明，比如一小时后过期的 exp。
  - question: AWS secret key 或签名密钥应该放在哪里？
    options:
      - 放在 Secret key 字段里，因为它显示成圆点
      - 放在请求的 URL 里，方便修改
      - 放在秘密变量里，字段里写 `{{name}}`
    answer: 2
    explain: 鉴权字段会存进请求、文件夹或工作区文件，最终进 Git。秘密变量的值只留在你电脑上。
---

令牌或密码像一把家门钥匙：谁复制了它，就能随便用。**签名**不一样。你的密钥从不离开电脑；取而代之，每个请求都带一个**签名**——由请求本身（方法、路径、时间、正文）和你的密钥算出来的一小段代码。服务器用它那份密钥做同样的计算，然后比对。

```sequence
participants: Zorvik, API
Note over Zorvik: 签名 = hash(密钥, 方法 + 路径 + 时间 + 正文)
Zorvik -> API: GET /invoices, Authorization: AWS4-HMAC-SHA256 … Signature=9c1f…
Note over API: 用它那份密钥重算一遍
API --> Zorvik: 200 OK，签名一致
```

请求里改一个字母，签名就对不上。明天再把同一个请求发一次会被拒，因为时间也是签名的一部分。

> [!note] 可以这样想……
> 签一张支票。你的签名只对那个金额、那个收款人、那个日期有效。没人能把金额改大，也不能明年再兑现一次，而你从没把笔交给过别人。

## Zorvik 里的签名类型

它们都在请求的 **Auth** 标签页里（也在 **Folder settings…** 和 **Workspace settings…** 里，所以整个文件夹可以共用一个）：

| 类型 | 在哪里遇到 |
|---|---|
| **JWT（由 Zorvik 签名）** | 你自己的服务：Zorvik 用你写的声明拼出令牌并签名（HS、RS、PS 或 ES 算法） |
| **AWS Signature v4** | API Gateway、S3、Lambda 函数 URL 以及其他 AWS 服务 |
| **OAuth 1.0** | Twitter/X、较旧的 Atlassian 以及很多企业 API |
| **Hawk** | 基于 Mozilla Hawk 方案的服务 |
| **Akamai EdgeGrid** | Akamai 的 API，用你 `.edgerc` 里的值 |
| **Atlassian ASAP** | 服务间调用：用你的服务密钥签发的短期 JWT |

Zorvik 在**每次发送**时签名，时机在前置脚本执行之后，签的是最终的方法、URL、请求头和正文，并带一个新鲜的时间戳和一个新的随机值（**nonce**）。负载测试里，每个请求单独签名。

## 服务器收到什么

签名放在 `Authorization` 头里。AWS 的格式把这些部分写得很清楚：

```anatomy
AWS4-HMAC-SHA256 | 方案和用的哈希
Credential=AKIA…/20260928/eu-west-1/execute-api/aws4_request | 谁签的、哪天、哪个区域、哪个服务
SignedHeaders=host;x-amz-date | 签名覆盖了哪些请求头
Signature=9c1f… | 证明，由 secret key 算出
```

**JWT（由 Zorvik 签名）** 产出的令牌以 `Authorization: Bearer eyJ…` 发出。你可以把它粘到 **工具 → 编解码 → JWT** 里读声明。OAuth 1.0 发的是 `Authorization: OAuth oauth_consumer_key="…", oauth_nonce="…", oauth_signature="…", …`。

实验里的练习服务器无法校验签名：它没有你的密钥。它只检查 `Authorization` 头在不在，**流量** 里显示到达时是什么样。真实服务会重算每一个签名，不匹配时回 `401` 或 `403`。

> [!tip] 密钥属于秘密变量
> access key、secret key 和私钥跟其他鉴权字段一样会被存进文件。把它们放进秘密变量，在字段里写 `{{awsSecretKey}}`，这样它们只留在你电脑上，不会进 Git。

**什么时候用得上：** 你调用 AWS API Gateway、S3 桶、合作方的 OAuth 1.0 API，或者一个信任共享密钥签名令牌的服务。在文件夹上配一次鉴权，里面的每个请求每次发送都会得到新的签名。
