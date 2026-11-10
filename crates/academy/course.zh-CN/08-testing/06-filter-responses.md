---
id: filter-responses
title: 过滤大响应
summary: 响应体上方的漏斗只显示你要的那部分，用 JSONPath 或 jq 挑（XML 和 HTML 用 XPath）。
minutes: 6
added: 0.2.0
lab:
  title: 在海量数据里找到它
  goal: 用 JSONPath 从订单列表里挑出姓名、按条件筛选，再用 jq 把总额加起来。
  minutes: 7
  servers:
    api:
      name: Order history API
      kind: http
      http:
        routes:
          - name: Orders
            method: GET
            path: /orders
            headers:
              - { key: Content-Type, value: application/json }
            body: &orders |
              {
                "page": 1,
                "orders": [
                  {"id": "A-1001", "customer": "Ada Lovelace", "total": 42.5, "status": "shipped", "items": [{"sku": "kb-01", "qty": 1}]},
                  {"id": "A-1002", "customer": "Grace Hopper", "total": 129.5, "status": "pending", "items": [{"sku": "ms-02", "qty": 2}, {"sku": "pad-01", "qty": 1}]},
                  {"id": "A-1003", "customer": "Alan Turing", "total": 18, "status": "shipped", "items": [{"sku": "cab-05", "qty": 3}]},
                  {"id": "A-1004", "customer": "Katherine Johnson", "total": 240.25, "status": "pending", "items": [{"sku": "mon-27", "qty": 1}]},
                  {"id": "A-1005", "customer": "Linus Torvalds", "total": 99.5, "status": "cancelled", "items": [{"sku": "kb-02", "qty": 1}]},
                  {"id": "A-1006", "customer": "Margaret Hamilton", "total": 310, "status": "shipped", "items": [{"sku": "lap-13", "qty": 1}]}
                ]
              }
  steps:
    - text: |
        发送 `GET {{api}}/orders`。然后点 **筛选**（正文上方的漏斗图标），语言保持 **JSONPath**，输入：

        ```text
        $.orders[*].customer
        ```

        正文现在只显示这六位客户的名字。
      hints:
        - "从左往右读：$ 是整个答案，.orders 是它的订单列表，[*] 是列表里每一项，.customer 是每项的那个键。"
        - 漏斗在正文工具栏里，挨着自动换行和复制正文。点开后正文上方会多一行，里面是语言选择和表达式框。
        - "GET {{api}}/orders，发送，点漏斗，选 JSONPath，输入 $.orders[*].customer。那一行会显示 6 个匹配。"
      check:
        all:
          - request: { server: api, method: GET, path: /orders }
          - call:
              method: response.filter
              ok: true
              params: { language: jsonPath }
              result: { count: 6, text: "*Ada Lovelace*Margaret Hamilton*" }
      solution:
        - send: { method: GET, url: "{{api}}/orders" }
        - call:
            method: response.filter
            params: { text: *orders, language: jsonPath, expression: "$.orders[*].customer" }
    - text: |
        现在只看大客户：把表达式改成显示**金额超过 100** 的订单的客户。过滤 `[?…]` 会保留条件为真的项，`@` 指正在被检查的那一项。
      hints:
        - "条件就写在原来 [*] 的位置：[?@.total > 100]。"
        - 末尾保留 .customer，这样你拿到的是名字，不是整张订单。
        - "输入 $.orders[?@.total > 100].customer。会显示 3 个匹配：Grace Hopper、Katherine Johnson 和 Margaret Hamilton。"
      check:
        call:
          method: response.filter
          ok: true
          params: { language: jsonPath }
          result: { count: 3, text: "*Grace Hopper*Katherine Johnson*Margaret Hamilton*" }
      solution:
        - call:
            method: response.filter
            params: { text: *orders, language: jsonPath, expression: "$.orders[?@.total > 100].customer" }
    - text: |
        JSONPath 只挑值；**jq** 还能拿它们做计算。**待处理（pending）**的订单里还压着多少钱？把筛选语言换成 **jq**，输入：

        ```text
        [.orders[] | select(.status == "pending") | .total] | add
        ```
      hints:
        - "顺着管道（|）读：取每一张订单，只留 pending 的，取它们的总价，放进一个列表 [ ]，再把列表加起来。"
        - 语言切换在筛选行的最左边。表达式框会边输入边出结果。
        - "选 jq，输入 [.orders[] | select(.status == \"pending\") | .total] | add。正文只显示一个数字：369.75。"
      check:
        call:
          method: response.filter
          ok: true
          params: { language: jq }
          result: { text: "369.75" }
      solution:
        - call:
            method: response.filter
            params: { text: *orders, language: jq, expression: '[.orders[] | select(.status == "pending") | .total] | add' }
quiz:
  - question: "`$.orders[*].id` 是哪种筛选语言？"
    options:
      - JSONPath
      - jq
      - XPath
    answer: 0
    explain: JSONPath 表达式以 $ 开头，代表整个文档。jq 以点开头，XPath 以斜杠开头。
  - question: 筛选显示 3 个匹配时，响应其余的部分怎么了？
    options:
      - 在服务器上被删掉了
      - Zorvik 重新发了一个只要 3 项的请求
      - 什么也没发生。筛选只改变你看到的内容；关掉它就又能看到完整正文
    answer: 2
    explain: 筛选作用在你已经拿到的响应上。不会发出任何请求，关掉筛选（或按 Esc）就能恢复完整正文。
  - question: 你想把所有订单的总价加成一个小计数字。用哪个？
    options:
      - "JSONPath `$.orders[*].total`"
      - "jq `[.orders[].total] | add`"
      - "XPath `//total`"
    answer: 1
    explain: JSONPath 和 XPath 只挑值；jq 还能做加总、计数、排序这类计算。
---

真实 API 的响应很大。300 张订单、每张 40 个字段，就是几千行 JSON。当你只想知道「哪些客户还在等？」，靠肉眼滚动和搜索既慢又容易看错。

**筛选**（正文工具栏里的漏斗图标）会在正文上方打开一行。选一种语言，写一个**表达式**，正文就只显示匹配的部分，旁边还会给出匹配数量。

```flow
完整响应 -[JSONPath：所有客户]-> 6 个名字
完整响应 -[JSONPath：金额超 100 的订单]-> 3 个名字
完整响应 -[jq：把总价加起来]-> 1 个数字
```

关掉筛选，或者在框里按 **Esc**，就又能看到完整正文。再次发送时表达式会保留，所以你可以一边工作一边盯着响应的同一部分。

## JSONPath：指向那些值

**JSONPath** 在 JSON 里走，就像在文件夹里走一条路径：

```anatomy
$ | 整个文档（根）
.orders | orders 这个键下的值
[*] | 列表里的每一项（[0] 是第一项）
[?@.total > 100] | 只留条件为真的项；@ 指被检查的那一项
.customer | 剩下每一项的那个键
```

JSONPath 把匹配结果以 JSON 列表显示，哪怕只有一个。

## jq：先指，再算

**jq** 是一门重塑 JSON 的小语言。你用管道 `|` 把步骤串起来，每一步都作用于上一步的输出：

- 所有客户：`.orders[].customer`
- 只要待处理的：`.orders[] | select(.status == "pending")`
- 一共几张订单？`.orders | length`
- 所有总价之和：`[.orders[].total] | add`

jq 把每个结果单独显示，和命令行的 `jq` 工具一样，所以加总就是一个数字。

> [!note] 可以这样想……
> 一张电子表格。JSONPath 是某一列上的筛选按钮：行都还在，你只是只看到自己想要的那些。jq 是公式单元格：它还能对找到的东西做加法、计数和重排。

## XML 和 HTML 用 XPath

对 XML 和 HTML 响应，筛选会提供 **XPath**，例如 `//item[price > 10]/name` 或 `count(//li)`。它作用在面板所显示的那部分正文上。纯文本响应三种语言都提供。

## 几点补充

- JSONPath 和 jq 作用在**整个**正文上，哪怕面板只显示了前 10 MB。
- 最多显示 10,000 条结果。表达式写错会以红色标出，并说明哪里不对。
- **复制正文** 复制的是筛选后显示的内容，把一小段清单贴进 bug 报告很方便。
- AI Agent 通过 Zorvik 发请求时也用同一套筛选，所以它们只读自己需要的那部分。

**什么时候用得上：** 一个接口返回几百条记录，你需要快速得到一个答案：哪些项失败了、缺了哪些 id、购物车里一共多少钱。把问题写成表达式，而不是靠滚动去找。
