---
id: secret-variables
title: 秘密变量不泄漏
summary: 把 API Key 和密码标成秘密，它们就只留在你的电脑上，而不在你共享的工作区文件里。
minutes: 5
lab:
  title: 别让 Key 进 Git
  goal: 拿到一个 API Key、把它存成秘密变量、用它，然后在分享请求时不泄漏它。
  minutes: 8
  servers:
    api:
      name: Payments API
      kind: http
      http:
        routes:
          - method: POST
            path: /keys
            status: 201
            headers:
              - key: Content-Type
                value: application/json
            body: '{"apiKey": "sk_test_{{secret.key}}", "note": "This key is shown only once. Store it somewhere safe."}'
          - method: GET
            path: /balance
            matchHeaders:
              - key: X-Api-Key
                value: "sk_test_{{secret.key}}"
            headers:
              - key: Content-Type
                value: application/json
            body: '{"currency": "EUR", "available": 1250.40, "pending": 80.00}'
          - method: GET
            path: /balance
            status: 401
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "Missing or wrong X-Api-Key header"}'
  steps:
    - text: 发送 `POST {{api}}/keys`。就像开发者后台一样，服务器替你生成一个 API Key，并且只显示这一次。
      hints:
        - 在地址栏左边的方法菜单里把 GET 改成 POST。
        - 按 ⌘N，选 POST，输入 {{api}}/keys，然后按发送。
        - "方法 POST，URL {{api}}/keys，然后发送。答案是 201 Created，里面有一个以 sk_test_ 开头的 apiKey。"
      check:
        request: { server: api, method: POST, path: /keys }
      solution:
        - send: { method: POST, url: "{{api}}/keys" }
    - text: |
        复制 `apiKey` 的值。按 **⌘/Ctrl + E**，选中 **Lab** 环境，加一个变量 `apiKey`，值就是这个 Key。点这一行末尾的**锁**把它变成秘密变量，然后点 **保存修改**。
      hints:
        - 只复制 Key 本身，不要带上两边的引号。
        - 锁图标在值字段的最右端。开着的锁表示普通变量，合上表示秘密。
        - "变量 apiKey，值 sk_test_…（你的 Key），锁合上，然后保存修改。值现在显示成圆点。"
      check:
        saved:
          environment: { name: Lab, variables: [{ key: apiKey, secret: true, value: "" }] }
      solution:
        - call:
            method: env.save
            params:
              id: Lab
              environment:
                name: Lab
                variables:
                  - { key: api, value: "{{api}}" }
                  - { key: api_port, value: "{{api_port}}" }
                  - { key: api_host, value: "{{api_host}}" }
                  - { key: apiKey, value: "sk_test_{{secret.key}}", secret: true }
    - text: 发送 `GET {{api}}/balance`，带一个请求头 `X-Api-Key`，值是 `{{apiKey}}`。用变量，不要用 Key 本身。
      hints:
        - 请求头在地址栏下面的 Headers 标签页里。
        - 加一行，名字 X-Api-Key，值 {{apiKey}}。把鼠标停在 {{apiKey}} 上，它会显示为秘密。
        - "GET {{api}}/balance，请求头 X-Api-Key: {{apiKey}}，然后发送。没有正确的 Key 时服务器会回 401。"
      check:
        all:
          - request: { server: api, method: GET, path: /balance, headers: { x-api-key: "sk_test_{{secret.key}}" } }
          - any:
              - send: { url: "*/balance", request: { headers: [{ value: "*apiKey*" }] } }
              - send: { url: "*/balance", request: { auth: { value: "*apiKey*" } } }
      solution:
        - send: { method: GET, url: "{{api}}/balance", headers: [{ key: X-Api-Key, value: "{{apiKey}}" }] }
    - text: 现在安全地分享它。打开 **更多操作**（保存按钮旁边的 **⋯**），选择 **复制为 cURL 或代码…**，把 **替换变量** 关掉。命令里保留的是 `{{apiKey}}`，而不是你的 Key。
      hints:
        - 替换变量开着时，命令里会是真实的 Key。在你自己电脑上没问题，贴到聊天里就有问题。
        - ⋯ 按钮在地址栏最右端。开关在格式菜单旁边。
        - "⋯ → 复制为 cURL 或代码… → 关掉替换变量。看看命令：请求头里写的是 X-Api-Key: {{apiKey}}。"
      check:
        call: { method: export.curl, ok: true, params: { resolveVariables: false } }
      solution:
        - call:
            method: export.curl
            params:
              request: { name: Balance, method: GET, url: "{{api}}/balance", headers: [{ key: X-Api-Key, value: "{{apiKey}}" }] }
              path: null
              flavor: bash
              resolveVariables: false
quiz:
  - question: 你把 `apiKey` 标成秘密。它的值存在哪里？
    options:
      - 在你工作区的环境文件里，加密存放
      - 在 Zorvik 的云服务器上
      - 在你这台电脑上、Zorvik 自己的数据目录里，绝不在工作区文件中
    answer: 2
    explain: 环境文件只保留名字，值是空的。真正的值留在你电脑上的应用数据目录里。
  - question: 同事从 Git 拉取你的工作区，`apiKey` 对他来说是什么？
    options:
      - 一个值为空的变量，他自己填自己的 Key
      - 你的 Key，可以直接用
      - 什么都没有，这个变量不存在
    answer: 0
    explain: 每个人都能看到这个请求需要一个 apiKey，各自填自己的。谁的 Key 都不会进仓库。
  - question: 你开着 **替换变量** 把请求复制成 cURL，准备贴到团队聊天里。风险是什么？
    options:
      - 没有风险，秘密永远是隐藏的
      - 命令里是真实的值，包括秘密
      - 这条命令在别的地方跑不起来
    answer: 1
    explain: 「替换」就意味着真实值，秘密也在其中，Zorvik 会提醒你。分享时把这个开关关掉，命令里就保留 `{{apiKey}}`。
---

有些值绝不能泄漏：API Key、密码、令牌。泄漏的 Key 可能真的造成金钱损失，而推到公开 Git 仓库的 Key，几分钟内就会被爬虫发现。

Zorvik 的工作区本来就是为了通过 Git 共享的，所以普通变量会被写进工作区里的文件。这对 `baseUrl` 很好，对密码很危险。**秘密变量**就是为这个而生的。

## 普通还是秘密

**环境与变量**（**⌘/Ctrl + E**）里每一行变量最右端都有一个**锁**：

- **开着的锁：普通变量。** 值保存在工作区文件里。地址、id、配置项用它。
- **合上的锁：秘密变量。** 文件里只留名字，值是空的。真实值在你电脑上、Zorvik 自己的数据目录里，显示成圆点。

```flow
apiKey（秘密） -[只有名字]-> 工作区文件 -> Git
apiKey（秘密） -[值]-> 只在这台电脑上
```

秘密变量用起来和普通变量一样：写在请求头、URL 或鉴权里的 `{{apiKey}}`，会在发送时被填上。

> [!note] 可以这样想……
> 一本共享的食谱。食谱上写「用调料柜钥匙」，大家都知道需要一把钥匙。但钥匙本身留在你自己的钥匙串上，不会贴在书里。

## 秘密保持在哪些地方看不见

- **工作区文件：** 只有名字，永远没有值。
- **历史：** 保存 URL 时秘密值会被隐藏。
- **集合运行报告：** URL 里的秘密显示成 `{{apiKey}}`。
- **AI Agent：** Agent 看到的一切里，秘密值都被遮蔽。

只有一处由你决定：**更多操作**（保存按钮旁的 **⋯**）→ **复制为 cURL 或代码…**。**替换变量** 开着时，代码里是真实的值（秘密也是），可以在你的电脑上直接跑。分享前把它关掉。

> [!warning] 秘密是按电脑保存的
> 你输入的秘密只在这台电脑上。换了新笔记本，或者到了同事那里，要重新填一次。在构建服务器上，用 `--var apiKey=…` 传给 `zorvik` 命令。

## Key 放在请求的哪里

大多数 API 希望 Key 放在 `X-Api-Key` 或 `Authorization` 这样的请求头里。你可以自己加请求头，也可以用请求的 **Auth** 标签页：**API Key** 会把它放进请求头或查询参数，**Bearer token** 会发 `Authorization: Bearer …`。无论哪种，都写 `{{apiKey}}`，不要写 Key 本身，这样保存下来的请求才能安全地提交。

```sequence
你 -> 服务器: GET /balance, X-Api-Key sk_test_…
Note over 你: 文件里写的是 {{apiKey}}
服务器 --> 你: 200 OK {"available": 1250.40}
```

**什么时候用得上：** 你把集合提交到团队仓库时。每个需要 Key 的请求都写着 `{{apiKey}}`，项目历史里没有留下任何人的 Key。
