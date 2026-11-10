---
id: graphql-queries
title: "GraphQL：只要你要的那部分"
summary: 一个接口，一条只列出所需字段的查询，回来的答案就长成你问的样子。
minutes: 5
lab:
  title: 精确下单
  goal: 向练习服务器发 GraphQL 查询，只拿回你要的那些字段。
  minutes: 8
  playground: true
  steps:
    - text: |
        新建一个 GraphQL 请求：点标签栏末端的 **+**，选择 **GraphQL 请求**。URL 填 `{{playground}}/graphql`，在查询编辑器里输入 `{ hello }`，按 **发送**。
      hints:
        - "GraphQL 请求就是一个正文是查询的 HTTP POST。你选了 GraphQL 请求，Zorvik 就替你配好了。"
        - "点标签栏右端的 +，选 GraphQL 请求。把 {{playground}}/graphql 粘到地址栏，然后在 Body 标签页的大编辑器里输入 { hello }。"
        - "URL {{playground}}/graphql，查询 { hello }，然后发送（⌘/Ctrl + Enter）。答案是 data.hello：Hello, world!"
      check:
        send: { url: "*/graphql*", status: 200, json: { data: { hello: "Hello, world!" } } }
      solution:
        - send: { method: POST, url: "{{playground}}/graphql", body: { type: graphql, graphql: { query: "{ hello }" } } }
    - text: |
        查 id 为 `1` 的用户，但只要他的 `name` 和 `email`。别的都不该回来。
      hints:
        - "user 这个字段接受一个参数：user(id: 1)。在它的花括号里只列你要的字段。"
        - "在花括号里开始输入时，编辑器会提示存在的字段。不要写 id、role 和 posts。"
        - "把查询换成 { user(id: 1) { name email } }，然后发送。"
      check:
        send: { json: { data: { user: { name: Ada Lovelace, email: ada@example.test, id: "!*", role: "!*", posts: "!*" } } } }
      solution:
        - send: { method: POST, url: "{{playground}}/graphql", body: { type: graphql, graphql: { query: '{ user(id: "1") { name email } }' } } }
    - text: |
        字段可以嵌套。在同一条查询里要这个用户的 `posts`，每篇文章只要 `title`。然后把 **Ada 的第二篇文章** 的标题填在这里。
      hints:
        - "posts 是一组 Post 对象，所以它需要自己的花括号，里面写你要从每篇文章拿的字段。"
        - "在 user 的花括号里加上 posts { title }，发送，然后看响应里 posts 列表的第二项。"
        - "发送 { user(id: 1) { name posts { title } } }，把响应里的第二个标题复制过来。"
      check:
        all:
          - send: { json: { data: { user: { posts: [{ title: "*" }] } } } }
          - answer: On Bernoulli numbers
      solution:
        - send: { method: POST, url: "{{playground}}/graphql", body: { type: graphql, graphql: { query: '{ user(id: "1") { name posts { title } } }' } } }
        - answer: On Bernoulli numbers
    - text: |
        现在故意犯个错：向服务器要一个不存在的字段，比如 `age`，照样发送。读读回来的 `data` 之外的东西。
      hints:
        - "编辑器已经把 age 标红：它知道 schema。照样发出去，看看服务器那边怎么说。"
        - "试试 { user(id: 1) { name age } }，在响应里找 errors 列表。"
        - "发送 { user(id: 1) { age } }。服务器回 400，errors 里写 Cannot query field age on type User。"
      check:
        send: { url: "*/graphql*", json: { errors: [{ message: "Cannot query field*" }] } }
      solution:
        - send: { method: POST, url: "{{playground}}/graphql", body: { type: graphql, graphql: { query: '{ user(id: "1") { age } }' } } }
quiz:
  - question: 你只需要用户的名字。怎么从 GraphQL API 只拿到它？
    options:
      - 请求 /users/1/name 这样的特殊地址
      - 在查询里 user 的花括号内只列出 name 这个字段
      - '发一个写着 "Fields: name" 的请求头'
    answer: 1
    explain: GraphQL 由查询本身说明你要哪些字段。你没有列出的字段永远不会被发送。
  - question: 一个 GraphQL 服务器回了状态码 200。你的查询成功了吗？
    options:
      - 成功了，200 永远表示一切正常
      - 没成功，查询成功时 GraphQL 会回 201
      - 不一定。要看正文里有没有 errors 列表
    answer: 2
    explain: 很多 GraphQL 服务器即使查询失败也回 200，把问题放在 errors 列表里，所以要读正文。
  - question: 一个典型的 GraphQL API 有几个接口？
    options:
      - 通常只有一个，比如 /graphql
      - 每种数据一个
      - 每个字段一个
    answer: 0
    explain: 一个接口服务所有查询。你拿到什么取决于查询，而不是 URL。
---

到目前为止你见到的大多是 **REST** API：很多 URL，每种东西一个（`/users/1`、`/users/1/posts`），每个 URL 用服务器选定的形状作答。这带来两个经典烦恼：

- **取多了（over-fetching）：** 你只要一个用户的名字，`/users/1` 却发来四十个字段。
- **取少了（under-fetching）：** 你要一个用户*和*他的文章，于是发了两个或三个请求。

**GraphQL** 是 Facebook 最早做出来的一门 API 查询语言，它把这件事倒了过来。通常只有**一个接口**（往往是 `/graphql`），而*你*写出到底要哪些字段。答案的形状和你问的形状一样。

```sequence
应用 -> 服务器: POST /graphql { user(id: "1") { name } }
Note over 服务器: 找到 1 号用户，只留 name
服务器 --> 应用: 200 {"data": {"user": {"name": "Ada Lovelace"}}}
```

## 读懂一条查询

```anatomy
query { | 操作：query 表示读取数据（这个词可以省略）
user(id: "1") { | 一个字段带参数：哪一个用户
name | 你要回来的字段
email | 又一个；没有列出的字段永远不会到
} } | 右花括号先结束 user，再结束整条查询
```

- **字段**是一块数据，比如 `name`。
- **参数**把字段范围缩小，比如 `id: "1"`。
- 字段后面的花括号里是它的**选择集**：你要从它内部拿的字段。选择集可以按数据的深度一直嵌下去，所以 `user { posts { title } }` 一次往返就能拿到一个用户和他的文章标题。

服务器的答案在顶层 `data` 键下映出这个形状：

```json
{ "data": { "user": { "name": "Ada Lovelace", "email": "ada@example.test" } } }
```

> [!note] 可以这样想……
> 套餐和自助餐。REST 接口是套餐：整盘都给你。GraphQL 是只有一个柜台的自助：你指什么，什么才落到你盘子里。

## 它在网上怎么走

GraphQL 不是新的网络协议，它跑在普通 HTTP 上：一条查询通常是一个 `POST`，正文是 `{"query": "{ hello }"}` 这样的 JSON。在 Zorvik 里你不用自己写那段 JSON。**GraphQL 请求**的 **Body** 标签页里有一个查询编辑器，替你包好一切。它还会边输入边提示字段名，因为它读过服务器的字段清单（下一课会讲）。

## 出错的时候

GraphQL 服务器在运行之前会先拿你的查询去对照它知道的字段。要了不存在的东西，你拿到的是 `errors` 列表而不是 `data`。每个错误有一个 `message`，通常还有出错位置在你查询里的 `locations`（行和列）：

```json
{ "errors": [{ "message": "Cannot query field \"age\" on type \"User\"." }] }
```

> [!warning] 别只看状态码
> 很多 GraphQL 服务器在查询失败时也回 `200 OK`，把问题放进 `errors`。练习服务器对坏查询回 `400`，但无论如何都要读正文。

> [!tip] 读和写
> 读数据是 **query**。改数据（创建、更新、删除）是 **mutation**，写法一样：`mutation { echo(text: "hi") }`。下一课你会发一个。

**什么时候用得上：** 一个手机页面需要用户的名字、头像和最近三张订单。用 GraphQL，这就是一个请求，只返回这几个字段：在慢速的手机网络上少传数据，也少几次往返。页面显示不对时，把它的查询粘进 Zorvik，就能看到服务器到底返回了什么。
