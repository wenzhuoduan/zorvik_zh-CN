---
id: http-headers
title: 请求头
summary: 请求头承载消息除了内容本身之外的一切，从格式到是谁在发。
minutes: 6
lab:
  title: 秘密握手
  goal: 通过一个要求在请求头里带密钥的 API，然后向它要另一种格式。
  minutes: 7
  vars:
    apiKey: "{{secret.key}}"
  servers:
    api:
      name: Weather API
      kind: http
      http:
        routes:
          - name: Forecast as text
            method: GET
            path: /forecast
            matchHeaders:
              - key: X-Api-Key
                value: "{{secret.key}}"
              - key: Accept
                value: text/plain
            headers:
              - key: Content-Type
                value: text/plain; charset=utf-8
            body: Sunny, 24 °C, with a light breeze from the sea.
          - name: Forecast as JSON
            method: GET
            path: /forecast
            matchHeaders:
              - key: X-Api-Key
                value: "{{secret.key}}"
            headers:
              - key: Content-Type
                value: application/json
            body: '{"sky": "sunny", "celsius": 24, "wind": "light breeze"}'
          - name: Missing key
            method: GET
            path: /forecast
            status: 401
            headers:
              - key: Content-Type
                value: application/json
            body: '{"error": "Missing or wrong X-Api-Key header. Your key is the apiKey variable of the Lab environment."}'
  steps:
    - text: 发送 `GET {{api}}/forecast`。API 拒绝了。读一读响应正文，看看为什么。
      hints:
        - 看状态徽章和响应的正文。
        - "发送 `GET {{api}}/forecast`：401 Unauthorized，因为请求里没有 X-Api-Key 头。"
      check:
        request: { server: api, method: GET, path: /forecast, status: 401 }
      solution:
        - send: { method: GET, url: "{{api}}/forecast" }
    - text: |
        在请求的 **Headers** 标签页里加一个 `X-Api-Key` 头，值填 `{{apiKey}}`，然后再发一次。
      hints:
        - 请求头是名字和值的一对。值可以使用 Lab 环境里的变量。
        - 打开**请求**的 Headers 标签页（不是响应的），在空行里填上。
        - "名字 `X-Api-Key`，值 `{{apiKey}}`，然后发送。答案变成 200，内容是以 JSON 给出的天气预报。"
      check:
        request: { server: api, method: GET, path: /forecast, status: 200, headers: { x-api-key: "{{secret.key}}" } }
      solution:
        - send: { method: GET, url: "{{api}}/forecast", headers: [{ key: X-Api-Key, value: "{{apiKey}}" }] }
    - text: |
        改要纯文本而不是 JSON：保留密钥，再加一个 `Accept` 头，值是 `text/plain`，然后发送。
      hints:
        - Accept 告诉服务器你希望收到什么格式。
        - 在 X-Api-Key 下面加一行，名字填 Accept。
        - "名字 `Accept`，值 `text/plain`，然后发送。正文变成了一句话，响应的 Content-Type 头显示 text/plain。"
      check:
        request: { server: api, method: GET, path: /forecast, status: 200, headers: { x-api-key: "{{secret.key}}", accept: "text/plain" } }
      solution:
        - send: { method: GET, url: "{{api}}/forecast", headers: [{ key: X-Api-Key, value: "{{apiKey}}" }, { key: Accept, value: text/plain }] }
quiz:
  - question: "`Content-Type` 和 `content-type` 是同一个请求头吗？"
    options:
      - 是，请求头名称不区分大小写
      - 不是，请求头名称区分大小写
      - 只在 HTTP/2 里算同一个
      - 只在请求里算同一个，响应里不算
    answer: 0
    explain: 请求头名称不区分大小写（HTTP/2 干脆全部用小写）。但值通常区分大小写。
  - question: 你想要 JSON，可 API 发回来的是 XML。请求里该设哪个头？
    options:
      - Content-Type
      - Host
      - Accept
      - Cache-Control
    answer: 2
    explain: Accept 说的是你希望收到什么格式，Content-Type 描述的是你正在发送的正文。
  - question: 为什么把 API 密钥放在请求头里，而不是放在 URL 里？
    options:
      - 放在头里请求更快
      - URL 不能超过 100 个字符
      - 服务器读不到查询串
      - URL 会进日志、浏览器历史和截图，密钥可能泄漏
    answer: 3
    explain: URL 到处被复制、被记录。请求头暴露得少一些，不过在路上真正保护它的是 HTTPS。
---

请求头就是起始行和正文之间那些 `Name: value` 行。它们是**元数据**：关于这条消息的*事实*，而不是消息本身。请求头名称不区分大小写，`Content-Type` 和 `content-type` 是同一个头；但它们的值通常区分。

## 你会一直见到的请求头

| 请求头 | 谁发 | 说什么 |
|---|---|---|
| `Host` | 客户端 | 你要哪个站点（一台服务器可以托管很多） |
| `User-Agent` | 客户端 | 是哪个程序在问 |
| `Accept` | 客户端 | 你希望收到什么格式，比如 `application/json` |
| `Content-Type` | 双方 | 正文是什么：`application/json`、`text/html` 等 |
| `Content-Length` | 双方 | 正文有多少字节 |
| `Authorization` | 客户端 | 你的凭证，比如 `Bearer eyJ…` |
| `Cookie`、`Set-Cookie` | 客户端、服务器 | 站点让浏览器保存并回传的小值 |
| `Cache-Control` | 双方 | 这个答案能不能缓存、能缓存多久 |
| `Location` | 服务器 | 接下来去哪（配合 3xx 重定向和 201 Created） |

API 还会自己发明**自定义请求头**。很多以 `X-` 开头，比如 `X-Api-Key`、`X-Request-Id`，不过较新的标准已经不这么做了。

```anatomy
Accept: application/json | 「我希望能拿回 JSON」
Authorization: Bearer eyJhbGciOi… | 「这是我的身份凭证」
X-Api-Key: 6f1c2a… | 这个 API 自己发明的自定义头
```

## 要一种格式

同一个 URL 可以把同一份数据以多种格式提供。客户端用 `Accept` 说自己偏好哪种，服务器用 `Content-Type` 说自己实际发了哪种。这叫**内容协商**。

```sequence
participants: 客户端, Weather API
客户端 -> Weather API: GET /forecast，Accept text/plain
Weather API --> 客户端: 200，Content-Type text/plain，"Sunny, 24 °C"
客户端 -> Weather API: GET /forecast，Accept application/json
Weather API --> 客户端: 200，Content-Type application/json，{"sky" ...}
```

> [!note] 可以这样想……
> 信封上写的备注：「急件」「请用英文回复」「勿折」。里面的信是正文；信封上的备注告诉每个经手的人该怎么做。

## 把密钥放在请求头里

很多 API 要求每个请求都带密钥，通常放在 `Authorization` 或 `X-Api-Key` 这样的自定义头里。没有它，就会回 **401 Unauthorized**。密钥放在请求头里比放在 URL 里好：URL 会留在日志、浏览器历史和截图里。

> [!tip] 在 Zorvik 里
> 在请求的 **Headers** 标签页加请求头，一行一个。值可以使用变量，比如 `{{apiKey}}`，这样真实密钥存在环境里，而不用复制进每个请求。响应的 **Headers** 标签页显示回来的是什么。

**什么时候用得上：** API 明明「密钥是对的」却回 401（头名字写对了吗？）、你想要 JSON 它却发 XML（设了 `Accept` 吗？），或者它拒收你的 JSON（`Content-Type` 漏了吗？）。
