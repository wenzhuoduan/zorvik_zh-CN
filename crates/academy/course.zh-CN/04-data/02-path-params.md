---
id: path-params
title: 路径参数
summary: 很多 API 把某个具体对象写在路径里，比如 `/users/42`；用 `:id` 占位可以让一个请求、一条 Mock 路由适配所有取值。
minutes: 5
lab:
  title: 追一单
  goal: 填好路径变量，查一个用户和他的一笔订单。
  minutes: 6
  servers:
    api:
      name: Users API
      kind: http
      http:
        routes:
          - name: One user
            method: GET
            path: /users/:id
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"id": "{{request.params.id}}", "name": "Customer {{request.params.id}}", "orders": "/users/{{request.params.id}}/orders"}'
          - name: One order
            method: GET
            path: /users/:userId/orders/:orderId
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"userId": "{{request.params.userId}}", "orderId": "{{request.params.orderId}}", "status": "shipped", "tracking": "{{secret.tracking}}"}'
  steps:
    - text: |
        新建一个请求，URL 填 `{{api}}/users/:id`。**Params** 标签页里会出现一张 **Path variables** 表：把 `id` 设成 `42`，然后发送。
      hints:
        - 以 `:` 开头的路径段是占位符。发送时 Zorvik 会用 Path variables 表里的值填进去。
        - URL 里带上 `:id`，打开 **Params**，看 **Path variables** 下面。在 `id` 旁边填 `42`。
        - "URL {{api}}/users/:id，路径变量 id = 42，然后发送。服务器收到的是 /users/42。"
      check:
        all:
          - request: { server: api, method: GET, path: /users/42 }
          - send: { request: { url: "*/users/:id" } }
      solution:
        - send: { method: GET, url: "{{api}}/users/:id", pathParams: [{ key: id, value: "42" }] }
    - text: |
        现在用两个路径变量查用户 `42` 的 `7` 号订单：`{{api}}/users/:userId/orders/:orderId`。
      hints:
        - 每个 `:name` 路径段在 **Path variables** 下都有自己的行。
        - 把 URL 改成 `{{api}}/users/:userId/orders/:orderId`，然后填 `userId` = `42`、`orderId` = `7`。
        - "服务器应该收到 GET /users/42/orders/7。按发送。"
      check:
        all:
          - request: { server: api, method: GET, path: /users/42/orders/7 }
          - send: { request: { url: "*/users/:*/orders/:*" } }
      solution:
        - send:
            method: GET
            url: "{{api}}/users/:userId/orders/:orderId"
            pathParams: [{ key: userId, value: "42" }, { key: orderId, value: "7" }]
    - text: 订单已发货。把它的 `tracking` 码填进来。
      hints:
        - 在上一个请求的响应正文里。
        - 复制 `"tracking":` 后面的值，不要引号。
      check:
        answer: "{{secret.tracking}}"
      solution:
        - answer: "{{secret.tracking}}"
quiz:
  - question: 哪个 URL 用路径参数指出了 42 号用户？
    options:
      - /users?id=42
      - /users/42
      - /users#42
    answer: 1
    explain: 值就在路径本身里。`?id=42` 是查询参数，`#` 后面的内容服务器永远收不到。
  - question: 一条 Mock 路由的路径是 `/users/:id`。下面哪个请求它**不**匹配？
    options:
      - GET /users/7
      - GET /users/ada
      - GET /users/7/orders
    answer: 2
    explain: "`:id` 只匹配一个路径段，值是什么都可以。`/users/7/orders` 多了一段。"
  - question: 你把路径变量 `id` 设成 `a/b`。服务器会收到什么？
    options:
      - /users/a%2Fb，一段
      - /users/a/b，两段
      - 什么都收不到，Zorvik 会拒绝发送
    answer: 0
    explain: 路径变量的值会被百分号编码，所以值里的 `/` 不会把路径切成两段。
---

上一课的*查询串*说的是你要列表里的哪一部分。很多 API 还会把身份直接写进**路径**：`/users/42` 是「42 号用户」，`/users/42/orders/7` 是「42 号用户的第 7 单」。每一段会变化的部分就是一个**路径参数**。

```anatomy
GET /users | 一个集合：所有用户
GET /users/42 | 集合里的一项，用 id 指定
GET /users/42/orders | 属于那个用户的一个集合
GET /users/42/orders/7 | 那个用户的一笔订单
```

这种风格在 REST API 里很常见。REST 是一种流行的 HTTP API 设计方式：每个 URL 指定一个*东西*（资源），方法说明对它做什么——`GET /users/42` 读取这个用户，`DELETE /users/42` 删除它。

> [!note] 可以这样想……
> 一个街道地址。`/users/42/orders/7` 读起来像「用户街 42 号，7 号房」：每一段都缩小一次范围，直到只剩一扇门。

## 路径还是查询？

大多数 API 遵循的粗略规则：

| 用… | 当这个值… | 例子 |
|---|---|---|
| 路径参数 | *标识*某一个东西 | `/users/42` |
| 查询参数 | *筛选、排序或翻页*一个列表 | `/users?country=pt&page=2` |

## Zorvik 里的路径变量

文档里通常用占位符写路径，比如 `/users/:id` 或 `/users/{id}`。在 Zorvik 里你可以把 `:id` 留在 URL 中：**Params** 标签页会显示一张 **Path variables** 表，每个占位符一行，发送时由 Zorvik 把值填进去。

```flow
/users/:id -[id = 42]-> /users/42
/users/:userId/orders/:orderId -[userId = 42, orderId = 7]-> /users/42/orders/7
```

为什么不直接写 `42`？因为带 `:id` 的请求可以复用：改一个格子，或者把它设成 `{{userId}}` 这样的变量，而不是每次都改 URL。值会被**百分号编码**，所以空格变成 `%20`，`/` 变成 `%2F`，不会把路径段劈成两段。

## Mock 怎么读它们

实验里的 Mock 有一条路径为 `/users/:id` 的路由。它匹配 `/users/42`、`/users/ada` 或任何其他单个路径段，并通过模板把值交给响应：

```json
{"id": "{{request.params.id}}", "name": "Customer {{request.params.id}}"}
```

查 `/users/42`，Mock 就答 `"id": "42"`。打开 **服务器 → Lab · Users API** 能看到这些路由。Mock 路由也接受 OpenAPI 文档里那种 `{id}` 写法，末尾的 `*` 可以匹配路径的剩余部分。

> [!tip] 大小写有影响
> 路径区分大小写：`/Users/42` 和 `/users/42` 可能是两回事，也可能其中一个是 404。

**什么时候用得上：** bug 报告说「42 号客户的第 7 单总价不对」。打开你保存的 `GET /users/:userId/orders/:orderId`，填两个格子，几秒内你就在看同一份数据了。
