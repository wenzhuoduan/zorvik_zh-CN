---
id: graphql-variables-schema
title: GraphQL 变量与 schema
summary: 查询只写一次，值用变量传；schema 会告诉你——也告诉 Zorvik——你能问哪些字段。
minutes: 6
lab:
  title: 读菜单，填空
  goal: 浏览练习服务器的 schema，然后发一个带变量的查询和一个带变量的 mutation。
  minutes: 8
  playground: true
  steps:
    - text: |
        新建一个指向 `{{playground}}/graphql` 的 **GraphQL 请求**（或者复用上一课那个）。在 **Body** 标签页里点 **Schema** 开关打开 schema 面板，然后点 **刷新 Schema**，从服务器重新读一遍 schema。
      hints:
        - "Zorvik 是通过向请求的 URL 发一条 introspection 查询来读 schema 的，所以得先有 URL。"
        - "Schema 开关和刷新 Schema 按钮在查询编辑器上方的工具栏里，挨着格式化。"
        - "URL 设成 {{playground}}/graphql，然后点查询上方工具栏里的刷新 Schema。把鼠标停在 Schema 开关上：它会显示 Schema 已加载。"
      check:
        call: { method: graphql.schema, ok: true }
      solution:
        - call: { method: graphql.schema, params: { request: { name: GraphQL, method: POST, url: "{{playground}}/graphql", body: { type: graphql, graphql: { query: "{ hello }" } } }, path: null, refresh: true } }
    - text: |
        在 schema 面板里打开 **Query** 类型。它有一个字段被标为 **deprecated**（已弃用：还能用，但你不该再用它了）。是哪个字段？
      hints:
        - "Query 是 schema 面板顶部那几个根类型之一。点它就能看到它的字段。"
        - "已弃用的字段会带一条 Deprecated 注记，说明该改用哪个。"
        - "在 schema 面板里打开 Query。那个带 Deprecated 注记（写着改用 hello）的字段就是答案。"
      check:
        answer: greeting
      solution:
        - answer: greeting
    - text: |
        现在用变量。发送这条查询，并在编辑器下面的 **变量** 框里填 `{"id": "2"}`：

        ```text
        query GetUser($id: ID!) {
          user(id: $id) { name role }
        }
        ```
      hints:
        - "查询里声明了 $id，并在原本该写值的位置使用它。值本身以 JSON 写在变量框里。"
        - "变量框在查询编辑器下面。它的键不带 $：变量 $id 由键 id 提供值。"
        - "把查询照原样粘进去，在变量里输入 {\"id\": \"2\"}，然后发送。这个用户是 Alan Turing。"
      check:
        send: { request: { body: { graphql: { query: "*$id*" } } }, json: { data: { user: { name: Alan Turing } } } }
      solution:
        - send: { method: POST, url: "{{playground}}/graphql", body: { type: graphql, graphql: { query: "query GetUser($id: ID!) { user(id: $id) { name role } }", variables: '{"id": "2"}' } } }
    - text: |
        最后，一个带变量的 mutation。练习服务器只有一个无害的 mutation `echo`，它把你的文本送回来。发送：

        ```text
        mutation Shout($text: String!) {
          echo(text: $text)
        }
        ```

        变量填 `{"text": "Hello from Zorvik"}` 之类。
      hints:
        - "mutation 的写法和查询一样，只是开头那个词是 mutation。"
        - "在操作名后面声明 $text 为 String!，在 echo(text: $text) 里使用它，然后在变量里给它一个值。"
        - "把 mutation 照原样粘进去，在变量里输入 {\"text\": \"Hello from Zorvik\"}，然后发送。"
      check:
        send: { request: { body: { graphql: { query: "*mutation*$text*" } } }, json: { data: { echo: "*" } } }
      solution:
        - send: { method: POST, url: "{{playground}}/graphql", body: { type: graphql, graphql: { query: "mutation Shout($text: String!) { echo(text: $text) }", variables: '{"text": "Hello from Zorvik"}' } } }
quiz:
  - question: "操作名后面那个 `($id: ID!)` 声明了什么？"
    options:
      - 一个名为 id、类型为 ID、必须给值的变量
      - 给其他开发者看的可选注释
      - 要把查询发往的服务器的 ID
    answer: 0
    explain: 变量用 $ 和类型声明。! 表示这个值是必需的（不可为 null）。
  - question: "schema 里某个字段写作 `email: String`，没有 `!`。这说明什么？"
    options:
      - 邮箱永远存在
      - 邮箱是一个字符串列表
      - 邮箱可能是 null
    answer: 2
    explain: "没有 ! 的字段可能为 null。`name: String!` 才是每次都保证有值。"
  - question: 你输入查询时，Zorvik 怎么知道该提示哪些字段？
    options:
      - 从之前的响应里猜
      - 发一条 introspection 查询，读取服务器返回的 schema
      - 从 Zorvik 的网站上下载字段表
    answer: 1
    explain: Introspection 就是让服务器自己描述自己。Zorvik 用返回的结果做自动补全、红色波浪线和 schema 面板。
---

上一课你直接把值写进查询：`user(id: "1")`。这样能用，但值一变，查询文本就得跟着改。真实的应用程序把每条查询**只写一次**，变化的值另外传，就像一个带参数的函数。

## 变量

```anatomy
query GetUser($id: ID!) | 操作名 GetUser，一个类型为 ID 的变量 $id（! = 必填）
user(id: $id) { name role } | $id 出现在原本该写值的位置
{"id": "2"} | 变量框：实际的值，JSON 格式
```

查询和它的变量在同一个请求里一起走：`{"query": "…", "variables": {"id": "2"}}`。为什么要这么麻烦？

- **复用。** 同一个保存下来的请求可以查任何用户，只有变量变。
- **不用拼字符串。** 你不用把用户输入拼进查询文本里（也就不用跟引号打架）。
- **操作名**（比如 `GetUser`）会出现在服务器日志里；一个文档里放多个操作时它也是必需的（这时 Zorvik 会显示一个 **操作** 菜单让你挑）。

变量里也能用 Zorvik 的变量：`{"id": "{{userId}}"}` 会从你的环境里取值。

## schema：服务器的菜单

每个 GraphQL 服务器都有一个 **schema**，一份带类型的清单，列出你能问的一切。练习服务器的 schema 用 GraphQL 的 schema 语言写出来是这样（节选）：

```text
type Query {
  hello(name: String = "world"): String!
  user(id: ID!): User
  users(first: Int): [User!]!
}
type User { id: ID!  name: String!  email: String  role: Role!  posts: [Post!]! }
```

- `String`、`Int`、`ID`、`Boolean` 是**标量**：单个值。
- `User` 和 `Post` 是**对象类型**：它们自己带字段，所以你必须挑几个。
- `!` 表示**不可为 null**：永远在。`email: String` 可能是 null。
- `[Post!]!` 是一组文章：列表本身永远在，里面不含 null。

## Introspection

工具怎么知道 schema？问它。**Introspection** 是一条特殊的查询（`__schema`），GraphQL 服务器会用对自身的描述来回答。你的 GraphQL 请求一有 URL，Zorvik 就会发它，并把结果用在：

- 输入时的**自动补全**（或按 Ctrl + Space）：只提示存在的字段。
- 未知字段上的**红色波浪线**，在你发送之前就出现。
- **Schema** 面板：类型、字段、参数和说明。在查询里 ⌘/Ctrl 点一个字段就能跳过去。

```sequence
Zorvik -> 服务器: POST /graphql { __schema { types { name fields … } } }
服务器 --> Zorvik: 每个类型、字段和参数
Note over Zorvik: 自动补全、检查、Schema 面板
```

> [!note] 可以这样想……
> schema 是餐厅的菜单，introspection 是向服务员要菜单。变量是点单表上的空格（「几份？」）：表格本身不变，变的只是你在空格里填的东西。

> [!warning] 弃用的字段
> 标为 **deprecated** 的字段今天还能用，但已经在退场路上。schema 通常会说明该改用哪个。在它消失之前把你的查询挪开。

有些生产服务器会关掉 introspection。那时 Zorvik 无法提示字段，但你的查询照样能跑：向 API 团队要他们的 schema。

**什么时候用得上：** 你在测一个有十几个筛选条件的搜索页。保存一条查询，把它的变量指向环境变量，然后在 dev、staging、production 上重放，完全不用改查询文本。
