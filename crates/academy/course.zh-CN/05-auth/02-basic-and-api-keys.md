---
id: basic-and-api-keys
title: Basic 鉴权与 API Key
summary: 最简单的凭证是用户名加密码（Basic 鉴权），或者一串很长的密钥，随每个请求一起发送。
minutes: 6
lab:
  title: 登录两次，再把密钥共享出去
  goal: 用一次 Basic 鉴权和一个 API Key，然后把 Key 放到文件夹上，让里面的请求自动继承。
  minutes: 8
  playground: true
  vars:
    user: ada
    password: "{{secret.pw}}"
    apiKey: "{{secret.apikey}}"
  servers:
    api:
      name: Weather API
      kind: http
      http:
        routes:
          - name: Weather
            method: GET
            path: /weather
            matchHeaders:
              - { key: X-API-Key, value: "{{secret.apikey}}" }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"city": "Lisbon", "tempC": 21, "sky": "sunny"}'
          - name: Forecast
            method: GET
            path: /forecast
            matchHeaders:
              - { key: X-API-Key, value: "{{secret.apikey}}" }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"city": "Lisbon", "days": [{"day": "Mon", "tempC": 22}, {"day": "Tue", "tempC": 19}]}'
          - name: Missing or wrong key
            method: "*"
            path: /*
            status: 401
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"error": "unauthorized", "message": "Send your API key in the X-API-Key header."}'
  steps:
    - text: |
        练习服务器有一扇门，只为某个用户打开。用 **Basic 鉴权** 发送 `GET {{playground}}/basic-auth/{{user}}/{{password}}`：用户名 `{{user}}`，密码 `{{password}}`。
      hints:
        - 不带凭证访问这个地址会回 401。**Auth** 标签页有 **Basic auth** 类型，两个字段。
        - "Auth 标签页：类型 = Basic 鉴权，用户名 = {{user}}，密码 = {{password}}。变量要连花括号一起输入。"
        - "URL {{playground}}/basic-auth/{{user}}/{{password}}，Basic 鉴权如上，然后发送。答案会写 \"authenticated\": true。"
      check:
        send: { url: "*/basic-auth/ada/{{secret.pw}}", status: 200, auth: basic }
      solution:
        - send:
            method: GET
            url: "{{playground}}/basic-auth/{{user}}/{{password}}"
            auth: { type: basic, username: "{{user}}", password: "{{password}}" }
    - text: |
        Weather API 改用 API Key 了。用 **API Key** 鉴权发送 `GET {{api}}/weather`：键名 `X-API-Key`，值 `{{apiKey}}`，加到 Header。
      hints:
        - 想的话可以先不带 Key 试一次；401 的正文会告诉你它要哪个头。
        - "Auth 标签页：类型 = API Key，键 = X-API-Key，值 = {{apiKey}}，添加到 = Header。"
        - "用这个鉴权访问 URL {{api}}/weather，然后发送。应该拿到天气和 200。"
      check:
        all:
          - request: { server: api, method: GET, path: /weather, status: 200, headers: { x-api-key: "{{secret.apikey}}" } }
          - send: { auth: apiKey }
      solution:
        - send:
            method: GET
            url: "{{api}}/weather"
            auth: { type: apiKey, key: X-API-Key, value: "{{apiKey}}", location: header }
    - text: |
        把 Key 设到整个文件夹上。新建一个文件夹 **Weather**，在它的 **Folder settings…** 里配上同样的 API Key，然后在里面建一个请求访问 `{{api}}/forecast`。这个请求的鉴权保持 **Inherit from parent**，然后发送。
      hints:
        - 文件夹可以携带鉴权，里面的每个请求都能用。请求默认就是 **Inherit from parent**。
        - "集合：+ → 新建文件夹 → Weather。右键 Weather →“文件夹设置…”→ 鉴权：API Key，X-API-Key，{{apiKey}}，Header → 保存。"
        - "右键 Weather → 新建 HTTP 请求，命名 Forecast，URL {{api}}/forecast，鉴权保持 Inherit from parent，然后发送。"
      check:
        all:
          - saved: { folder: { auth: { type: apiKey, key: X-API-Key } } }
          - request: { server: api, method: GET, path: /forecast, status: 200 }
          - send: { url: "*/forecast", status: 200, auth: inherit }
      solution:
        - call: { method: folder.create, params: { parent: "", name: Weather } }
        - call:
            method: folder.save
            params:
              path: Weather
              meta:
                name: Weather
                auth: { type: apiKey, key: X-API-Key, value: "{{apiKey}}", location: header }
        - call:
            method: http.send
            params:
              requestId: lab-forecast
              path: Weather/Forecast.yaml
              request: { name: Forecast, seq: 0, method: GET, url: "{{api}}/forecast" }
quiz:
  - question: "`Authorization: Basic YWRhOnNlY3JldA==` 这样的 Basic 鉴权头能防住什么？"
    options:
      - 什么都防不住：它只是 Base64，谁都能解开
      - 防窃听，因为 Base64 把密码藏起来了
      - 防重放，因为这个头每次都变
    answer: 0
    explain: Base64 是编码，不是加密。Basic 鉴权只有在 HTTPS 下才安全，因为 HTTPS 会加密整个请求。
  - question: 为什么很多 API 更愿意把 Key 放在请求头里，而不是查询串里？
    options:
      - 请求头发得更快
      - 查询串装不下长值
      - URL 会留在日志、浏览器历史和截图里
    answer: 2
    explain: 放在 URL 里的 Key，URL 写到哪就泄到哪。请求头通常不会被记录。
  - question: 一个请求的鉴权写着「Inherit from parent」，它的凭证从哪来？
    options:
      - "哪里都不来：这个请求不带鉴权发出去"
      - 从它上面最近的设置了鉴权的文件夹，否则从工作区
      - 从你最近发给那个主机的请求
    answer: 1
    explain: 在文件夹或工作区上设一次登录，里面的每个请求都用它。过期时也只改一个地方。
---

既然你知道了*你是谁*和*你能做什么*的区别，那就来发点凭证。最简单的两种现在仍然到处都在。

## Basic 鉴权：用户名和密码

用 **Basic 鉴权**时，客户端把用户名和密码用冒号连起来，做 **Base64** 编码（把任意字节写成字母和数字的一种方式），再把结果放进每个请求的 `Authorization` 头里：

```anatomy
Authorization: Basic YWRhOnNlY3JldA== | 请求头、方案，然后才是凭证
YWRhOnNlY3JldA== | ada:secret 的 Base64
```

> [!warning] 编码不是加密
> 任何看到这个头的人一秒就能解开（试试 **工具 → 编解码 → Base64**）。Basic 鉴权只有在 **HTTPS** 下才可以接受，因为 HTTPS 会加密整个请求。下一单元会讲为什么。

在 Zorvik 里，在 **Auth** 标签页选 **Basic 鉴权**，填 **用户名** 和 **密码**，Zorvik 会拼出请求头。

## API Key：一串长密钥

**API Key** 是服务商给你的一串长随机字符串，通常来自开发者后台。你每次请求都带上它，一般放在 API 指定的请求头里，比如 `X-API-Key: 3f9c…`，有时也作为查询参数，如 `?api_key=3f9c…`。

```sequence
你 -> Weather API: GET /weather（X-API-Key: 3f9c…）
Note over Weather API: 查这个 Key：是谁的，能做什么？
Weather API --> 你: 200 OK {"tempC": 21}
```

Key 标识的是一个*应用*或*账号*，而不是某个人，所以服务间调用常用它。在 Zorvik 里，**Auth** 标签页选 **API Key**，然后设置 **键**（请求头或参数名）、**值** 和 **添加到**（Header 或查询参数）。

> [!note] 可以这样想……
> Basic 鉴权是你每次进门都跟门卫报名字和密码。API Key 是一张会员卡：谁拿着它都能进，所以你得像保管家门钥匙一样保管它。

## 别把密钥写进请求里

写 `{{apiKey}}`，而不是密钥本身。这样值存在**环境**里，而不在保存的请求里，于是你可以把请求分享出去而不分享密钥，也可以为每个环境用不同的 Key。变量还能标成秘密变量，值就只留在你自己的电脑上。

## 设一次就够：文件夹鉴权

访问同一个 API 的大多数请求用的是同一套凭证。与其每个请求重复一遍，不如把鉴权放在**文件夹**上（右键 → **文件夹设置…** → **鉴权**），或者放在工作区上。里面所有鉴权为 **Inherit from parent** 的请求都会用它：

```flow
工作区 -> 文件夹：Weather（API Key） -> Forecast（继承）
```

Key 变了，你只改一个地方。

**什么时候用得上：** 你用合作方后台给的 Key 连他们的 API，或者用用户名密码测一个内部服务。把凭证放到文件夹上，之后加的每个请求都能直接用。
