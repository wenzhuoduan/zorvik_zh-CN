---
id: http-methods
title: "方法：GET、POST、PUT、PATCH、DELETE"
summary: 方法说明要对一个东西做什么；「安全」和「幂等」说明重复发有多无害。
minutes: 6
lab:
  title: 一张便签的一生
  goal: 创建一张便签、改它的一部分、再删掉它，每一步用对方法。
  minutes: 7
  servers:
    api:
      name: Notes API
      kind: http
      http:
        routes:
          - method: GET
            path: /notes
            headers:
              - key: Content-Type
                value: application/json
            body: '[{"id": 1, "text": "Water the plants", "done": true}, {"id": 2, "text": "Call the bakery", "done": false}]'
          - method: POST
            path: /notes
            status: 201
            headers:
              - key: Content-Type
                value: application/json
              - key: Location
                value: /notes/3
            body: '{"id": 3, "created": {{request.body}}}'
          - method: PUT
            path: /notes/:id
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": "{{request.params.id}}", "replacedWith": {{request.body}}}'
          - method: PATCH
            path: /notes/:id
            headers:
              - key: Content-Type
                value: application/json
            body: '{"id": "{{request.params.id}}", "changed": {{request.body}}}'
          - method: DELETE
            path: /notes/:id
            status: 204
  steps:
    - text: |
        创建一张便签：发送 `POST {{api}}/notes`，正文用 JSON，例如 `{"text": "Buy milk"}`。服务器会回 **201 Created**。
      hints:
        - 在 URL 左边的方法列表里选 POST，然后打开请求的 Body 标签页。
        - 在 Body 标签页选 JSON，输入这张便签，带一个 "text" 字段。
        - '方法 POST，URL `{{api}}/notes`，Body → JSON：{"text": "Buy milk"}，然后发送。'
      check:
        request: { server: api, method: POST, path: /notes, json: { text: "*" } }
      solution:
        - send: { method: POST, url: "{{api}}/notes", body: { type: json, text: '{"text": "Buy milk"}' } }
    - text: |
        新便签的 id 是 3。不动它的内容，把它标记为完成：发送 `PATCH {{api}}/notes/3`，正文是 `{"done": true}`。
      hints:
        - PATCH 只改你发过去的字段，PUT 会替换整张便签。
        - 把方法换成 PATCH，URL 改成以 /notes/3 结尾，然后替换正文。
        - '方法 PATCH，URL `{{api}}/notes/3`，Body → JSON：{"done": true}，然后发送。'
      check:
        request: { server: api, method: PATCH, path: /notes/3, json: { done: true } }
      solution:
        - send: { method: PATCH, url: "{{api}}/notes/3", body: { type: json, text: '{"done": true}' } }
    - text: 用 `DELETE {{api}}/notes/3` 删掉这张便签。答案是 **204 No Content**，意思是「做完了，没什么可说的」。
      hints:
        - DELETE 不需要正文，URL 就说明了删哪一张。
        - "方法 DELETE，URL `{{api}}/notes/3`，然后发送。"
      check:
        request: { server: api, method: DELETE, path: /notes/3 }
      solution:
        - send: { method: DELETE, url: "{{api}}/notes/3" }
    - text: DELETE 是幂等的，所以再发一次也没关系。把同一条 DELETE **再发一次**。
      hints:
        - 就在同一个请求上再按一次发送。
        - ⌘↩（Windows 上是 Ctrl+Enter）发送当前标签页。
      check:
        request: { server: api, method: DELETE, path: /notes/3, count: 2 }
      solution:
        - send: { method: DELETE, url: "{{api}}/notes/3" }
quiz:
  - question: 你只想改便签的标题，其余保持不动。用哪个方法最合适？
    options:
      - PUT
      - PATCH
      - POST
      - GET
    answer: 1
    explain: PATCH 只发送改动。PUT 会替换整个资源，你得把每个字段都发一遍。
  - question: 哪个方法是「安全」的，也就是从不改动服务器上的任何东西？
    options:
      - GET
      - POST
      - DELETE
      - PATCH
    answer: 0
    explain: GET 只读。浏览器、缓存和搜索引擎会随意发 GET，所以 GET 绝不能改数据。
  - question: 一个「创建订单」的 POST 超时了。为什么直接重试有风险？
    options:
      - 重试会变成 GET
      - 服务器会拒绝所有重试
      - 同一个 URL 上 POST 只能发一次
      - 第一次可能已经成功了，重试会再建一单
    answer: 3
    explain: POST 不是幂等的。除非 API 提供了识别重复的手段（常见的是一个 Idempotency-Key 头），两次 POST 就是两单。
---

每个请求的第一个词是**方法**，也就是动词。URL 说*对哪个东西*，方法说*对它做什么*。大多数 API 遵循一种叫 **REST** 的风格：同样的 URL 配不同的方法：

| 方法 | 含义 | 例子 | 正文 |
|---|---|---|---|
| **GET** | 读取 | `GET /notes/3` | 无 |
| **POST** | 新建一个东西，或「做这件事」 | `POST /notes` | 新东西本身 |
| **PUT** | 完全替换 | `PUT /notes/3` | 完整的新版本 |
| **PATCH** | 改其中一部分 | `PATCH /notes/3` | 只有改动 |
| **DELETE** | 删除 | `DELETE /notes/3` | 通常无 |

这是便签的一生：

```sequence
participants: 你, Notes API
你 -> Notes API: POST /notes，带上新便签
Notes API --> 你: 201 Created，便签 id 是 3
你 -> Notes API: PATCH /notes/3，done = true
Notes API --> 你: 200 OK
你 -> Notes API: DELETE /notes/3
Notes API --> 你: 204 No Content
```

## 安全与幂等

每次 API 设计评审都会提到的两个词：

- **安全**：这个请求不改服务器上的任何东西。GET 是安全的（HEAD 和 OPTIONS 也是，这两个方法不常用）。浏览器、缓存和搜索引擎一直在发 GET，所以 GET 绝不能删东西、也不能买东西。
- **幂等**：发两次和发一次效果一样。PUT 和 DELETE 都是：用同样内容替换同一张便签两次，结果还是那张便签；删两次，它还是被删了。（第二次 DELETE 可能返回 404，但不会再有别的变化。）POST **不是**：两次 POST 通常会创建两张便签。PATCH 取决于改什么：「把 done 设为 true」是幂等的，「给点赞数加 1」不是。

| 方法 | 安全 | 幂等 |
|---|---|---|
| GET | 是 | 是 |
| PUT | 否 | 是 |
| DELETE | 否 | 是 |
| PATCH | 否 | 不一定 |
| POST | 否 | 否 |

为什么要关心这个？网络会出故障。请求超时的时候，你不知道服务器到底收没收到。幂等的请求直接重发就行；POST 不行，除非 API 给了你避免重复的办法，通常是一个 `Idempotency-Key` 头。支付类 API 就是这样避免重复扣款的。

> [!note] 可以这样想……
> 一盏台灯。「开灯」（PUT）是幂等的：按五次，灯还是开的。「切换」（POST 一类的动作）不是：按五次，最终是开是关取决于你从什么状态开始。而只是看一眼台灯（GET）是安全的。

## 在 Zorvik 里

在 URL 左边的方法列表里选方法。要发正文，就打开请求的 **Body** 标签页选 **JSON**：Zorvik 会替你加上 `Content-Type: application/json`。

> [!tip] 别只信方法名
> 有些 API 什么都用 POST，也有在 GET 里改数据的。测一个 API 时，确认 GET 真的什么都不改，重试的 PUT 和 DELETE 真的无害。

**什么时候用得上：** 设计或测试 API 时：确认读取从不改数据、重试 PUT 无害、双击「付款」按钮不会建出两单。
