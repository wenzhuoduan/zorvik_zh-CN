---
id: query-params
title: 查询参数
summary: URL 里 `?` 后面的那一段，精确告诉服务器你要哪一部分数据。
minutes: 5
lab:
  title: 找出最便宜的那本书
  goal: 用查询参数筛选、排序、限量一个商品列表，并看 Mock 如何据此挑选应答。
  minutes: 6
  servers:
    api:
      name: Bookshop API
      kind: http
      http:
        routes:
          - name: Cheapest book
            method: GET
            path: /products
            matchQuery:
              - { key: category, value: books }
              - { key: sort, value: price }
              - { key: limit, value: "1" }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"category": "books", "sort": "price", "limit": 1, "items": [{"title": "Refactoring on a Budget", "price": 4.99, "code": "{{secret.code}}"}]}'
          - name: Books
            method: GET
            path: /products
            matchQuery:
              - { key: category, value: books }
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"category": "books", "items": [{"title": "The Pragmatic Programmer", "price": 39.90}, {"title": "Clean Code", "price": 31.50}, {"title": "Refactoring on a Budget", "price": 4.99}]}'
          - name: Everything
            method: GET
            path: /products
            headers:
              - { key: Content-Type, value: application/json }
            body: '{"hint": "That is the whole shop. Try ?category=books", "items": [{"title": "Clean Code", "price": 31.50}, {"title": "USB cable", "price": 7.00}, {"title": "Desk lamp", "price": 24.00}, {"title": "The Pragmatic Programmer", "price": 39.90}]}'
  steps:
    - text: 发送 `GET {{api}}/products?category=books`。只回来书。
      hints:
        - "`?` 后面的全部内容就是查询串，可以直接敲进地址栏。"
        - 新建一个请求（⌘/Ctrl + N），输入这个 URL 然后发送。然后打开地址栏下面的 **Params** 标签页，你的参数已经在表里了。
        - "方法 GET，URL {{api}}/products?category=books，然后发送。"
      check:
        request: { server: api, method: GET, path: /products, query: { category: books } }
      solution:
        - send: { method: GET, url: "{{api}}/products?category=books" }
    - text: |
        在 **Params** 标签页再加两行：`sort` = `price`，`limit` = `1`。边输入边看 URL 跟着变，然后发送。
      hints:
        - 表格和 URL 是同一个查询串的两种视图，改哪个都行。
        - 在 **Params** 里点 `category` 下面的空行，参数填 `sort`，值填 `price`。同样再加 `limit` = `1`。
        - "URL 应该以 ?category=books&sort=price&limit=1 结尾。按发送。"
      check:
        request: { server: api, method: GET, path: /products, query: { category: books, sort: price, limit: "1" }, route: Cheapest book }
      solution:
        - send: { method: GET, url: "{{api}}/products?category=books&sort=price&limit=1" }
    - text: 只回来一本书，也就是最便宜的那本。把它的 `code` 填进来。
      hints:
        - 看响应正文，`items` 里那一项有一个 `code` 字段。
        - 复制 `"code":` 后面的值，不要引号。
      check:
        answer: "{{secret.code}}"
      solution:
        - answer: "{{secret.code}}"
quiz:
  - question: 在 `/orders?status=open&page=2` 里，`page` 是什么？
    options:
      - 路径的一部分
      - 一个查询参数，值是 2
      - 一个请求头
    answer: 1
    explain: "`?` 后面的全部内容就是查询串。`status=open` 和 `page=2` 是两个参数，用 `&` 连接。"
  - question: 你把 Params 表里某一行的勾去掉，那个参数会怎样？
    options:
      - 被永久删除
      - 带着空值发出去
      - 留在表里，但不会发送
    answer: 2
    explain: 取消勾选的行会跟着请求一起保存，这样你可以随手开关一个筛选条件，而不用重新输入。
  - question: 你想搜 `rock & roll`。为什么 `&` 不能原样放进 URL？
    options:
      - 未转义的 `&` 会开始一个新参数，你的值会被切成两段
      - URL 里只能出现字母、数字和短横线
      - "`&` 会把请求变成 POST"
    answer: 0
    explain: "`&` 用来分隔参数，所以要放在值里就必须写成 `%26`。Params 表会替你完成这件事。"
---

URL 不只承载一个地址。`?` 后面是**查询串**：一串小的 `key=value` 对，用 `&` 连接，告诉服务器你要*哪一部分*数据。每一对就是一个**查询参数**。

```anatomy
https://shop.example/products | 位置：主机和路径
?category=books | 查询串从第一个 ? 开始
&sort=price | 更多参数，用 & 连接
&limit=1 | 值永远是文本：是服务器决定它表示一个数字
```

路径说你在要*什么*（商品），查询参数说*要多少、按什么顺序*。

> [!note] 可以这样想……
> 在熟食柜台点单。路径是那个柜台（「我要商品」）。查询参数是你补充的细节：「只要书，最便宜的在前，而且只要一本」。

## 查询参数用来做什么

| 用途 | 常见参数 |
|---|---|
| 筛选 | `?status=open`、`?category=books` |
| 排序 | `?sort=price`、`?order=desc` |
| 翻长列表 | `?page=2&limit=50`、`?offset=100` |
| 搜索 | `?q=keyboard` |

参数的**名字没有统一标准**：每个 API 自己定，所以要看它的文档。这些对的先后顺序对服务器通常无所谓。

## Params 标签页

在 Zorvik 里，地址栏下面的 **Params** 标签页把查询串显示成一张表。表和 URL 是同一件事的两种视图：改一边，另一边跟着变。把某一行的勾去掉就不再发送它，但不会丢失，用来开关筛选条件很方便。

## 特殊字符

有些字符在 URL 里有特别含义：`?` 开始查询串，`&` 分隔参数对，`=` 连接键和值，`#` 开始一段服务器永远看不到的片段。要在值里*使用*它们，就得做**百分号编码**：写成 `%` 加两位十六进制数。

| 字符 | 编码后 |
|---|---|
| 空格 | `%20`（网页表单常用 `+`） |
| `&` | `%26` |
| `#` | `%23` |

在 Params 表里输入值时，Zorvik 会替你转义 `&` 和 `#`，空格在发送时编码。服务器再全部解码回来，所以 `q=rock%20%26%20roll` 到达时就是 `rock & roll`。

## 服务器怎么挑应答

实验里的练习服务器是一个 **Mock**：一个小的假 API，用你描述的路由作答。一条路由可以声明「只有当查询里有 `category=books` 时才应答」（在 Mock 路由里是 **Match only when → Query parameters**）。路由从上往下试，第一条匹配的作答：

```flow
?category=books&sort=price&limit=1 -> Cheapest book
?category=books -> Books
没有参数 -> Everything
```

真实的服务器在代码里做的是同一类事：读参数、过滤数据、只回匹配上的部分。

> [!tip] 参数是 URL 的一部分
> 它们会出现在浏览器历史、服务器日志和截图里。绝不要把密码或令牌放进查询串。

**什么时候用得上：** 翻一长串订单、搜某个客户，或者复现用户带着特定筛选条件遇到的 bug。把他那条 URL 粘过来，所有筛选条件就都在了。
