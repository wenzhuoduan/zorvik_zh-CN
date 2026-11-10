---
id: mock-templates
title: 用模板做动态回答
summary: 模板把 Mock 的答案从请求里填出来，于是一条路由就能回答 /users/1、/users/42 和中间所有用户。
minutes: 6
lab:
  title: 一个认识所有人的通讯录
  goal: 让一个 Mock 能回答任意用户 id、回显搜索词，并「创建」带新 id 的用户。
  minutes: 10
  steps:
    - text: |
        在 **服务器** 里新建一个 **Mock API (HTTP)**，命名为 **Directory API**，按 **启动**。
      hints:
        - "上一课做过，随便找一个空闲端口就行。"
        - "服务器 → ＋ → Mock API (HTTP)，起个名字，然后按标签页右上角的启动。"
        - "服务器 → ＋ → Mock API (HTTP) → Directory API → 创建 → 启动。端口被占用就换一个再启动。"
      check:
        saved:
          server: { name: Directory API, running: true }
      solution:
        - call:
            method: server.create
            params:
              server: &directory
                name: Directory API
                kind: http
                port: 0
                http:
                  routes:
                    - method: GET
                      path: /hello
                      status: 200
                      headers: [{ key: Content-Type, value: application/json }]
                      body: "{\n  \"message\": \"Hello from Zorvik\"\n}"
        - call:
            method: server.save
            params: { id: Directory API, server: *directory }
        - call:
            method: server.start
            params: { id: Directory API, server: *directory }
    - text: |
        按 **添加路由**，做成 `GET /users/:id`，**响应正文** 如下：

        ```json
        {"id": "{{request.params.id}}", "name": "User {{request.params.id}}"}
        ```

        实验会请求 `/users/42`，并期待答案里出现 `42`。
      hints:
        - "路径里的 `:id` 匹配任意值，模板把这个值放进答案。"
        - "添加路由，路径填 /users/:id，状态保持 200、Content-Type 头保留，粘上正文。运行中的 Mock 会边输入边生效。"
        - "路径 /users/:id，正文 {\"id\": \"{{request.params.id}}\", \"name\": \"User {{request.params.id}}\"}。按 ⌘S 保存。"
      check:
        probe:
          kind: http
          name: Directory API
          path: /users/42
          expect:
            status: 200
            json: { id: "42" }
      solution:
        - call:
            method: mock.addRoute
            params:
              serverId: Directory API
              route:
                method: GET
                path: /users/:id
                status: 200
                headers: [{ key: Content-Type, value: application/json }]
                body: "{\"id\": \"{{request.params.id}}\", \"name\": \"User {{request.params.id}}\"}"
    - text: |
        现在做一个搜索。加一条 `GET /search` 路由，把查询串里的搜索词回显出来：

        ```json
        {"query": "{{request.query.q}}", "results": []}
        ```

        实验会搜 `/search?q=zorvik`。
      hints:
        - "查询串是 `?` 后面那一段。它的参数不属于路由的路径。"
        - "添加路由，路径 /search（路径里不写 ?q），在正文里用 {{request.query.q}}。"
        - "路径 /search，状态 200，正文 {\"query\": \"{{request.query.q}}\", \"results\": []}。"
      check:
        probe:
          kind: http
          name: Directory API
          path: /search?q=zorvik
          expect:
            status: 200
            json: { query: zorvik }
      solution:
        - call:
            method: mock.addRoute
            params:
              serverId: Directory API
              route:
                method: GET
                path: /search
                status: 200
                headers: [{ key: Content-Type, value: application/json }]
                body: "{\"query\": \"{{request.query.q}}\", \"results\": []}"
    - text: |
        最后一条：创建用户。加一条 `POST /users` 路由，状态 **201**，正文如下：它给每个新用户一个全新的 id，并把收到的内容重复一遍：

        ```json
        {"id": "{{$uuid}}", "created": {{request.body}}}
        ```

        实验会发送 `{"name": "Ada"}`。
      hints:
        - "201 Created 是「POST 新建了东西」的常规回答。`{{$uuid}}` 每次都是新的随机 id。"
        - "添加路由，方法列表里选 POST，路径 /users，状态 201。`{{request.body}}` 外面不要加引号，因为请求正文本身就是 JSON。"
        - "方法 POST，路径 /users，状态 201，正文 {\"id\": \"{{$uuid}}\", \"created\": {{request.body}}}。"
      check:
        probe:
          kind: http
          name: Directory API
          method: POST
          path: /users
          headers: { Content-Type: application/json }
          body: '{"name": "Ada"}'
          expect:
            status: 201
            json:
              id: "re:^[0-9a-fA-F-]{36}$"
              created: { name: Ada }
      solution:
        - call:
            method: mock.addRoute
            params:
              serverId: Directory API
              route:
                method: POST
                path: /users
                status: 201
                headers: [{ key: Content-Type, value: application/json }]
                body: "{\"id\": \"{{$uuid}}\", \"created\": {{request.body}}}"
quiz:
  - question: 一条路由的路径是 `/orders/:orderId`。哪个占位符能把 `981` 放进 `GET /orders/981` 的答案？
    options:
      - "`{{request.params.orderId}}`"
      - "`{{request.query.orderId}}`"
      - "`{{orderId}}`"
    answer: 0
    explain: 路径里写成 `:name` 的部分是路由参数，用 `{{request.params.name}}` 读取。查询串是 `?` 后面的值。
  - question: 两条路由都匹配 `GET /users/0`，先是 `GET /users/:id`，再是 `GET /users/0`。哪条作答？
    options:
      - "`GET /users/0`，因为它更精确"
      - 两个答案会合并
      - "`GET /users/:id`，因为第一条匹配且启用的路由作答"
    answer: 2
    explain: 顺序很重要。把 `/users/0` 这种特殊情况放在通用的 `/users/:id` 上面（拖动可以改顺序）。
  - question: 为什么用 `{{$uuid}}` 而不是像 `"1"` 这样的固定 id 来回答 POST？
    options:
      - UUID 更短
      - 每个新建的东西都拿到不同的 id，就像真服务器会给的那样
      - 客户端不接受固定 id
    answer: 1
    explain: 如果每张「新」订单都是 1 号，把东西搞混的 bug 就会一直藏着。每次都给新 id 才像真的。
---

固定答案的路由对菜单够用。但用户资料页会请求 `/users/1`、`/users/2`、`/users/42`……你不想建一千条路由。你想要的是一条路由，答案跟着请求变。这就是**模板**干的事。

## 占位符

模板就是正文里带双层花括号空位的答案。请求进来时，Mock 从这条请求里把每个空位填上。

| 占位符 | 填什么 | 对 `GET /users/42?lang=nl` |
|---|---|---|
| `{{request.params.id}}` | 路由路径里的 `:id` 部分 | `42` |
| `{{request.query.lang}}` | 一个查询参数 | `nl` |
| `{{request.headers.Accept}}` | 一个请求头 | 客户端发来的值 |
| `{{request.body}}` | 整个请求正文 | （这个 GET 没有） |
| `{{request.method}}`、`{{request.path}}` | 方法和路径 | `GET`、`/users/42` |
| `{{$uuid}}` | 每次一个新的随机 id | `3f2b9c1e-…` |

占位符在响应头和正文里都能用。`{{baseUrl}}` 这类环境变量也可以。

```sequence
participants: App, Mock
App -> Mock: GET /users/42
Note over Mock: 路由 /users/:id，所以 id 是 42
Mock --> App: 200 {"id": "42", "name": "User 42"}
```

> [!note] 可以这样想……
> 一封模板信：「亲爱的 {{name}}，您的订单 {{number}} 已发货。」信只写一次，空位按每位客户填。模板路由就是给请求用的模板信。

## 加不加引号？

占位符会被替换成纯文本。在 JSON 里，文本需要引号，所以写 `"id": "{{request.params.id}}"`。但 `{{request.body}}` 本身通常就是 JSON，所以它**不加**引号：`"created": {{request.body}}`。

## 更精确地匹配

有时候同一个路径应该给出不同答案。在路由上打开 **仅在满足条件时匹配**，加上条件：一个查询参数、一个请求头，或者正文里必须包含的文本。比如一条 `GET /users/:id` 路由只在存在 `Authorization` 头时匹配，后面跟一条通用的回答 `401 Unauthorized`。

记住上一课那条规则：**第一条匹配且启用的路由作答**。把特殊情况（比如 `/users/0` 返回 `404`）放在通用的 `/users/:id` 上面。在列表里拖动可以改顺序。

> [!tip] 在 Zorvik 里试模板
> 从请求标签页给 Mock 发一个请求，看响应。占位符回来是空的，就检查拼写：`{{request.params.id}}` 必须和路径里的 `:id` 完全一致。

**什么时候用得上：** 某个页面要显示「任意用户」或「任意订单」，创建表单需要返回一个像样的新 id，或者你想让搜索框证明它真的把用户输入的词发出去了。
