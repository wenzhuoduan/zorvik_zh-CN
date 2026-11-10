---
id: content-negotiation
title: Content-Type 与 Accept
summary: "`Content-Type` 说明你的正文是什么格式；`Accept` 说明你希望收到什么格式。"
minutes: 5
lab:
  title: 说服务器听得懂的格式
  goal: 用 Accept 要一份 CSV，再用一个标错格式的上传拿到 415，最后修好它的 Content-Type。
  minutes: 6
  servers:
    api:
      name: Sales API
      kind: http
      http:
        routes:
          - name: CSV report
            method: GET
            path: /report
            matchHeaders:
              - { key: Accept, value: text/csv }
            headers:
              - { key: Content-Type, value: text/csv }
            body: "month,sales\nJuly,120\nAugust,135\n"
          - name: JSON report
            method: GET
            path: /report
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"report": [{"month": "July", "sales": 120}, {"month": "August", "sales": 135}]}'
          - name: Import CSV
            method: POST
            path: /import
            status: 202
            matchHeaders:
              - { key: Content-Type, value: text/csv }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"accepted": true, "message": "Import started."}'
          - name: Import CSV (charset)
            method: POST
            path: /import
            status: 202
            matchHeaders:
              - { key: Content-Type, value: text/csv; charset=utf-8 }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"accepted": true, "message": "Import started."}'
          - name: Unsupported type
            method: POST
            path: /import
            status: 415
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"error": "unsupported_media_type", "message": "This endpoint only reads CSV. Send it with Content-Type: text/csv."}'
  steps:
    - text: |
        发送 `GET {{api}}/report`：你得到 JSON。现在加上 `Accept: text/csv` 头再发一次，拿到同样这份报告的 CSV 版本。
      hints:
        - 请求头加在 **Headers** 标签页，一行一个。
        - "加一行，名字 Accept，值 text/csv。Zorvik 之后就不会再补它默认的 Accept: */*。"
        - "Headers 标签页：Accept = text/csv。URL {{api}}/report，方法 GET，然后发送。"
      check:
        request: { server: api, method: GET, path: /report, headers: { accept: text/csv }, route: CSV report }
      solution:
        - send: { method: GET, url: "{{api}}/report" }
        - send: { method: GET, url: "{{api}}/report", headers: [{ key: Accept, value: text/csv }] }
    - text: |
        把两行 CSV 上传到 `POST {{api}}/import`。正文类型选 **Text**，内容类型先保持 `text/plain`：

        ```text
        month,sales
        September,142
        ```

        服务器拒绝了。看看状态码。
      hints:
        - 如果上一步的 Accept 头还在，可以删掉；留着不影响，但没必要。
        - 方法 POST，**Body** 标签页选 **Text**。它右边的列表就是内容类型，保持 `text/plain`。
        - "正文类型 Text（text/plain），内容是那两行 CSV，URL {{api}}/import，然后发送。应该会拿到 415。"
      check:
        request: { server: api, method: POST, path: /import, status: 415 }
      solution:
        - send:
            method: POST
            url: "{{api}}/import"
            body: { type: text, text: "month,sales\nSeptember,142\n" }
    - text: 修好它。把正文标成 CSV（`text/csv`）再发一次，直到服务器回 `202 Accepted`。
      hints:
        - 415 的意思是「我不读这种格式」。你的数据没问题，标签不对。
        - "**Text** 正文类型旁边的内容类型列表里有 `text/csv`。"
        - "正文类型 Text，内容类型 text/csv，同样的两行，然后发送。"
      check:
        request: { server: api, method: POST, path: /import, status: 202, headers: { content-type: "text/csv*" } }
      solution:
        - send:
            method: POST
            url: "{{api}}/import"
            body: { type: text, contentType: text/csv, text: "month,sales\nSeptember,142\n" }
quiz:
  - question: 哪个请求头描述你正在发送的正文？
    options:
      - Accept
      - Content-Type
      - Content-Length
    answer: 1
    explain: Content-Type 给正文贴标签，Accept 是对响应的愿望清单。
  - question: "你发的是 JSON，但标了 `Content-Type: text/plain`。服务器可能会回什么？"
    options:
      - 415 Unsupported Media Type
      - 201 Created，标签无所谓
      - 301 Moved Permanently
    answer: 0
    explain: 很多服务器按 Content-Type 挑解析器。标签错了，它读不了正文，或者干脆不读。
  - question: "你的请求写了 `Accept: application/json`，但服务器只能产出 XML。礼貌的应答是什么？"
    options:
      - 404 Not Found
      - 500 Internal Server Error
      - 406 Not Acceptable，或者照样回 XML
    answer: 2
    explain: Accept 是一种偏好。严格的服务器回 406；很多服务器直接把手上的发给你，所以永远要检查响应的 Content-Type。
---

正文只是一串字节。同样的字节可以是 JSON、CSV、一张图片或一个 zip，服务器光看是分辨不出来的。两个请求头把这个说清楚，一个负责每个方向：

- **`Content-Type`** 给*这条*消息的正文贴标签：「我发给你的是 JSON」。
- **`Accept`** 是请求头，说明你希望*收回*什么格式：「我能读 CSV，请给我 CSV」。

发出这个愿望并真的拿到对应格式，叫**内容协商**。

```sequence
你 -> Sales API: GET /report（Accept: text/csv）
Note over Sales API: 我能生成 CSV 吗？能
Sales API --> 你: 200 OK（Content-Type: text/csv）
你 -> Sales API: POST /import（Content-Type: text/plain）
Sales API --> 你: 415 Unsupported Media Type
```

## 媒体类型

这些值叫**媒体类型**（也叫 MIME 类型）：一个大类加一个具体格式，中间用斜杠分开。

| 媒体类型 | 是什么 |
|---|---|
| `application/json` | JSON |
| `application/x-www-form-urlencoded` | 简单表单（上一课） |
| `multipart/form-data` | 带文件的表单 |
| `text/plain` | 纯文本 |
| `text/csv` | 逗号分隔值，像电子表格 |
| `image/png` | PNG 图片 |

媒体类型可以在 `;` 后面带参数，比如 `text/csv; charset=utf-8`（字符编码），或者 multipart 的 `boundary`。

> [!note] 可以这样想……
> 包裹上的标签。`Content-Type` 是你交出去那个包裹上的标签（「易碎：玻璃」）。`Accept` 是你给送货员留的条（「只要信件或小包裹」）。标签贴错的包裹可能会被退回来。

## 标签出错的时候

| 状态 | 含义 |
|---|---|
| `415 Unsupported Media Type` | 「你正文标的这个格式，我读不了。」检查你的 Content-Type。 |
| `406 Not Acceptable` | 「你的 Accept 允许的格式，我一个都产不出来。」放宽你的 Accept。 |

`415` 是个好例子：错误信息直接指向修法——数据可能完全正确，就因为标签错了而被拒。

## 在 Zorvik 里

- 选正文类型会自动设好 `Content-Type`：JSON、XML、表单、multipart 各自对得上。**Text** 正文类型有一个列表可选内容类型，从 `text/plain` 到 `text/csv`。
- 你在 **Headers** 标签页自己加的 `Content-Type` 优先于自动的那个。
- Zorvik 默认发送 `Accept: */*`（「什么都行」）。你自己加了 `Accept` 头，默认值就不再加。默认请求头可以在 **设置 → 请求** 里关掉。
- 响应的 `Content-Type` 决定 Zorvik 怎么显示正文：JSON 会被格式化，图片会给出预览。

> [!tip] 检查回来的是什么
> 别假设服务器照着你的 Accept 做了。去响应的 **Headers** 标签页看看它的 `Content-Type`。

**什么时候用得上：** 一个接口对着看起来没问题的正文回 415；一个导出接口既能回 CSV 也能回 JSON；或者某个客户端库发错了标签，你需要证明这一点。
