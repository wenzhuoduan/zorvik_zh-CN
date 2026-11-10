---
id: requests-and-responses
title: 把请求和响应拆开看
summary: 每条 HTTP 消息都是一行起始行、若干请求头、一个空行，以及可选的正文。
minutes: 6
lab:
  title: 拆解一个响应
  goal: 发出请求，从响应头里找出藏着的值，然后加一个查询参数。
  minutes: 6
  servers:
    api:
      name: Cafe API
      kind: http
      http:
        routes:
          - method: GET
            path: /orders/:id
            headers:
              - key: Content-Type
                value: application/json
              - key: X-Ticket
                value: "{{secret.ticket}}"
            body: '{"id": "{{request.params.id}}", "item": "cappuccino", "size": "large", "status": "baking"}'
  steps:
    - text: 发送 `GET {{api}}/orders/42`，看看响应。
      hints:
        - 「Lab」环境已经选中，`{{api}}` 里是 Cafe API 的地址。
        - "按 ⌘N（Windows 上是 Ctrl+N），输入 `{{api}}/orders/42`，然后按发送。"
      check:
        request: { server: api, method: GET, path: /orders/42 }
      solution:
        - send: { method: GET, url: "{{api}}/orders/42" }
    - text: 服务器加了一个自定义响应头 `X-Ticket`。打开响应的 **Headers** 标签页，把它的值填进来。
      hints:
        - 响应有自己的一套标签页（Body、Headers、Cookies、Timing、Info），和请求的标签页是分开的。屏幕上没有响应？从历史里打开那个请求。
        - 点响应里的 Headers，找到名叫 X-Ticket 的那一行。
        - 复制 X-Ticket 旁边的值（一个词加一个数字）。
      check:
        answer: "{{secret.ticket}}"
      solution:
        - answer: "{{secret.ticket}}"
    - text: |
        加一个查询参数 `fields`，值是 `status`，再发一次。可以用请求的 **Params** 标签页，也可以直接在 URL 末尾输入 `?fields=status`：两边是同步的。
      hints:
        - 查询串从路径后面的 ? 开始，然后是 name=value 这样的对。
        - 在 Params 标签页加一行，键填 fields，值填 status。URL 会自己更新。
        - "URL 变成 `{{api}}/orders/42?fields=status`。按发送。"
      check:
        request: { server: api, method: GET, path: /orders/42, query: { fields: status } }
      solution:
        - send: { method: GET, url: "{{api}}/orders/42?fields=status" }
quiz:
  - question: 在 `GET /users?page=2 HTTP/1.1` 里，`page=2` 是什么？
    options:
      - 方法
      - 一个请求头
      - 查询串，给服务器的额外选项
      - 正文
    answer: 2
    explain: "? 后面的全部内容就是查询串，是 name=value 用 & 连接起来的。"
  - question: 请求头和正文之间由什么分隔？
    options:
      - 一个空行
      - 一个逗号
      - 单词 BODY
      - 不用分隔，正文在前面
    answer: 0
    explain: 请求头一行一个，第一个空行表示「正文从这里开始」。
  - question: 哪个请求头告诉接收方正文是什么格式？
    options:
      - Accept
      - Content-Type
      - Host
      - User-Agent
    answer: 1
    explain: Content-Type 描述正在发送的正文。Accept 说的是你希望收到什么格式。
---

**HTTP**（HyperText Transfer Protocol）是浏览器和几乎所有 API 说的语言。它可读得出奇地好：在 HTTP/1.1 里，每条消息就是几行纯文本。新版本（HTTP/2 和 HTTP/3）把同样的部件压成更紧凑的形式，但部件还是那些。我们来拆开看看。

## 一个请求

```anatomy
GET /orders/42?fields=status HTTP/1.1 | 请求行：方法、目标、HTTP 版本
Host: api.cafe.test | 请求头：你要找哪个站点（一台服务器可以托管很多）
Accept: application/json | 请求头：你希望收到什么格式
(empty line) | 请求头结束
{"note": "extra hot"} | 正文：可选的数据，随 POST、PUT、PATCH 发送
```

**目标**由两部分组成：

- **路径** `/orders/42`：你要服务器上的哪个东西；
- **查询串** `?fields=status`：以 `name=value` 对给出的额外选项，用 `&` 连接，例如 `?page=2&size=20`。

## 一个响应

```anatomy
HTTP/1.1 200 OK | 状态行：版本、状态码和一句简短说明
Content-Type: application/json | 请求头：正文是什么
X-Ticket: T-1234 | 服务器自己编的自定义头（很多以 X- 开头）
(empty line) | 请求头结束
{"id": 42, "status": "baking"} | 正文：答案本身
```

两者成对出现：

```sequence
participants: 客户端, 服务器
客户端 -> 服务器: GET /orders/42 加上若干请求头
Note over 服务器: 查 42 号订单
服务器 --> 客户端: 200 OK 加上请求头和 JSON 正文
```

> [!note] 可以这样想……
> 一个包裹。起始行是地址标签，请求头是箱子上的贴纸（「易碎」「此面朝上」「内有 JSON」），正文是里面的东西。分拣中心只看标签和贴纸，从不打开箱子。

## 每个请求都是独立的

HTTP 是**无状态**的：服务器不记得你上一个请求。每个请求都必须自带服务器作答所需的全部信息，所以你登录后拿到的令牌会在*每一个*请求的请求头里带上，而不只是第一个。服务器也从不先开口：没有请求，就没有响应。

## 在 Zorvik 里各部件在哪

| 部件 | 请求里 | 响应里 |
|---|---|---|
| 方法与 URL | 地址栏 | **Info** 标签页 |
| 查询串 | **Params** 标签页（与 URL 同步） | |
| 状态 | | 响应顶部那个带颜色的徽章 |
| 请求头 | **Headers** 标签页 | **Headers** 标签页 |
| 正文 | **Body** 标签页 | **Body** 标签页（**Pretty** 或 **Raw**） |

Zorvik 还会替你加几个你没输入的请求头，比如 `User-Agent`（是谁在问）和 `Host`。响应的 **Info** 标签页里有「已发送的请求」一节，能看到请求发出去时的原样。

> [!tip] 请求头没有顺序，也（大多）不区分大小写
> `Content-Type` 和 `content-type` 是同一个头，请求头的先后顺序也不重要。但**值**通常区分大小写。

**什么时候用得上：** API「无视」了你发的东西。十次里有九次，答案就在细节里：漏了一个请求头、查询串打错了，或者正文不是服务器期望的形状。
